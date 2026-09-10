"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Counts an integer up from 0 the first time the element scrolls into view.
 * Server render, no-JS, reduced motion and old browsers all simply show the
 * final value — the animation is purely an enhancement.
 *
 *   const { ref, value } = useCountUp(116);
 *   <span ref={ref}>{value}</span>
 */
export function useCountUp(target: number, durationMs = 900) {
  const ref = useRef<HTMLSpanElement | null>(null);
  const [value, setValue] = useState(target);
  const started = useRef(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting) || started.current) return;
        started.current = true;
        observer.disconnect();

        const start = performance.now();
        const tick = (now: number) => {
          const p = Math.min(1, (now - start) / durationMs);
          const eased = 1 - Math.pow(1 - p, 3);
          setValue(Math.round(target * eased));
          if (p < 1) requestAnimationFrame(tick);
        };
        setValue(0);
        requestAnimationFrame(tick);
      },
      { threshold: 0.4 }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [target, durationMs]);

  return { ref, value };
}
