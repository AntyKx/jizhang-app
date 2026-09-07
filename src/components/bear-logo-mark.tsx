// Small flat bear-face mark for chrome-y spots (home banner, etc.) where the
// full photographic BearIllustration set is too heavy — a simple logo, not
// a scene. Colors are fixed (not theme-derived) since this is meant to read
// as the app's mascot mark regardless of what it's placed on.
export function BearLogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden="true">
      <circle cx="9" cy="10" r="6.2" fill="#caa06a" />
      <circle cx="31" cy="10" r="6.2" fill="#caa06a" />
      <circle cx="20" cy="23" r="14.5" fill="#d9b184" />
      <circle cx="14" cy="21" r="2.5" fill="#3b2a1c" />
      <circle cx="26" cy="21" r="2.5" fill="#3b2a1c" />
      <ellipse cx="20" cy="27.5" rx="3.2" ry="2.4" fill="#3b2a1c" />
      <path d="M20 28c-1.3 1.5-3.1 1.8-4.2 1" stroke="#3b2a1c" strokeWidth="1.3" fill="none" strokeLinecap="round" />
      <path d="M20 28c1.3 1.5 3.1 1.8 4.2 1" stroke="#3b2a1c" strokeWidth="1.3" fill="none" strokeLinecap="round" />
    </svg>
  );
}
