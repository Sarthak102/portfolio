"use client";

import { useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { experience } from "@/data/site";
import { PanelFx } from "@/components/PanelFx";

gsap.registerPlugin(ScrollTrigger, useGSAP);

export function Experience() {
  const scope = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(min-width: 768px) and (prefers-reduced-motion: no-preference)", () => {
        // Sticky stack: each role settles back as the next one slides over it.
        const cards = gsap.utils.toArray<HTMLElement>(".job");
        cards.forEach((card, i) => {
          const next = cards[i + 1];
          if (!next) return;
          gsap.to(card.querySelector(".job-panel"), {
            scale: 0.9,
            opacity: 0.35,
            ease: "none",
            scrollTrigger: { trigger: next, start: "top bottom", end: "top top", scrub: true },
          });
        });
        gsap.utils.toArray<HTMLElement>(".job-company").forEach((el) => {
          gsap.from(el, {
            yPercent: 30,
            ease: "none",
            scrollTrigger: { trigger: el, start: "top bottom", end: "top 40%", scrub: true },
          });
        });
      });
    },
    { scope },
  );

  return (
    <section ref={scope} id="experience" className="pt-28 md:pt-40">
      <h2 className="condensed px-5 text-[15vw] leading-[0.8] md:px-10 md:text-[11vw]">
        Experience
        <sup className="ml-1 align-top font-mono text-sm font-normal tracking-normal text-signal md:ml-2 md:text-xl">
          ({String(experience.length).padStart(2, "0")})
        </sup>
      </h2>

      <div className="mt-10 md:mt-16">
        {experience.map((job) => (
          <article key={job.company} className="job px-3 pb-3 md:sticky md:top-0 md:h-[100dvh] md:px-6 md:py-6">
            <div className="job-panel group/card relative flex h-full flex-col justify-between overflow-hidden rounded-[28px] border border-bone/10 bg-panel p-6 pb-20 shadow-[inset_0_1px_0_rgb(237_235_230/0.07)] transition-colors duration-300 hover:border-bone/20 md:p-12 md:pb-[4.5rem]">
              <PanelFx flip />
              <span
                aria-hidden
                className="condensed pointer-events-none absolute -right-4 -bottom-8 text-[34vw] leading-none text-bone/[0.04] md:text-[22vw]"
              >
                {job.year}
              </span>

              <div className="relative flex flex-wrap items-baseline justify-between gap-3">
                <p className="font-mono text-sm text-signal">{job.period}</p>
                <p className="text-dim">{job.title}</p>
              </div>

              <h3 className="job-company condensed relative my-10 text-[17vw] leading-[0.82] md:my-0 md:text-[10vw]">
                {job.company}
              </h3>

              <div className="relative grid gap-8 md:grid-cols-12">
                <ul className="space-y-3 text-[1.02rem] leading-relaxed text-bone/85 md:col-span-8">
                  {job.points.map((p) => (
                    <li key={p} className="flex gap-3">
                      <span aria-hidden className="mt-[0.7em] h-px w-4 shrink-0 bg-signal" />
                      {p}
                    </li>
                  ))}
                </ul>
                <ul className="flex flex-wrap content-end gap-2 md:col-span-4 md:justify-end">
                  {job.stack.map((s) => (
                    <li key={s} className="rounded-full border border-bone/15 px-3 py-1 font-mono text-xs text-dim">
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
