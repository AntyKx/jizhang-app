export default function VersionBadge() {
  const buildId = process.env.NEXT_PUBLIC_BUILD_ID;
  if (!buildId) return null;

  return (
    <div className="pointer-events-none fixed top-1 right-2 z-10 text-[9px] text-muted-foreground/40">
      v{buildId}
    </div>
  );
}
