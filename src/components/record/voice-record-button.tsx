"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Loader2, Mic, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { track } from "@/lib/analytics/track";

// Dispatched by the first-record prompt's 「用說的試試」 chip; only the home
// page's mic (listenForVoiceTry) responds. Dispatched synchronously from the
// chip's click, so it still counts as a user gesture for the mic prompt.
export const VOICE_TRY_EVENT = "jizhang:voice-try";

type RecordState = "idle" | "recording" | "processing";

// Ordered by preference — Chrome/Android support the first, Safari/iOS only
// ever supports the mp4/aac ones, so this list is what actually makes voice
// input work cross-platform rather than just on desktop Chrome.
const MIME_CANDIDATES = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/aac"];

// RMS (0–1) below this counts as silence. Starting guess, not tuned against
// real mics/environments yet — device gain varies a lot, so this is one of
// the first things to adjust after testing on an actual phone.
const SILENCE_THRESHOLD = 0.02;
// How long silence has to persist (after speech was already detected)
// before auto-stopping — long enough not to cut off a mid-sentence pause,
// short enough to feel instant once the user is actually done talking.
const SILENCE_DURATION_MS = 1500;
// Safety cap so a noisy environment that never reads as "silent" can't
// record forever.
const MAX_RECORDING_MS = 30000;
// How often MediaRecorder hands us a chunk — also the granularity at which
// trailing silence can be trimmed off before sending audio for transcription.
const CHUNK_MS = 250;
// Extra chunks kept past the detected start of silence, so trimming can't
// clip the tail end of the user's actual last word.
const TRIM_BUFFER_CHUNKS = 2;
// Extra chunks kept before the detected start of speech, for the same
// reason (don't clip the onset of the first word).
const LEADING_BUFFER_CHUNKS = 1;
// Below this many chunks (~750ms), there's not enough real audio for
// Whisper to work with and it's prone to hallucinating content outright —
// bail out client-side instead of sending it.
const MIN_CHUNKS_TO_SEND = 3;

// One-time, per-device notice before the very first recording that the
// audio goes to a third-party AI service (matches the privacy policy).
const VOICE_NOTICE_KEY = "jizhang:voice-ai-notice-seen";

function hasSeenVoiceNotice() {
  try {
    return window.localStorage.getItem(VOICE_NOTICE_KEY) === "1";
  } catch {
    return false;
  }
}

