"use client";

import { useState, useSyncExternalStore } from "react";
import { Capacitor } from "@capacitor/core";
import { Mic } from "lucide-react";
import { GestureHint, OneTimeHint } from "@/components/onboarding/gesture-hint";
import { track } from "@/lib/analytics/track";

const noopSubscribe = () => () => {};

// Before Android 1.7 the app's WebView never got a microphone (the manifest
// lacked MODIFY_AUDIO_SETTINGS), so anyone who tried voice there just saw it
// fail. Once, for app users who haven't had a recording go through yet, the
// tip points at the mic and says it works now. Web users never had the bug,
// so they never see it. Only builds with the 1.7 user-agent marker can
// actually record, so older installs aren't told something that isn't true
// for them yet.
function isFixedAndroidApp() {
  return (
    Capacitor.isNativePlatform() &&
    Capacitor.getPlatform() === "android" &&
    navigator.userAgent.includes("JizhangLiveCamera")
  );
}

const CARET = "right-[82px]";

export function VoiceFixedHint({ preview = false }: { preview?: boolean }) {
  const eligible = useSyncExternalStore(noopSubscribe, isFixedAndroidApp, () => false);
  const [previewClosed, setPreviewClosed] = useState(false);
  const content = (
    <>
      語音記帳修好了！
      <br />
      按麥克風說「午餐 150」試試看
    </>
  );

  // Admin preview: shown on any device and never remembered as dismissed,
  // so reloading brings it back.
  if (preview) {
    if (previewClosed) return null;
    return (
      <GestureHint
        icon={<Mic className="size-4" />}
        className="-mt-4"
        caretClassName={CARET}
        onDismiss={() => setPreviewClosed(true)}
      >
        {content}
      </GestureHint>
    );
  }
  if (!eligible) return null;

  return (
    <OneTimeHint
      id="voice-fixed-android"
      icon={<Mic className="size-4" />}
      className="-mt-4"
      caretClassName={CARET}
      onDismiss={() => track("voice_fixed_tip_dismissed")}
    >
      {content}
    </OneTimeHint>
  );
}
