// Themed bear mascots as plain SVG strings (no JSX), so the same art can be
// rendered by <ThemedBear> in the app and by offline mock scripts. The face
// traces public/icons/bear-mark-v2.png (778×632, scaled ÷4); each theme adds
// its own accessory on top.

export type BearVariant = "default" | "matcha" | "ocean" | "sakura" | "lavender" | "night";

const FUR = "#D9B784";
const EAR = "#B98A5C";
const INK = "#4A2E22";
const MUZZLE = "#F5DEBB";

function face({ blush = "#F2AE86", sleepy = false }: { blush?: string; sleepy?: boolean } = {}) {
  const eyes = sleepy
    ? `<path d="M53 90 Q62 98 71 90" fill="none" stroke="${INK}" stroke-width="4" stroke-linecap="round"/>
       <path d="M123 90 Q132 98 141 90" fill="none" stroke="${INK}" stroke-width="4" stroke-linecap="round"/>`
    : `<circle cx="62" cy="89" r="10.5" fill="${INK}"/><circle cx="65" cy="85.5" r="2.8" fill="#fff"/>
       <circle cx="132" cy="89" r="10.5" fill="${INK}"/><circle cx="135" cy="85.5" r="2.8" fill="#fff"/>`;
  return `
  <circle cx="34" cy="31" r="33" fill="${FUR}"/><circle cx="160" cy="31" r="33" fill="${FUR}"/>
  <circle cx="38" cy="36" r="18" fill="${EAR}"/><circle cx="156" cy="36" r="18" fill="${EAR}"/>
  <path d="M97 22 C150 22 184 50 184 96 C184 140 146 158 97 158 C48 158 10 140 10 96 C10 50 44 22 97 22Z" fill="${FUR}"/>
  ${eyes}
  <ellipse cx="44" cy="109" rx="13" ry="9" fill="${blush}" opacity=".8"/>
  <ellipse cx="150" cy="109" rx="13" ry="9" fill="${blush}" opacity=".8"/>
  <ellipse cx="97" cy="114" rx="34" ry="24" fill="${MUZZLE}"/>
  <path d="M86 102 Q97 98 108 102 Q108 110 97 114 Q86 110 86 102Z" fill="${INK}"/>
  <path d="M97 113 L97 118 M97 118 Q92 123 86 120 M97 118 Q102 123 108 120" fill="none" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>`;
}

const sakuraFlower = (x: number, y: number, s: number, r: number) =>
  `<g transform="translate(${x} ${y}) rotate(${r}) scale(${s})">${[0, 72, 144, 216, 288]
    .map((a) => `<path d="M0 0 C-7 -6 -6 -15 -2 -17 L0 -14 L2 -17 C6 -15 7 -6 0 0Z" fill="#F7B6C8" transform="rotate(${a})"/>`)
    .join("")}<circle r="3.2" fill="#E0628A"/></g>`;

const sparkle = (x: number, y: number, s: number, c: string) =>
  `<path transform="translate(${x} ${y}) scale(${s})" d="M0 -9 Q1.2 -1.2 9 0 Q1.2 1.2 0 9 Q-1.2 1.2 -9 0 Q-1.2 -1.2 0 -9Z" fill="${c}"/>`;

