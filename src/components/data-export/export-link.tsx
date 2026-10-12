"use client";

import { Capacitor } from "@capacitor/core";
import { toast } from "sonner";
import { getExportLink } from "@/app/(app)/data-export/actions";
import type { ExportKind } from "@/lib/export-link";

// A plain download link on the web. In the Android app the WebView can't
// download anything (tapping a plain link silently did nothing), so there it
// fetches a short-lived signed link and navigates to it — Capacitor sends
// that off-host URL to the phone's browser, which downloads the file.
export function ExportLink({
  kind,
  className,
  children,
}: {
  kind: ExportKind;
  className?: string;
  children: React.ReactNode;
}) {
  async function handleClick(e: React.MouseEvent<HTMLAnchorElement>) {
    if (!Capacitor.isNativePlatform()) return;
    e.preventDefault();
    try {
      window.location.href = await getExportLink(kind);
      toast.success("已在瀏覽器開始下載");
    } catch {
      toast.error("下載失敗，請稍後再試");
    }
  }

  return (
    <a href={`/api/export/${kind}`} onClick={handleClick} className={className}>
      {children}
    </a>
  );
}
