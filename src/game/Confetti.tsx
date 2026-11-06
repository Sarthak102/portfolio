"use client";

import { useEffect, useRef } from "react";

// Pixel confetti over the "Cleared" screen. `big` (all five levels done) fires cannons from both
// bottom corners and keeps it raining for a while; otherwise one small pop from the top centre.

const COLORS = ["#FF5B1F", "#EDEBE6", "#FF5B1F", "#8E8B85", "#FFB08A"];
const G = 900;

type Bit = { x: number; y: number; vx: number; vy: number; s: number; c: string; spin: number; phase: number };

export function Confetti({ big = false }: { big?: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const cv = ref.current!, ctx = cv.getContext("2d");
    if (!ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const W = window.innerWidth, H = window.innerHeight;
    cv.width = W * dpr;
    cv.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const bits: Bit[] = [];
    const add = (x: number, y: number, angle: number, spread: number, speed: number) => {
      const a = angle + (Math.random() - 0.5) * spread, v = speed * (0.5 + Math.random() * 0.6);
      bits.push({
        x,
        y,
        vx: Math.cos(a) * v,
        vy: Math.sin(a) * v,
        s: Math.random() < 0.5 ? 6 : 8,
        c: COLORS[Math.floor(Math.random() * COLORS.length)],
        spin: 6 + Math.random() * 10,
        phase: Math.random() * 6,
      });
    };
    const up = -Math.PI / 2;
    if (big) {
      for (let i = 0; i < 160; i++) add(0, H, up + 0.55, 0.6, 1300);
      for (let i = 0; i < 160; i++) add(W, H, up - 0.55, 0.6, 1300);
    } else {
      for (let i = 0; i < 90; i++) add(W / 2, H * 0.35, up, 2.2, 650);
    }

    let raf = 0, last = performance.now(), t = 0;
    const frame = (now: number) => {
      const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
      last = now;
      t += dt;
      // The big one keeps raining from the top for a few seconds, with a second cannon volley.
      if (big && t < 3) for (let i = 0; i < 4; i++) add(Math.random() * W, -10, Math.PI / 2, 0.4, 120);
      if (big && t - dt < 0.9 && t >= 0.9) {
        for (let i = 0; i < 100; i++) add(0, H, up + 0.45, 0.5, 1250);
        for (let i = 0; i < 100; i++) add(W, H, up - 0.45, 0.5, 1250);
      }
      ctx.clearRect(0, 0, W, H);
      for (const b of bits) {
        b.vy += G * dt;
        b.vx *= 1 - 1.2 * dt; // air drag, so they flutter down instead of flying off
        b.vy = Math.min(b.vy, 260 + b.s * 10);
        b.x += (b.vx + Math.sin(t * 3 + b.phase) * 30) * dt;
        b.y += b.vy * dt;
        // Tumbling: the pixel squashes flat and back, in whole-pixel steps.
        const h = Math.max(2, Math.round((b.s * Math.abs(Math.cos(t * b.spin + b.phase))) / 2) * 2);
        ctx.fillStyle = b.c;
        ctx.fillRect(Math.round(b.x / 2) * 2, Math.round((b.y + (b.s - h) / 2) / 2) * 2, b.s, h);
      }
      for (let i = bits.length - 1; i >= 0; i--) if (bits[i].y > H + 20) bits.splice(i, 1);
      if (bits.length || (big && t < 3)) raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [big]);

  return <canvas ref={ref} aria-hidden className="pointer-events-none fixed inset-0 z-30 size-full" />;
}
