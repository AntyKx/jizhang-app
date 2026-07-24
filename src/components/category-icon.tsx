import { cn } from "@/lib/utils";

export function isImageIcon(icon: string | null): boolean {
  if (!icon) return false;
  return icon.startsWith("data:") || icon.startsWith("http") || icon.startsWith("/");
}

export function CategoryIcon({
  icon,
  className,
}: {
  icon: string | null;
  className?: string;
}) {
  if (!icon) return null;

  if (isImageIcon(icon)) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- dynamic user/AI-generated data URIs and bundled bear icons
      <img src={icon} alt="" className={cn("inline-block rounded-md object-contain", className)} />
    );
  }

  return <span className={cn("inline-flex items-center justify-center leading-none", className)}>{icon}</span>;
}
