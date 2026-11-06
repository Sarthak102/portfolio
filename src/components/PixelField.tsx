"use client";

import { useEffect, useRef } from "react";

// Dithered pixel clouds that drift around the edges of the hero.
// Canvas, ~30fps, paused when off screen; a single static frame under reduced motion.

const CELL = 12;
const ORANGE = "255, 91, 31";
const BONE = "237, 235, 230";

// Cheap value noise: hashed lattice + smooth interpolation.
function hash(x: number, y: number) {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return s - Math.floor(s);
}
function noise(x: number, y: number) {
  const xi = Math.floor(x), yi = Math.floor(y);
  const xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

// `avoid`: selector of an element (inside the same parent) the pixels stay clear of.
export function PixelField({ avoid }: { avoid?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current!;
    const ctx = canvas.getContext("2d")!;
    const host = canvas.parentElement!;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let cols = 0, rows = 0, stopRow = Infinity;
    let raf = 0, last = 0, t = 0, visible = true;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const { width, height } = host.getBoundingClientRect();
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cols = Math.ceil(width / CELL);
      rows = Math.ceil(height / CELL);
      const block = avoid ? host.querySelector(avoid) : null;
      stopRow = block ? Math.floor((block.getBoundingClientRect().top - host.getBoundingClientRect().top) / CELL) : Infinity;
    };

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (let r = 0; r < Math.min(rows, stopRow); r++) {
        for (let c = 0; c < cols; c++) {
          // Strongest at the edges, clear in the middle where the text sits.
          const ex = (c / cols - 0.5) * 2, ey = (r / rows - 0.5) * 2;
          const edge = Math.min(1, Math.max(0, Math.hypot(ex * 0.85, ey * 1.05) - 0.72) * 2.6);
          const n = noise(c * 0.09 + t * 0.15, r * 0.09 - t * 0.08);
          const level = n * edge * 1.25;

          const x = c * CELL, y = r * CELL;
          if (level > 0.8) {
            ctx.fillStyle = `rgba(${ORANGE}, 0.16)`;
            ctx.fillRect(x, y, CELL, CELL);
          } else if (level > 0.6 && (c + r) % 2 === 0) {
            ctx.fillStyle = `rgba(${ORANGE}, 0.13)`; // 50% checker dither
            ctx.fillRect(x, y, CELL, CELL);
          } else if (level > 0.38 && c % 2 === 0 && r % 2 === 0) {
            ctx.fillStyle = `rgba(${BONE}, 0.05)`; // 25% dither
            ctx.fillRect(x, y, CELL, CELL);
          }
        }
      }
    };

    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      if (!visible || now - last < 33) return;
      t += (now - last) / 1000;
      last = now;
      draw();
    };

    resize();
    draw();
    const ro = new ResizeObserver(() => {
      resize();
      draw();
    });
    ro.observe(host);
    if (still) return () => ro.disconnect();

    const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting));
    io.observe(host);
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
    };
  }, [avoid]);

  return <canvas ref={ref} aria-hidden className="pointer-events-none absolute inset-0" />;
}
