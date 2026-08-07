"use client";

import { useRef } from "react";
import { gsap, useGSAP } from "@/lib/gsap";

export function StaggerList({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const count = containerRef.current?.children.length ?? 0;
      if (!containerRef.current || count === 0) return;
      // Cap the total spread so long lists (e.g. 200 transactions) still
      // finish settling in well under a second instead of stair-stepping in
      // one row every 45ms.
      const each = Math.min(0.045, 0.4 / count);
      gsap.from(containerRef.current.children, {
        opacity: 0,
        y: 12,
        stagger: each,
        duration: 0.4,
        ease: "power2.out",
      });
    },
    { scope: containerRef },
  );

  return (
    <div ref={containerRef} className={className}>
      {children}
    </div>
  );
}
