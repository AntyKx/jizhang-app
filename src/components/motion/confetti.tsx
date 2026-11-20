"use client";

// One-shot confetti burst on a temporary full-screen canvas. No dependency;
// colors come from the active theme (--primary) plus a few fixed accents so
// it reads as a celebration in every palette. Skipped entirely under
// prefers-reduced-motion.

type Opts = {
  // "big" = goal reached (two side cannons + top shower);
  // "small" = a gentle pop from the middle (e.g. budget kept).
  size?: "big" | "small";
};

type Piece = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot: number;
  vr: number;
  w: number;
  h: number;
  color: string;
  shape: "rect" | "circle";
  tilt: number;
  vt: number;
};

function themeColors(): string[] {
  const probe = document.createElement("span");
  probe.style.display = "none";
  document.body.appendChild(probe);
  const read = (v: string) => {
    probe.style.color = v;
    return getComputedStyle(probe).color;
  };
  const primary = read("var(--primary)");
  const light = read("color-mix(in oklch, var(--primary) 50%, white)");
  probe.remove();
  return [primary, primary, light, "#f2c14e", "#ffffff", "#f59fb5", "#7cc4f0"];
}

export function fireConfetti({ size = "big" }: Opts = {}) {
  if (typeof window === "undefined") return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const W = window.innerWidth;
  const H = window.innerHeight;
  const canvas = document.createElement("canvas");
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  Object.assign(canvas.style, {
    position: "fixed",
    inset: "0",
    width: "100%",
    height: "100%",
    pointerEvents: "none",
    zIndex: "100",
  });
  document.body.appendChild(canvas);
  const ctx = canvas.getContext("2d")!;
  ctx.scale(dpr, dpr);

  const colors = themeColors();
  const pick = () => colors[Math.floor(Math.random() * colors.length)];
  const pieces: Piece[] = [];
  const make = (x: number, y: number, angle: number, speed: number): Piece => ({
    x,
    y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    rot: Math.random() * Math.PI * 2,
    vr: (Math.random() - 0.5) * 0.3,
    w: 6 + Math.random() * 5,
    h: 4 + Math.random() * 4,
    color: pick(),
    shape: Math.random() < 0.25 ? "circle" : "rect",
    tilt: Math.random() * Math.PI,
    vt: 0.1 + Math.random() * 0.15,
  });

  if (size === "big") {
    // Two cannons from the bottom corners, aimed up and inward.
    for (let i = 0; i < 70; i++) {
      const spread = (Math.random() - 0.5) * 0.6;
      const speed = 11 + Math.random() * 9;
      pieces.push(make(0, H * 0.85, -Math.PI / 3 + spread, speed));
      pieces.push(make(W, H * 0.85, (-2 * Math.PI) / 3 + spread, speed));
    }
    // A light shower from the top.
    for (let i = 0; i < 50; i++) {
      pieces.push(make(Math.random() * W, -20 - Math.random() * 120, Math.PI / 2, 1 + Math.random() * 2));
    }
  } else {
    for (let i = 0; i < 60; i++) {
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * 1.6;
      pieces.push(make(W / 2, H * 0.55, angle, 6 + Math.random() * 7));
    }
  }

  const start = performance.now();
  const DURATION = size === "big" ? 3200 : 2200;
  let raf = 0;

  const frame = (now: number) => {
    const t = now - start;
    ctx.clearRect(0, 0, W, H);
    const fade = t > DURATION - 600 ? Math.max(0, (DURATION - t) / 600) : 1;
    for (const p of pieces) {
      p.vx *= 0.985;
      p.vy = p.vy * 0.985 + 0.28;
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.vr;
      p.tilt += p.vt;
      ctx.save();
      ctx.globalAlpha = fade;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      // Squash on one axis over time = paper flipping in the air.
      const flip = Math.cos(p.tilt);
      if (p.shape === "circle") {
        ctx.beginPath();
        ctx.ellipse(0, 0, p.h / 1.4, (p.h / 1.4) * Math.abs(flip) + 0.5, 0, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillRect(-p.w / 2, (-p.h / 2) * flip, p.w, p.h * flip);
      }
      ctx.restore();
    }
    if (t < DURATION) raf = requestAnimationFrame(frame);
    else canvas.remove();
  };
  raf = requestAnimationFrame(frame);

  return () => {
    cancelAnimationFrame(raf);
    canvas.remove();
  };
}
