"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";

// The corner dissolves into the same square cells as the hero field: dense at the corner, scattering inward.
const corner = ["......#", "....#.#", "...#.##", ".#.####", "#.#.###"];

// Eased stops: a straight fade to transparent shows a visible edge, which reads as a disc.
const light = (x: string, y: string, a: number) =>
  `radial-gradient(30rem circle at calc(var(${x}) * 1px) calc(var(${y}) * 1px), rgb(255 91 31 / ${a}), rgb(255 91 31 / ${a * 0.55}) 30%, rgb(255 91 31 / ${a * 0.18}) 60%, transparent 100%)`;

// Drop inside a `relative overflow-hidden group/card` panel: adds the pixel corner and a soft orange
// glow that follows the cursor. Hover only, so touch screens get just the corner. `flip` mirrors the
// corner to the bottom-left, for full-screen panels where ToTop covers the bottom-right.
export function PanelFx({ flip = false }: { flip?: boolean }) {
  const glow = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = glow.current!;
    const panel = el.parentElement!;
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    gsap.set(el, { "--x": 0, "--y": 0, "--tx": 0, "--ty": 0 });
    // The head chases the cursor and the tail chases slower, so the light stretches behind a moving
    // cursor and settles back into one soft pool when it stops.
    const follow = (prop: string, duration: number) =>
      gsap.quickTo(el, prop, { duration: calm ? 0 : duration, ease: "power3" });
    const x = follow("--x", 0.6), y = follow("--y", 0.6), tx = follow("--tx", 1.5), ty = follow("--ty", 1.5);

    const at = (e: PointerEvent) => {
      const r = panel.getBoundingClientRect();
      return [e.clientX - r.left, e.clientY - r.top];
    };
    const enter = (e: PointerEvent) => {
      const [px, py] = at(e); // start under the cursor, not swept in from the last exit
      x(px, px); y(py, py); tx(px, px); ty(py, py);
    };
    const move = (e: PointerEvent) => {
      const [px, py] = at(e);
      x(px); y(py); tx(px); ty(py);
    };
    panel.addEventListener("pointerenter", enter);
    panel.addEventListener("pointermove", move);
    return () => {
      panel.removeEventListener("pointerenter", enter);
      panel.removeEventListener("pointermove", move);
      gsap.killTweensOf(el);
    };
  }, []);

  return (
    <>
      <span
        ref={glow}
        aria-hidden
        style={{ background: `${light("--x", "--y", 0.05)}, ${light("--tx", "--ty", 0.035)}` }}
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-700 group-hover/card:opacity-100"
      />
      <div aria-hidden className={`pointer-events-none absolute bottom-0 grid grid-cols-7 opacity-50 transition-opacity duration-500 group-hover/card:opacity-100 ${flip ? "left-0 -scale-x-100" : "right-0"}`}>
        {corner.flatMap((row, y) =>
          [...row].map((cell, x) => (
            <span key={`${x}${y}`} className={`size-3 ${cell === "#" ? "bg-signal" : ""}`} />
          )),
        )}
      </div>
    </>
  );
}