const ACCESSORIES: Record<BearVariant, { under?: string; over: string; face?: Parameters<typeof face>[0] }> = {
  default: { over: "" },
  // Matcha beret with a tea leaf.
  matcha: {
    over: `
    <path d="M44 34 C46 6 148 6 150 34 C130 26 64 26 44 34Z" fill="#7BA552"/>
    <path d="M50 32 C70 25 124 25 144 32" fill="none" stroke="#5B8A3C" stroke-width="4" stroke-linecap="round"/>
    <path d="M97 8 L97 -2" stroke="#5B8A3C" stroke-width="4" stroke-linecap="round"/>
    <path d="M97 -2 C108 -14 126 -10 128 -4 C118 4 104 4 97 -2Z" fill="#A3C77A"/>
    <path d="M100 -3 L122 -6" stroke="#5B8A3C" stroke-width="1.6" stroke-linecap="round"/>`,
  },
  // Sailor cap, tilted.
  ocean: {
    over: `
    <g transform="rotate(-8 97 26)">
      <path d="M62 30 C62 6 132 6 132 30Z" fill="#FFFFFF" stroke="#CFE3F3" stroke-width="2"/>
      <rect x="60" y="24" width="74" height="9" rx="3" fill="#2B73B5"/>
      <ellipse cx="97" cy="34" rx="48" ry="8" fill="#FFFFFF" stroke="#CFE3F3" stroke-width="2"/>
      <circle cx="97" cy="12" r="4" fill="#E2574C"/>
    </g>
    <g fill="none" stroke="#7FBCE6" stroke-width="2.4"><circle cx="190" cy="70" r="6"/><circle cx="198" cy="50" r="3.5"/></g>`,
  },
  // Sakura blossoms on the left ear, rosier cheeks.
  sakura: {
    face: { blush: "#F49AB4" },
    over: `${sakuraFlower(26, 18, 1.15, 10)}${sakuraFlower(54, 4, 0.75, -20)}${sakuraFlower(12, 44, 0.55, 30)}
    <path d="M176 64 C182 58 190 60 190 66 C186 70 180 70 176 64Z" fill="#F7B6C8"/>`,
  },
  // Lavender sprigs behind the right ear, plus sparkles.
  lavender: {
    // Sprigs tucked in front of the right ear, fanning up and out so the
    // buds sit clear of the ear instead of hiding behind it.
    over: `
    <g stroke="#6E8F55" stroke-width="3" stroke-linecap="round" fill="none"><path d="M150 46 Q160 18 170 -14"/><path d="M154 48 Q176 24 198 4"/></g>
    ${[0, 1, 2, 3, 4]
      .map((i) => {
        const x = 170 - i * 2.6;
        const y = -14 + i * 8.5;
        return `<ellipse cx="${x - 4}" cy="${y}" rx="4" ry="6" fill="#9C7FE0" transform="rotate(-30 ${x - 4} ${y})"/><ellipse cx="${x + 4}" cy="${y + 2}" rx="4" ry="6" fill="#8466D6" transform="rotate(30 ${x + 4} ${y + 2})"/>`;
      })
      .join("")}
    ${[0, 1, 2, 3]
      .map((i) => {
        const x = 198 - i * 6.5;
        const y = 4 + i * 5.6;
        return `<ellipse cx="${x}" cy="${y - 4}" rx="4" ry="5.6" fill="#B79CF0" transform="rotate(40 ${x} ${y - 4})"/><ellipse cx="${x + 3}" cy="${y + 4}" rx="4" ry="5.6" fill="#A58BE3" transform="rotate(80 ${x + 3} ${y + 4})"/>`;
      })
      .join("")}
    ${sparkle(14, 4, 1, "#C9B2F5")}${sparkle(196, 96, 0.7, "#E6C66A")}`,
  },
  // Sleepy bear in a nightcap with a star.
  night: {
    face: { sleepy: true, blush: "#F2A08A" },
    over: `
    <path d="M46 36 C52 -4 104 -14 150 2 C170 8 186 22 192 40 C176 26 158 22 146 28 C120 20 72 22 46 36Z" fill="#3D4C9E"/>
    <path d="M42 36 C70 22 124 22 152 34 L150 42 C122 31 72 31 44 44Z" fill="#E9ECFA"/>
    <circle cx="192" cy="42" r="9" fill="#E9ECFA"/>
    ${sparkle(96, 10, 0.9, "#F2C14E")}${sparkle(130, 8, 0.55, "#F2C14E")}
    <text x="182" y="88" font-family="system-ui,sans-serif" font-weight="700" font-size="16" fill="#97A0C6">z</text>
    <text x="194" y="72" font-family="system-ui,sans-serif" font-weight="700" font-size="11" fill="#97A0C6">z</text>`,
  },
};

export function themedBearSvg(variant: BearVariant): string {
  const a = ACCESSORIES[variant];
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-6 -22 214 186" width="100%" height="100%">${a.under ?? ""}${face(a.face)}${a.over}</svg>`;
}
