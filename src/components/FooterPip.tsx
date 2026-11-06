"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { CACTUS, PIP, PIP_LEGS } from "@/game/sprites";
import { WannaPlay } from "@/components/WannaPlay";
import { closePortal } from "@/components/portal";

// Pip pacing the footer's divider line, hopping the cacti that roll toward him, Dino-style.
// Hover: he stops and asks. Click: he drops through the line as the portal closes on him, straight into level 1.

const PX = 4, CPX = 2; // CSS px per sprite pixel: Pip, cacti
const ABOVE = 104, BELOW = 100; // room above the line (for jumps) and below it (for the fall)
const SPEED = 55, CACTUS_SPEED = 150, GRAVITY = 1500, JUMP = 420;
const NIGHT = "#0E0E0D", SIGNAL = "#FF5B1F";

const pw = PIP[0].length * PX, ph = (PIP.length + 1) * PX;
const cw = CACTUS[0].length * CPX, ch = CACTUS.length * CPX;

export function FooterPip() {
  const wrap = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const tip = useRef<HTMLSpanElement>(null);
  const hovered = useRef(false);
  const falling = useRef(false);
  const router = useRouter();

  useEffect(() => {
    const cv = canvas.current!, box = wrap.current!, btn = button.current!, bubble = tip.current!;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let W = 0;
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = box.clientWidth;
      cv.width = W * dpr;
      cv.height = (ABOVE + BELOW) * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    // y is height above the line (up is positive).
    const pip = { x: 24, y: 0, vy: 0, dir: 1, walk: 0, turnIn: 5 };
    let cacti: { x: number; v: number }[] = [];
    let spawnIn = 1.5;

    const draw = (rows: string[], x: number, top: number, px: number, color: string, flip = false) => {
      const w = rows[0].length;
      rows.forEach((r, ry) => {
        for (let rx = 0; rx < w; rx++) {
          const c = r[flip ? w - 1 - rx : rx];
          if (c === ".") continue;
          ctx.fillStyle = c === "o" ? SIGNAL : color; // the eye shows the footer through
          ctx.fillRect(Math.round(x + rx * px), Math.round(top + ry * px), px, px);
        }
      });
    };

    const step = (dt: number) => {
      if (falling.current) {
        pip.vy -= GRAVITY * dt;
        pip.y += pip.vy * dt;
        return; // `fall` navigates once the portal has closed
      }
      if (hovered.current || calm) return;

      // Pace back and forth, but only turn around when nothing is coming (so cacti always come from ahead).
      const atEdge = (pip.dir > 0 && pip.x > W - pw - 16) || (pip.dir < 0 && pip.x < 16);
      pip.turnIn -= dt;
      if ((atEdge || pip.turnIn <= 0) && !cacti.length && pip.y === 0) {
        pip.dir = -pip.dir;
        pip.turnIn = 4 + Math.random() * 6;
      }
      if (!atEdge) {
        pip.x += pip.dir * SPEED * dt;
        pip.walk += dt;
      }
      if (pip.y > 0 || pip.vy > 0) {
        pip.vy -= GRAVITY * dt;
        pip.y = Math.max(0, pip.y + pip.vy * dt);
        if (pip.y === 0) pip.vy = 0;
      }

      spawnIn -= dt;
      // Hold off near the end of a lap, so the line clears and he can turn around.
      const room = pip.dir > 0 ? W - pip.x : pip.x;
      if (spawnIn <= 0 && room > 260 && cacti.length < 2) {
        cacti.push(pip.dir > 0 ? { x: W + 10, v: -CACTUS_SPEED } : { x: -cw - 10, v: CACTUS_SPEED });
        spawnIn = 2.2 + Math.random() * 3;
      }
      for (const c of cacti) {
        c.x += c.v * dt;
        // Hop when it's about to reach him: judged by closing speed, so it works walking or standing.
        const gap = c.v < 0 ? c.x - (pip.x + pw) : pip.x - (c.x + cw);
        const closing = Math.abs(c.v) + (atEdge ? 0 : SPEED);
        if (pip.y === 0 && gap > 0 && gap < closing * 0.07) pip.vy = JUMP;
      }
      cacti = cacti.filter((c) => c.x > -cw - 20 && c.x < W + 20);
    };

    const render = () => {
      ctx.clearRect(0, 0, W, ABOVE + BELOW);
      for (const c of cacti) draw(CACTUS, c.x, ABOVE - ch, CPX, NIGHT);
      const still = hovered.current || calm;
      const legs = pip.y > 0 ? PIP_LEGS.air : still ? PIP_LEGS.stand : Math.floor(pip.walk * 8) % 2 ? PIP_LEGS.a : PIP_LEGS.b;
      const rows = [...PIP, legs];
      draw(falling.current ? [...rows].reverse() : rows, pip.x, ABOVE - pip.y - ph, PX, NIGHT, pip.dir < 0);
      btn.style.transform = `translate(${Math.round(pip.x)}px, ${Math.round(ABOVE - pip.y - ph)}px)`;
      // Keep the speech box on screen near the edges, with its tail still over Pip.
      const bw = bubble.offsetWidth, mid = pip.x + pw / 2;
      const left = Math.min(Math.max(mid - bw / 2, 0), W - bw);
      bubble.style.transform = `translateX(${Math.round(left - pip.x)}px)`;
      bubble.style.setProperty("--tail", `${Math.round(mid - left)}px`);
    };

    let raf = 0, last = performance.now(), visible = false;
    const frame = (now: number) => {
      const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
      last = now;
      step(dt);
      render();
      if (visible || falling.current) raf = requestAnimationFrame(frame);
    };
    // Only run while the footer is on screen.
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      if (visible) {
        cancelAnimationFrame(raf);
        last = performance.now();
        raf = requestAnimationFrame(frame);
      }
    });
    resize();
    render();
    io.observe(box);
    window.addEventListener("resize", resize);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, [router]);

  const fall = async () => {
    if (falling.current) return;
    hovered.current = false;
    falling.current = true;
    const r = button.current!.getBoundingClientRect();
    await closePortal(r.left + r.width / 2, r.top + r.height);
    router.push("/play#drop");
  };

  return (
    <div ref={wrap} className="pointer-events-none absolute inset-x-0" style={{ top: -ABOVE, height: ABOVE + BELOW }}>
      <canvas ref={canvas} className="absolute inset-0 size-full" />
      <button
        ref={button}
        type="button"
        onClick={fall}
        onPointerEnter={() => (hovered.current = true)}
        onPointerLeave={() => (hovered.current = false)}
        onFocus={() => (hovered.current = true)}
        onBlur={() => (hovered.current = false)}
        aria-label="Play Pip: he drops you straight into level 1"
        className="group pointer-events-auto absolute top-0 left-0 cursor-pointer rounded-sm"
        style={{ width: pw, height: ph }}
      >
        <span ref={tip} className="pointer-events-none absolute bottom-full left-0 mb-5">
          <span className="block opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100">
            <WannaPlay tail="down" />
          </span>
        </span>
      </button>
    </div>
  );
}
