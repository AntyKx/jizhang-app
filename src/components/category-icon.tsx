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

// Soft-tint circular "chip" — a light wash of the category's own color
// behind an icon in that same color (same color-mix formula CategoryPill
// already uses for its tag background, just applied to an icon instead of
// text). `className` sizes the chip itself (width/height); `iconClassName`
// sizes the glyph inside. Circular rather than a rounded square — reads
// less like a dashboard icon grid and more like a warm lifestyle app.
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
      className={cn("flex shrink-0 items-center justify-center rounded-full", className)}
      style={{ backgroundColor: categoryTint(c) }}
    >
      <CategoryIcon icon={icon} color={c} className={cn("shrink-0", iconClassName)} />
    </span>
  );
}
