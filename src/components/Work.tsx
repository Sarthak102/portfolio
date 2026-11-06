"use client";

import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { ArrowUpRight, Plus } from "@phosphor-icons/react";
import { projects, site, type Project } from "@/data/site";
import { InterviewPreview, ReceiptPreview } from "@/components/Previews";

gsap.registerPlugin(ScrollTrigger, useGSAP);

function Preview({ project }: { project: Project }) {
  if (project.video) {
    return (
      <video
        src={project.video}
        autoPlay
        muted
        loop
        playsInline
        aria-label={`${project.name} demo`}
        className="w-full rounded-[20px]"
      />
    );
  }
  return project.preview === "interview" ? <InterviewPreview /> : <ReceiptPreview />;
}

// Pixel dissolve: covers the card in blocks, then clears them in random order.
function usePixelReveal(key: number) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || key < 0) return;
    const ctx = canvas.getContext("2d")!;
    const { width, height } = canvas.getBoundingClientRect();
    canvas.width = width;
    canvas.height = height;
    const size = 16;
    const cols = Math.ceil(width / size), rows = Math.ceil(height / size);
    const cells = gsap.utils.shuffle([...Array(cols * rows).keys()]);
    const state = { n: 0 };
    const paint = () => {
      ctx.clearRect(0, 0, width, height);
      for (let k = Math.floor(state.n); k < cells.length; k++) {
        const c = cells[k];
        ctx.fillStyle = k % 7 === 0 ? "#ff5b1f" : "#161615";
        ctx.fillRect((c % cols) * size, Math.floor(c / cols) * size, size, size);
      }
    };
    paint();
    const tween = gsap.to(state, { n: cells.length, duration: 0.45, ease: "power2.in", onUpdate: paint });
    return () => {
      tween.kill();
    };
  }, [key]);
  return ref;
}

export function Work() {
  const scope = useRef<HTMLElement>(null);
  const card = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState(-1);
  const [open, setOpen] = useState<number | null>(null);
  const reveal = usePixelReveal(hovered);
  const move = useRef<{ x: (v: number) => void; y: (v: number) => void } | null>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(pointer: fine) and (prefers-reduced-motion: no-preference)", () => {
        move.current = {
          x: gsap.quickTo(card.current, "x", { duration: 0.55, ease: "power3" }),
          y: gsap.quickTo(card.current, "y", { duration: 0.55, ease: "power3" }),
        };
        return () => (move.current = null);
      });
    },
    { scope },
  );

  // Expand / collapse a row, then let pinned sections below re-measure.
  useGSAP(
    () => {
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      gsap.utils.toArray<HTMLElement>(".panel").forEach((panel, i) => {
        gsap.to(panel, {
          height: open === i ? "auto" : 0,
          duration: reduce ? 0 : 0.7,
          ease: "expo.inOut",
          onComplete: () => ScrollTrigger.refresh(),
        });
      });
    },
    { scope, dependencies: [open] },
  );

  const onMove = (e: React.PointerEvent) => {
    move.current?.x(e.clientX);
    move.current?.y(e.clientY);
  };

  const showCard = hovered >= 0 && move.current !== null;

  return (
    <section ref={scope} id="work" className="px-5 py-28 md:px-10 md:py-40">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <h2 className="condensed text-[18vw] leading-[0.8] md:text-[11vw]">
          Work
          <sup className="ml-2 align-top font-mono text-base font-normal tracking-normal text-signal md:text-xl">
            ({String(projects.length).padStart(2, "0")})
          </sup>
        </h2>
        <p className="max-w-[30ch] text-dim">Concept previews until each one ships. Click a project to open it.</p>
      </div>

      <ul className="mt-12 border-t border-bone/10" onPointerMove={onMove} onPointerLeave={() => setHovered(-1)}>
        {projects.map((p, i) => {
          const isOpen = open === i;
          return (
            <li key={p.name} className="border-b border-bone/10">
              <button
                type="button"
                aria-expanded={isOpen}
                aria-controls={`project-${i}`}
                onClick={() => setOpen(isOpen ? null : i)}
                onPointerEnter={() => setHovered(i)}
                className="group grid w-full grid-cols-12 items-center gap-4 py-6 text-left md:py-9 [@media(pointer:fine)_and_(prefers-reduced-motion:no-preference)]:cursor-none"
              >
                <span className="col-span-2 font-mono text-sm text-dim md:col-span-1">{String(i + 1).padStart(2, "0")}</span>
                <span className="condensed col-span-10 text-[12vw] leading-[0.85] transition duration-500 group-hover:translate-x-3 group-hover:text-signal md:col-span-7 md:text-[6.5vw]">
                  {p.name}
                </span>
                <span className="col-span-6 col-start-3 text-sm text-dim md:col-span-2 md:col-start-auto">{p.kind}</span>
                <span className="col-span-4 flex items-center justify-end gap-4 md:col-span-2">
                  <span className="hidden rounded-full border border-signal/40 px-3 py-1 font-mono text-xs text-signal sm:inline">
                    {p.status}
                  </span>
                  <Plus size={22} className={`shrink-0 transition duration-500 ${isOpen ? "rotate-45 text-signal" : ""}`} />
                </span>
              </button>

              <div id={`project-${i}`} className="panel h-0 overflow-hidden" role="region" aria-label={p.name} onPointerEnter={() => setHovered(-1)}>
                {/* minmax(0,1fr): without it the code mock's long lines widen the column past the screen. */}
                <div className="grid grid-cols-[minmax(0,1fr)] items-center gap-10 pt-2 pb-14 md:grid-cols-12">
                  <div className="min-w-0 md:col-span-5">
                    <p className="max-w-[44ch] text-lg leading-relaxed text-bone/85">{p.summary}</p>
                    <p className="mt-6 font-mono text-xs text-dim">{p.stack.join("  /  ")}</p>
                    {p.href && (
                      <a href={p.href} target="_blank" rel="noreferrer" className="btn-primary mt-8">
                        Visit <ArrowUpRight size={16} />
                      </a>
                    )}
                  </div>
                  <div className="flex min-w-0 justify-center md:col-span-6 md:col-start-7">
                    <div className="w-full max-w-[34rem]">
                      <Preview project={p} />
                    </div>
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      <a
        href={site.github}
        target="_blank"
        rel="noreferrer"
        className="mt-10 inline-flex items-center gap-2 font-mono text-sm text-dim transition hover:text-signal"
      >
        More on GitHub <ArrowUpRight size={14} />
      </a>

      {/* Cursor card: follows the pointer over the list, pixel-dissolves in on each new project. */}
      <div
        ref={card}
        aria-hidden
        className={`pointer-events-none fixed top-0 left-0 z-40 hidden transition-[opacity,scale] duration-300 md:block ${
          showCard ? "scale-100 opacity-100" : "scale-75 opacity-0"
        }`}
      >
        <div className="relative -translate-x-1/2 -translate-y-1/2">
          <div className="relative h-[15rem] w-[21rem] overflow-hidden rounded-[20px] bg-panel">
            {hovered >= 0 && (
              <div className="pointer-events-none absolute top-0 left-0 w-[34rem] origin-top-left scale-[0.62] p-4">
                <Preview project={projects[hovered]} />
              </div>
            )}
            <canvas ref={reveal} className="absolute inset-0 size-full" />
          </div>
          <span className="absolute -right-5 -bottom-5 flex size-20 items-center justify-center rounded-full bg-signal font-mono text-xs text-night uppercase">
            {open === hovered ? "Close" : "Open"}
          </span>
        </div>
      </div>
    </section>
  );
}
