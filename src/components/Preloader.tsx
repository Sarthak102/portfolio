"use client";

import { useRef } from "react";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import { LOGO_PATH } from "@/components/Logo";
import { lenis } from "@/components/SmoothScroll";
import { openPortal, portalWaiting } from "@/lib/portal";

gsap.registerPlugin(useGSAP);

export const INTRO_DONE = "intro-done";

const NIGHT = "#0E0E0D", BONE = "#EDEBE6", SIGNAL = "#FF5B1F";
const GRID = 22; // the asterisk is sampled into a 22 x 22 pixel grid
const CELL = 44; // dissolve cell size in CSS px
const STATUS = ["Booting", "Loading pixels", "Teaching Pip to jump", "Ready"];

// Scattered pixels fly in and assemble the asterisk while the count runs to 100. It lights up orange,
// the pixels drop away (like Pip through the floor), and the screen dissolves cell by cell into the hero.
export function Preloader() {
  const scope = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);

  useGSAP(
    () => {
      // Back from the game: skip the intro (it already played, or we came through the portal, which
      // is intro enough) and open the portal that closed on the way out.
      const w = window as unknown as { __introDone?: boolean };
      if (w.__introDone || portalWaiting()) {
        gsap.set(scope.current, { display: "none" });
        if (!w.__introDone) {
          w.__introDone = true;
          window.dispatchEvent(new Event(INTRO_DONE));
        }
        if (portalWaiting()) void openPortal(window.innerWidth / 2, window.innerHeight / 2);
        return;
      }
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        window.scrollTo(0, 0);
        lenis?.stop();
        const cv = canvas.current!;
        const ctx = cv.getContext("2d")!;
        const num = scope.current!.querySelector(".count")!;
        const status = scope.current!.querySelector(".status")!;

        // Which grid cells fall inside the logo shape (the path is drawn in a 256 box).
        const probe = document.createElement("canvas").getContext("2d")!;
        const logo = new Path2D(LOGO_PATH);
        const pixels: { gx: number; gy: number; sx: number; sy: number; delay: number; vx: number; vy: number; d: number }[] = [];
        for (let gy = 0; gy < GRID; gy++)
          for (let gx = 0; gx < GRID; gx++) {
            const px = ((gx + 0.5) / GRID) * 256, py = ((gy + 0.5) / GRID) * 256;
            if (!probe.isPointInPath(logo, px, py, "evenodd")) continue;
            pixels.push({
              gx,
              gy,
              sx: Math.random(),
              sy: Math.random(),
              delay: Math.random() * 0.45,
              vx: (Math.random() - 0.5) * 500,
              vy: -Math.random() * 450,
              d: Math.hypot(gx - GRID / 2, gy - GRID / 2) / (GRID / 2),
            });
          }

        let W = 0, H = 0, cols = 0, rows = 0, cells: number[] = [];
        const resize = () => {
          const dpr = Math.min(window.devicePixelRatio || 1, 2);
          W = window.innerWidth;
          H = window.innerHeight;
          cv.width = W * dpr;
          cv.height = H * dpr;
          ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
          cols = Math.ceil(W / CELL);
          rows = Math.ceil(H / CELL);
          // Each cell's moment to vanish: a diagonal sweep from the bottom-left, roughened with noise.
          cells = Array.from({ length: cols * rows }, (_, i) => {
            const x = i % cols, y = Math.floor(i / cols);
            return (x / cols + (rows - y) / rows) * 0.36 + Math.random() * 0.28;
          });
        };
        resize();

        const st = { assemble: 0, light: 0, fall: 0, dissolve: 0 };
        const render = () => {
          ctx.clearRect(0, 0, W, H);
          ctx.fillStyle = NIGHT;
          if (st.dissolve <= 0) ctx.fillRect(0, 0, W, H);
          else
            for (let i = 0; i < cells.length; i++)
              if (cells[i] > st.dissolve) ctx.fillRect((i % cols) * CELL, Math.floor(i / cols) * CELL, CELL + 0.5, CELL + 0.5);

          const size = Math.min(W, H) * 0.36, cell = size / GRID, block = Math.max(1, Math.round(cell) - 2);
          const ox = (W - size) / 2, oy = (H - size) / 2;
          const t = st.fall; // seconds since the pixels let go
          for (const p of pixels) {
            const k = gsap.utils.clamp(0, 1, (st.assemble - p.delay) / (1 - 0.45));
            if (k <= 0) continue;
            const e = 1 - (1 - k) ** 3;
            let x = p.sx * W + (ox + p.gx * cell - p.sx * W) * e;
            let y = p.sy * H + (oy + p.gy * cell - p.sy * H) * e;
            if (t > 0) {
              x += p.vx * t;
              y += p.vy * t + 1400 * t * t;
            }
            ctx.globalAlpha = Math.min(1, k * 1.5);
            ctx.fillStyle = p.d <= st.light * 1.2 ? SIGNAL : BONE; // lights up from the centre out
            ctx.fillRect(Math.round(x), Math.round(y), block, block);
          }
          ctx.globalAlpha = 1;
        };
        gsap.ticker.add(render);
        window.addEventListener("resize", resize);

        const finish = () => {
          lenis?.start();
          (window as unknown as { __introDone?: boolean }).__introDone = true;
          window.dispatchEvent(new Event(INTRO_DONE));
        };
        const count = { v: 0 };
        let shown = 0;

        const tl = gsap
          .timeline({
            onComplete: () => {
              gsap.ticker.remove(render);
              window.removeEventListener("resize", resize);
              gsap.set(scope.current, { display: "none" });
            },
          })
          .to(st, { assemble: 1, duration: 1.7, ease: "none" }, 0)
          .to(
            count,
            {
              v: 100,
              duration: 1.8,
              ease: "power2.inOut",
              onUpdate: () => {
                num.textContent = String(Math.round(count.v)).padStart(3, "0");
                const s = Math.min(STATUS.length - 1, Math.floor((count.v / 100) * (STATUS.length - 1) + 0.001));
                if (s !== shown) status.textContent = STATUS[(shown = s)];
              },
            },
            0,
          )
          .to(".bar", { scaleX: 1, duration: 1.8, ease: "power2.inOut" }, 0)
          .to(st, { light: 1, duration: 0.35, ease: "power2.out" })
          .to(".count", { color: SIGNAL, duration: 0.2 }, "<")
          .to(".ui", { autoAlpha: 0, duration: 0.3 }, "+=0.15")
          .add(finish, "<")
          .set(scope.current, { backgroundColor: "transparent" }, "<") // solid until here, so nothing shows before JS runs
          .to(st, { fall: 1.2, duration: 1.2, ease: "none" }, "<")
          .to(st, { dissolve: 1, duration: 1.05, ease: "power1.in" }, "<0.1");

        return () => {
          tl.kill();
          gsap.ticker.remove(render);
          window.removeEventListener("resize", resize);
        };
      });
    },
    { scope },
  );

  return (
    <div ref={scope} aria-hidden className="intro-only pointer-events-none fixed inset-0 z-[70] bg-night">
      <canvas ref={canvas} className="absolute inset-0 size-full" />
      <div className="ui absolute inset-0 flex flex-col justify-between p-5 font-mono text-xs text-dim uppercase md:p-10">
        <div className="flex justify-between gap-6">
          <span>
            Sarthak Kamble
            <br />
            Portfolio, 2026
          </span>
          <span className="status text-right text-bone">Booting</span>
        </div>
        <div className="flex items-end justify-between gap-6">
          <span className="count condensed font-display text-[26vw] leading-[0.78] text-bone md:text-[13vw]">000</span>
          <span className="text-right">
            Mumbai, IN
            <br />
            Full-stack developer
          </span>
        </div>
        <span className="bar absolute inset-x-0 bottom-0 h-[3px] origin-left scale-x-0 bg-signal" />
      </div>
    </div>
  );
}