function pickSupportedMimeType(): string | undefined {
  if (typeof MediaRecorder === "undefined") return undefined;
  return MIME_CANDIDATES.find((type) => MediaRecorder.isTypeSupported(type));
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      resolve(result.slice(result.indexOf(",") + 1));
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

// Tap once to record, speak, and it stops itself once it hears you go quiet
// — same idea as the native keyboard's dictation mic, no second tap needed
// for the normal case. The button stays tappable as a manual override
// (stop early, or force-stop if the auto-detect gets it wrong).
export function VoiceRecordButton({
  onTranscribed,
  listenForVoiceTry = false,
  className,
}: {
  onTranscribed: (text: string) => void;
  listenForVoiceTry?: boolean;
  className?: string;
}) {
  const [state, setState] = useState<RecordState>("idle");
  const [noticeOpen, setNoticeOpen] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const mimeTypeRef = useRef<string | undefined>(undefined);
  // Index into chunksRef marking where the trailing silence that triggered
  // auto-stop began — set by watchForSilence, consumed here to cut that
  // silence out of what actually gets sent to the transcription API.
  // Whisper is well known to hallucinate extra phrases out of silent/near-
  // silent audio, and every auto-stopped recording otherwise ends with
  // exactly the ~1.5s of silence that triggered the stop.
  const silenceStartIndexRef = useRef<number | null>(null);
  // Index into chunksRef marking where speech was first detected — trims
  // the reaction-time gap between tapping the button and actually talking,
  // same rationale as the trailing trim above.
  const speechStartIndexRef = useRef<number | null>(null);

  async function handleRecordingDone() {
    setState("processing");
    try {
      const start =
        speechStartIndexRef.current !== null
          ? Math.max(0, speechStartIndexRef.current - LEADING_BUFFER_CHUNKS)
          : 0;
      const end =
        silenceStartIndexRef.current !== null
          ? silenceStartIndexRef.current + TRIM_BUFFER_CHUNKS
          : chunksRef.current.length;
      const trimmed = chunksRef.current.slice(start, end);
      const chunks = trimmed.length >= MIN_CHUNKS_TO_SEND ? trimmed : chunksRef.current;

      if (chunks.length < MIN_CHUNKS_TO_SEND) {
        track("voice_too_short");
        toast.error("錄音太短，再說一次看看");
        return;
      }

      const blob = new Blob(chunks, { type: mimeTypeRef.current });
      const audioBase64 = await blobToBase64(blob);
      const res = await fetch("/api/voice-transcribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ audioBase64 }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? "語音辨識失敗");
      }
      const { text } = (await res.json()) as { text: string };
      onTranscribed(text);
    } catch (err) {
      track("voice_failed");
      toast.error(err instanceof Error ? err.message : "語音辨識失敗");
    } finally {
      setState("idle");
    }
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop();
  }

  // Watches mic volume via an AnalyserNode and calls stopRecording() once it
  // detects speech followed by a sustained quiet stretch. Self-terminates
  // (via the mediaRecorder.state check) whenever recording stops for any
  // reason — silence, the safety cap, or the user manually tapping stop —
  // so there's only ever one exit path to keep in sync.
  function watchForSilence(stream: MediaStream) {
    const AudioContextCtor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextCtor) return; // no auto-stop on browsers without it — manual tap still works

    const audioContext = new AudioContextCtor();
    let closed = false;
    const closeAudioContext = () => {
      if (closed) return;
      closed = true;
      void audioContext.close().catch(() => {});
    };
    void audioContext.resume().catch(() => {});

    const source = audioContext.createMediaStreamSource(stream);
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 2048;
    source.connect(analyser);
    const data = new Uint8Array(analyser.fftSize);

    const startedAt = Date.now();
    let hasSpoken = false;
    let silenceStartedAt: number | null = null;

    function tick() {
      if (mediaRecorderRef.current?.state !== "recording") {
        closeAudioContext();
        return;
      }

      analyser.getByteTimeDomainData(data);
      let sumSquares = 0;
      for (let i = 0; i < data.length; i++) {
        const normalized = (data[i] - 128) / 128;
        sumSquares += normalized * normalized;
      }
      const rms = Math.sqrt(sumSquares / data.length);

      const now = Date.now();
      if (rms > SILENCE_THRESHOLD) {
        if (!hasSpoken) speechStartIndexRef.current = chunksRef.current.length;
        hasSpoken = true;
        silenceStartedAt = null;
        silenceStartIndexRef.current = null;
      } else if (hasSpoken) {
        if (silenceStartedAt === null) {
          silenceStartedAt = now;
          silenceStartIndexRef.current = chunksRef.current.length;
        } else if (now - silenceStartedAt > SILENCE_DURATION_MS) {
          closeAudioContext();
          stopRecording();
          return;
        }
      }

      if (now - startedAt > MAX_RECORDING_MS) {
        closeAudioContext();
        stopRecording();
        return;
      }

      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  async function startRecording() {
    if (typeof MediaRecorder === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      track("voice_unsupported");
      toast.error("這個瀏覽器不支援錄音");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = pickSupportedMimeType();
      mimeTypeRef.current = mimeType;
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      chunksRef.current = [];
      silenceStartIndexRef.current = null;
      speechStartIndexRef.current = null;
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        void handleRecordingDone();
      };
      recorder.start(CHUNK_MS);
      mediaRecorderRef.current = recorder;
      setState("recording");
      watchForSilence(stream);
    } catch {
      track("voice_permission_denied");
      toast.error("無法取得麥克風權限");
    }
  }

  function handleMicClick() {
    if (state === "recording") return stopRecording();
    if (state !== "idle") return;
    track("voice_tap");
    if (!hasSeenVoiceNotice()) {
      track("voice_notice_shown");
      return setNoticeOpen(true);
    }
    void startRecording();
  }

  const micClickRef = useRef(handleMicClick);
  useEffect(() => {
    micClickRef.current = handleMicClick;
  });
  useEffect(() => {
    if (!listenForVoiceTry) return;
    const onTry = () => micClickRef.current();
    window.addEventListener(VOICE_TRY_EVENT, onTry);
    return () => window.removeEventListener(VOICE_TRY_EVENT, onTry);
  }, [listenForVoiceTry]);

  function acceptNotice() {
    try {
      window.localStorage.setItem(VOICE_NOTICE_KEY, "1");
    } catch {
      // Storage blocked — the notice just shows again next time.
    }
    setNoticeOpen(false);
    track("voice_notice_accepted");
    // Still inside the tap's user gesture, so the mic permission prompt
    // is allowed to appear.
    void startRecording();
  }

  return (
    <>
      <Dialog open={noticeOpen} onOpenChange={setNoticeOpen}>
        <DialogContent>
          <DialogTitle>語音記帳</DialogTitle>
          <DialogDescription>
            錄音會傳給 AI 服務轉成文字並解析，辨識完不會保存原始錄音。
          </DialogDescription>
          <DialogFooter>
            <Button onClick={acceptNotice}>知道了，開始錄音</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <button
        type="button"
        onClick={handleMicClick}
        disabled={state === "processing"}
        aria-label={state === "recording" ? "停止錄音" : "語音記帳"}
        className={cn(
          "flex size-8 shrink-0 items-center justify-center rounded-full transition-colors",
          state === "recording"
            ? "bg-destructive text-white animate-pulse"
            : "bg-primary/10 text-primary hover:bg-primary/20 active:bg-primary/25",
          className,
        )}
      >
        {state === "processing" ? (
          <Loader2 className="size-4 animate-spin" />
        ) : state === "recording" ? (
          <Square className="size-3 fill-current" />
        ) : (
          <Mic className="size-4" strokeWidth={2} />
        )}
      </button>
    </>
  );
}
