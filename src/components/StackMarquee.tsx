"use client";

import { useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { stack } from "@/data/site";

gsap.registerPlugin(ScrollTrigger, useGSAP);

function Row({ hidden }: { hidden?: boolean }) {
  return (
    <ul aria-hidden={hidden} className="flex shrink-0 items-center">
      {stack.map((s, i) => (
        <li
          key={s}
          className={`condensed px-5 text-[14vw] leading-none whitespace-nowrap md:px-8 md:text-[8vw] ${i % 2 ? "text-bone/25" : ""}`}
        >
          {s}
        </li>
      ))}
    </ul>
  );
}

export function StackMarquee() {
  const scope = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        // One endless loop: the track holds two identical rows, so sliding exactly half its width
        // lands frame-perfect on the start. Driven by GSAP (not CSS) so it never fights the skew,
        // which lives on a separate wrapper.
        gsap.to(".marquee-track", { xPercent: -50, duration: 50, ease: "none", repeat: -1 });

        // The strip leans into fast scrolling and settles when you stop.
        const skew = gsap.quickTo(".marquee", "skewX", { duration: 0.5, ease: "power3" });
        ScrollTrigger.create({
          trigger: scope.current,
          start: "top bottom",
          end: "bottom top",
          onUpdate: (self) => skew(gsap.utils.clamp(-12, 12, self.getVelocity() / -250)),
          onLeave: () => skew(0),
          onLeaveBack: () => skew(0),
        });
      });
    },
    { scope },
  );

  return (
    <section ref={scope} aria-label="Tech stack" className="overflow-hidden py-20 md:py-28">
      <div className="marquee">
        <div className="marquee-track flex w-max">
          <Row />
          <Row hidden />
        </div>
      </div>
    </section>
  );
}
