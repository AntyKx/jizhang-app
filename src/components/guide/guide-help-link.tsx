import Link from "next/link";
import { CircleHelp } from "lucide-react";

// Small "?" next to a page title that opens that feature's section of the
// usage guide (GuideSection auto-opens on a matching #hash).
export function GuideHelpLink({ section, label }: { section: string; label: string }) {
  return (
    <Link
      href={`/guide#${section}`}
      aria-label={`${label}使用說明`}
      className="flex size-8 items-center justify-center rounded-full text-muted-foreground transition-colors active:bg-muted"
    >
      <CircleHelp className="size-5" strokeWidth={1.75} />
    </Link>
  );
}
