// LINE-style theme decoration: each palette gets a motif (paw, leaf,
// bubble, flower, sparkle, star) drawn as SVG and turned into CSS image
// URLs — one for the home banner, one as a faint tiling page pattern.
// ThemePaletteApplier writes them to --theme-hero-deco / --theme-pattern
// on <html>; globals.css only uses them under html[data-palette].

type Motif = "paw" | "leaf" | "bubble" | "flower" | "sparkle" | "star";

const MOTIFS: Record<Motif, (c: string) => string> = {
  paw: (c) =>
    `<g fill="${c}"><ellipse cx="0" cy="3.5" rx="5.2" ry="4.2"/><circle cx="-6" cy="-3" r="2.2"/><circle cx="-2.2" cy="-6.6" r="2.2"/><circle cx="2.2" cy="-6.6" r="2.2"/><circle cx="6" cy="-3" r="2.2"/></g>`,
  leaf: (c) =>
    `<g><path d="M0 -9 C7 -6 7 5 0 9 C-7 5 -7 -6 0 -9Z" fill="${c}"/><path d="M0 -7 L0 8" stroke="white" stroke-opacity=".55" stroke-width="1.1"/></g>`,
  bubble: (c) => `<g><circle r="7" fill="none" stroke="${c}" stroke-width="1.8"/><circle cx="-2.4" cy="-2.6" r="1.6" fill="${c}"/></g>`,
  flower: (c) =>
    `<g fill="${c}">${[0, 72, 144, 216, 288].map((a) => `<ellipse cx="0" cy="-5" rx="3.6" ry="5.4" transform="rotate(${a})"/>`).join("")}<circle r="2.2" fill="white" fill-opacity=".8"/></g>`,
  sparkle: (c) => `<path d="M0 -9 Q1.2 -1.2 9 0 Q1.2 1.2 0 9 Q-1.2 1.2 -9 0 Q-1.2 -1.2 0 -9Z" fill="${c}"/>`,
  star: (c) => `<path d="M0 -8 Q1 -1 8 0 Q1 1 0 8 Q-1 1 -8 0 Q-1 -1 0 -8Z" fill="${c}"/>`,
};

type Decor = { motif: Motif; a: string; b: string; pattern: string; extra?: "wave" | "moon" };

const DECOR: Record<string, { light: Decor; dark: Decor }> = {
  default: {
    light: { motif: "paw", a: "#ffffff", b: "#E59A62", pattern: "#E7B48C" },
    dark: { motif: "paw", a: "#7a5a44", b: "#9c6a45", pattern: "#5a4536" },
  },
  matcha: {
    light: { motif: "leaf", a: "#ffffff", b: "#7FAE57", pattern: "#A9C98A" },
    dark: { motif: "leaf", a: "#5f7d48", b: "#7FAE57", pattern: "#3c4d33" },
  },
  ocean: {
    light: { motif: "bubble", a: "#ffffff", b: "#5BA7DD", pattern: "#9CC8E8", extra: "wave" },
    dark: { motif: "bubble", a: "#5f86b0", b: "#5BA7DD", pattern: "#33465e", extra: "wave" },
  },
  sakura: {
    light: { motif: "flower", a: "#ffffff", b: "#EC93B0", pattern: "#F2B6C9" },
    dark: { motif: "flower", a: "#a5687d", b: "#EC93B0", pattern: "#553845" },
  },
  lavender: {
    light: { motif: "sparkle", a: "#ffffff", b: "#A58BE3", pattern: "#C5B3EC" },
    dark: { motif: "sparkle", a: "#8a76c4", b: "#A58BE3", pattern: "#433a63" },
  },
  night: {
    light: { motif: "star", a: "#FFE7A3", b: "#ffffff", pattern: "#3A4680", extra: "moon" },
    dark: { motif: "star", a: "#FFE7A3", b: "#ffffff", pattern: "#3A4680", extra: "moon" },
  },
};

const place = (m: Motif, c: string, x: number, y: number, s: number, r: number, o: number) =>
  `<g transform="translate(${x} ${y}) rotate(${r}) scale(${s})" opacity="${o}">${MOTIFS[m](c)}</g>`;

const toUrl = (svg: string) => `url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}")`;

// Banner art, anchored top-right (344 × 210); the bear sits on the right
// so motifs cluster around and above it.
const SPOTS: [number, number, number, number, number, "a" | "b"][] = [
  [300, 26, 1.3, -10, 0.9, "a"], [250, 64, 0.8, 18, 0.7, "b"], [326, 102, 0.9, 30, 0.8, "a"],
  [196, 22, 0.6, -25, 0.6, "b"], [150, 52, 0.5, 10, 0.55, "a"], [20, 150, 0.7, -20, 0.5, "b"],
  [120, 168, 0.55, 15, 0.45, "a"], [228, 140, 0.6, -5, 0.5, "b"], [92, 20, 0.45, 40, 0.5, "a"],
];

export function heroDecoUrl(key: string, dark: boolean): string | null {
  const d = DECOR[key]?.[dark ? "dark" : "light"];
  if (!d) return null;
  const opacityScale = dark && key !== "night" ? 0.7 : 1;
  let s = SPOTS.map(([x, y, sc, r, o, c]) => place(d.motif, c === "a" ? d.a : d.b, x, y, sc * 1.5, r, Math.min(1, o + 0.15) * opacityScale)).join("");
  if (d.extra === "moon") {
    s =
      `<circle cx="300" cy="34" r="22" fill="#FFE7A3"/><circle cx="290" cy="27" r="20" fill="#2D3A78"/>` +
      Array.from({ length: 22 }, (_, i) => `<circle cx="${(i * 73) % 340}" cy="${(i * 41) % 190}" r="${i % 3 === 0 ? 1.4 : 0.9}" fill="#fff" opacity="${0.4 + (i % 4) * 0.15}"/>`).join("") +
      SPOTS.slice(1).map(([x, y, sc, r, o, c]) => place(d.motif, c === "a" ? d.a : d.b, x, y, sc * 1.2, r, o)).join("");
  }
  if (d.extra === "wave") {
    const w = dark ? 0.12 : 0.35;
    s +=
      `<path d="M0 176 C40 160 80 192 120 176 C160 160 200 192 240 176 C280 160 320 192 344 178 L344 210 L0 210Z" fill="#ffffff" opacity="${w}"/>` +
      `<path d="M0 190 C50 176 90 204 140 190 C190 176 230 204 280 190 C310 182 330 192 344 188 L344 210 L0 210Z" fill="#ffffff" opacity="${w + 0.1}"/>`;
  }
  return toUrl(`<svg xmlns="http://www.w3.org/2000/svg" width="344" height="210" viewBox="0 0 344 210">${s}</svg>`);
}

export function patternUrl(key: string, dark: boolean): string | null {
  const d = DECOR[key]?.[dark ? "dark" : "light"];
  if (!d) return null;
  const o = key === "night" ? 0.5 : dark ? 0.35 : 0.28;
  return toUrl(
    `<svg xmlns="http://www.w3.org/2000/svg" width="72" height="72" viewBox="0 0 72 72">${place(d.motif, d.pattern, 18, 18, 0.7, -15, o)}${place(d.motif, d.pattern, 54, 54, 0.55, 20, o)}</svg>`,
  );
}
