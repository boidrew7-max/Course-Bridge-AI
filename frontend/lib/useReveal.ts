"use client";

import { useEffect } from "react";

/**
 * Reveals elements as they scroll into view, once each.
 * Watches three shapes:
 *   .cb-reveal        — fade + rise (element by element)
 *   .cb-reveal-scale  — fade + gentle scale
 *   [data-reveal-group] — container gets .cb-revealed; its children cascade
 *                         via the nth-child transition delays in globals.css.
 * Pass a rescanKey to re-run the scan when content appears later
 * (e.g. after a plan loads).
 */
export function useReveal(rescanKey?: unknown) {
  useEffect(() => {
    const nodes = Array.from(
      document.querySelectorAll<HTMLElement>(
        ".cb-reveal, .cb-reveal-scale, [data-reveal-group]"
      )
    ).filter((node) => !node.classList.contains("cb-revealed"));
    if (nodes.length === 0) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced || typeof IntersectionObserver === "undefined") {
      nodes.forEach((node) => node.classList.add("cb-revealed"));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add("cb-revealed");
          observer.unobserve(entry.target);
        }
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.05 }
    );

    nodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, [rescanKey]);
}
