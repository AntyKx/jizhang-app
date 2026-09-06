import { cn } from "@/lib/utils";
import { categoryIconRegistry } from "@/lib/category-icons";
import { categoryTint } from "@/lib/category-tint";

export function isImageIcon(icon: string | null): boolean {
  if (!icon) return false;
  return icon.startsWith("data:") || icon.startsWith("http") || icon.startsWith("/");
}

export function CategoryIcon({
  icon,
  className,
  color,
}: {
  icon: string | null;
  className?: string;
  // Optional tint (a category's own `color`) — omitted call sites just get
  // the brand accent color instead.
  color?: string | null;
}) {
  if (!icon) return null;

  if (isImageIcon(icon)) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- legacy AI-generated data-URI icons from before the Lucide icon set
      <img src={icon} alt="" className={cn("inline-block rounded-md object-contain", className)} />
    );
  }

  const Icon = categoryIconRegistry[icon] ?? categoryIconRegistry.tag;
  return (
    <Icon
      aria-hidden
      className={cn("inline-block", !color && "text-primary", className)}
      style={color ? { color } : undefined}
      strokeWidth={1.75}
    />
  );
}

// Soft-tint rounded-square "chip" — a light wash of the category's own
// color behind an icon in that same color (same color-mix formula
// CategoryPill already uses for its tag background, just applied to an
// icon instead of text). `className` sizes the chip itself (width/height +
// rounding); `iconClassName` sizes the glyph inside.
//
// This project's --radius base is 1rem (not Tailwind's default), so
// rounded-xl resolves to 22.4px — on a 36px badge that's past half the box
// size, which CSS clamps to a full circle no matter what the class says.
// rounded-md (0.8 * 1rem ≈ 12.8px) is the one that actually reads as a
// rounded square at these sizes.
export function CategoryIconBadge({
  icon,
  color,
  className,
  iconClassName,
}: {
  icon: string | null;
  color?: string | null;
  className?: string;
  iconClassName?: string;
}) {
  const c = color ?? "var(--primary)";
  return (
    <span
      className={cn("flex shrink-0 items-center justify-center rounded-md", className)}
      style={{ backgroundColor: categoryTint(c) }}
    >
      <CategoryIcon icon={icon} color={c} className={cn("shrink-0", iconClassName)} />
    </span>
  );
}
