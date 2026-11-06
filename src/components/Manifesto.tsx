"use client";

import { useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { manifesto } from "@/data/site";

gsap.registerPlugin(ScrollTrigger, useGSAP);

const words = (text: string, cls = "") =>
  text.split(" ").map((w, i) => (
    <span key={i} className={`word ${cls}`}>
      {w}{" "}
    </span>
  ));

export function Manifesto() {
  const scope = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        // The frame holds still while the sentence is read, word by word, at scroll speed.
        gsap.fromTo(
          ".word",
          { opacity: 0.12 },
          {
            opacity: 1,
            stagger: 0.1,
            ease: "none",
            scrollTrigger: { trigger: scope.current, start: "top top", end: "+=140%", scrub: true, pin: true },
          },
        );
      });
    },
    { scope },
  );

  return (
    <section ref={scope} className="flex min-h-[100dvh] items-center px-5 md:px-10">
      <p className="max-w-[20ch] font-display text-[clamp(2.2rem,5.6vw,5.5rem)] leading-[1.02] font-semibold tracking-[-0.035em]">
        {words(manifesto.before)}
        {words(manifesto.highlight, "text-signal")}
        {words(manifesto.after)}
      </p>
    </section>
  );
}
