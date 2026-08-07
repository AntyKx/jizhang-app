"use client";

import { useRef } from "react";
import { gsap, useGSAP } from "@/lib/gsap";

export function Reveal({ children, className }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (!ref.current) return;
      gsap.from(ref.current, { opacity: 0, y: 8, duration: 0.3, ease: "power2.out" });
    },
    { scope: ref },
  );

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
