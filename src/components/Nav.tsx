"use client";

import { gsap } from "gsap";
import { ScrambleTextPlugin } from "gsap/ScrambleTextPlugin";
import { ArrowSwap } from "@/components/ArrowSwap";
import { Logo } from "@/components/Logo";
import { site } from "@/data/site";

gsap.registerPlugin(ScrambleTextPlugin);

const links = [
  { href: "#work", label: "Work", mobile: true },
  { href: "#experience", label: "Experience", mobile: false },
  { href: "#contact", label: "Contact", mobile: true },
];

function scramble(e: React.MouseEvent<HTMLElement>) {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const el = e.currentTarget.querySelector("span");
  if (!el) return;
  gsap.to(el, {
    duration: 0.5,
    scrambleText: {
      text: el.dataset.text ?? "",
      chars: "upperCase",
      speed: 0.6,
    },
  });
}

const resumePill =
  "inline-flex items-center gap-1.5 rounded-full px-4 py-2 font-mono text-xs tracking-wide uppercase";

export function Nav() {
  return (
    <>
      <header className="pointer-events-none fixed inset-x-0 top-0 z-50 px-5 pt-5 mix-blend-difference md:px-10 md:pt-7">
        <div className="pointer-events-auto flex items-center justify-between text-bone">
          <a
            href="#top"
            aria-label={`${site.name}, back to top`}
            className="block"
          >
            <Logo className="size-9 md:size-10" />
          </a>
          <nav className="flex items-center gap-6 font-mono text-xs tracking-wide uppercase md:gap-9">
            {links.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onMouseEnter={scramble}
                className={l.mobile ? "" : "hidden sm:inline"}
              >
                <span data-text={l.label}>{l.label}</span>
              </a>
            ))}
            {/* Holds the Resume pill's place: the pill itself lives outside this blended header. */}
            <span aria-hidden className={`${resumePill} invisible`}>
              Resume <ArrowSwap />
            </span>
          </nav>
        </div>
      </header>
      {/* Resume, in solid signal orange so it's noticed. Outside the header because mix-blend-difference
        would turn the orange blue. */}
      <a
        href={site.resume}
        target="_blank"
        rel="noreferrer"
        className={`${resumePill} group fixed top-[22px] right-5 z-50 bg-signal text-night transition hover:bg-bone md:top-[32px] md:right-10`}
      >
        Resume <ArrowSwap />
      </a>
    </>
  );
}
