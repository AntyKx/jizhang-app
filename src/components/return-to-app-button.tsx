import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Shown on the Chrome-side sign-in hand-off pages (native-auth-callback,
// native-auth-return). Chrome refuses to open another app from a page that
// navigates on its own, without a user tap — a tap on this link always
// reaches the app via its bearledger:// deep link.
export function ReturnToAppButton({ href }: { href: string }) {
  return (
    <a href={href} className={cn(buttonVariants({ size: "lg" }), "mt-2 w-full max-w-xs")}>
      返回小熊記帳本
    </a>
  );
}
