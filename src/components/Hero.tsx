"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { ScrambleTextPlugin } from "gsap/ScrambleTextPlugin";
import { useGSAP } from "@gsap/react";
import { ArrowDownRight, GithubLogo, LinkedinLogo } from "@phosphor-icons/react";
import { builds, experience, projects, site } from "@/data/site";
import { INTRO_DONE } from "@/components/Preloader";
import { PixelField } from "@/components/PixelField";
import { Asterisk } from "@/components/Asterisk";
import { StatusPill } from "@/components/StatusPill";
import { Logo } from "@/components/Logo";
import { PanelFx } from "@/components/PanelFx";
import { WannaPlay } from "@/components/WannaPlay";
import { closePortal } from "@/components/portal";

gsap.registerPlugin(ScrollTrigger, SplitText, ScrambleTextPlugin, useGSAP);

const [now, before] = experience;
const facts = [
  ["Now", `${now.title}, ${now.company}`],
  ["Before", before.company],
  ["Stack", "TypeScript, Node.js, React, DynamoDB"],
];

const profile =
  "inline-flex size-12 items-center justify-center rounded-full border border-bone/20 transition duration-300 hover:border-signal hover:text-signal active:scale-[0.98]";

export function Hero() {
  const scope = useRef<HTMLElement>(null);
  const router = useRouter();

  // On every page load, once the intro settles, the asterisk acts out its hover for a few seconds
  // ("Wanna play?"), so people notice there's a game. Then it goes back to waiting.
  const [tease, setTease] = useState(false);
  useEffect(() => {
    let off = 0, on = 0;
    const start = () => {
      on = window.setTimeout(() => setTease(true), 1800);
      off = window.setTimeout(() => setTease(false), 1800 + 3800);
    };
    const done = (window as unknown as { __introDone?: boolean }).__introDone;
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (done || calm) start();
    else window.addEventListener(INTRO_DONE, start, { once: true });
    return () => {
      window.removeEventListener(INTRO_DONE, start);
      clearTimeout(on);
      clearTimeout(off);
    };
  }, []);

  // Into the game: the portal closes around the asterisk, then Pip drops into level 1.
  const enter = async (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return; // let new-tab clicks through
    e.preventDefault();
    const r = e.currentTarget.getBoundingClientRect();
    await closePortal(r.left + r.width / 2, r.top + r.height / 2);
    router.push("/play#drop");
  };

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const split = SplitText.create(".name-line", { type: "chars", mask: "chars", charsClass: "char" });

        const tl = gsap.timeline({ paused: true, defaults: { ease: "expo.out" } });
        tl.fromTo(split.chars, { yPercent: 110 }, { yPercent: 0, duration: 1.3, stagger: 0.035 })
          .set(".name-line", { autoAlpha: 1 }, 0)
          .fromTo(".fade", { y: 18 }, { y: 0, autoAlpha: 1, duration: 1, stagger: 0.07, ease: "power3.out" }, 0.4);

        const play = () => tl.play();
        if ((window as unknown as { __introDone?: boolean }).__introDone) play();
        else window.addEventListener(INTRO_DONE, play, { once: true });

        // Cycle what "I build" means: the claim changes, the promise stays.
        let i = 0;
        const word = scope.current!.querySelector(".build-word")!;
        const cycle = gsap.delayedCall(2.6, function next() {
          i = (i + 1) % builds.length;
          gsap.to(word, { duration: 0.8, scrambleText: { text: builds[i], chars: "lowerCase", speed: 0.5 } });
          cycle.restart(true);
        });

        // Leaving the hero, the name splits apart, like a dolly shot.
        const out = { trigger: scope.current, start: "top top", end: "bottom top", scrub: true };
        gsap.to(".name-a", { xPercent: -14, ease: "none", scrollTrigger: out });
        gsap.to(".name-b", { xPercent: 14, ease: "none", scrollTrigger: out });
        gsap.to(".spin", { rotation: 180, ease: "none", scrollTrigger: out });

        return () => {
          window.removeEventListener(INTRO_DONE, play);
          cycle.kill();
          split.revert();
        };
      });

      // Pointer play: letters near the cursor stretch wider.
      mm.add("(pointer: fine) and (prefers-reduced-motion: no-preference)", () => {
        const section = scope.current!;
        const chars = gsap.utils.toArray<HTMLElement>(".char", section);
        gsap.set(chars, { "--wdth": 75 });
        const widths = chars.map((c) => gsap.quickTo(c, "--wdth", { duration: 0.6, ease: "power3" }));

        const onMove = (e: PointerEvent) => {
          const reach = window.innerWidth * 0.16;
          chars.forEach((c, k) => {
            const r = c.getBoundingClientRect();
            const d = Math.hypot(e.clientX - (r.left + r.width / 2), e.clientY - (r.top + r.height / 2));
            widths[k](75 + 25 * gsap.utils.clamp(0, 1, 1 - d / reach));
          });
        };
        const onLeave = () => widths.forEach((w) => w(75));
        section.addEventListener("pointermove", onMove);
        section.addEventListener("pointerleave", onLeave);
        return () => {
          section.removeEventListener("pointermove", onMove);
          section.removeEventListener("pointerleave", onLeave);
        };
      });
    },
    { scope },
  );

  return (
    <section
      ref={scope}
      id="top"
      className="relative flex flex-col gap-16 overflow-hidden md:min-h-[100dvh] md:justify-between md:gap-0 px-5 pt-24 pb-6 md:px-10 md:pt-28"
    >
      <PixelField avoid=".name-block" />

      <div className="relative z-10 grid gap-8 md:grid-cols-12">
        <p className="fade intro-hide font-display text-[clamp(1.6rem,3.2vw,3rem)] leading-[1.08] font-medium tracking-[-0.02em] md:col-span-7">
          I build <span className="build-word text-signal">{builds[0]}</span>
          <br />
          that don&apos;t fall over.
        </p>
        <div className="fade intro-hide group/card relative overflow-hidden rounded-[28px] border border-bone/10 bg-panel/80 p-6 text-sm shadow-[inset_0_1px_0_rgb(237_235_230/0.07)] backdrop-blur-md transition-colors duration-300 hover:border-bone/20 md:col-span-5 md:col-start-8">
          <PanelFx />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <StatusPill />
            <span className="font-mono text-xs text-dim uppercase">Mumbai, IST</span>
          </div>

          <dl className="mt-4 border-b border-bone/10">
            {facts.map(([label, value]) => (
              <div key={label} className="group/row grid grid-cols-[4.5rem_minmax(0,1fr)] gap-4 border-t border-bone/10 py-2">
                <dt className="pt-0.5 font-mono text-xs text-dim uppercase transition-colors duration-300 group-hover/row:text-signal">{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>

          {/* Resume stays in the nav pill right above this card, so the slot goes to the profiles. */}
          <div className="relative mt-4 flex items-center gap-3">
            <a href={`mailto:${site.email}`} className="btn-primary">
              Email me
            </a>
            <a href={site.github} target="_blank" rel="noreferrer" aria-label="GitHub" className={profile}>
              <GithubLogo size={20} />
            </a>
            <a href={site.linkedin} target="_blank" rel="noreferrer" aria-label="LinkedIn" className={profile}>
              <LinkedinLogo size={20} />
            </a>
          </div>
        </div>
      </div>

      <div aria-hidden className="spin absolute top-[30%] left-[48%] z-10 hidden w-[1.6vw] md:block">
        <Asterisk className="w-full text-signal" inner="hidden" />
      </div>

      <div className="name-block relative mt-14 md:mt-6">
        <h1
          aria-label={site.name}
          className="condensed pointer-events-none relative z-10 text-[22vw] leading-[0.8] whitespace-nowrap md:text-[min(16.5vw,28dvh)]"
        >
          <span aria-hidden className="name-a name-line intro-hide block">Sarthak</span>
          <span aria-hidden className="name-b name-line intro-hide block text-right">Kamble</span>
        </h1>

        {/* The brand mark beside the first name: hairline at rest, turns on hover with a game-style
            "Wanna play?" box (also acted out on every page load), and opens Pip through the portal. */}
        <Link
          href="/play#drop"
          onClick={enter}
          data-tease={tease || undefined}
          aria-label="Play Pip, a small platformer game"
          className="fade intro-hide group absolute -top-[26vw] right-[4%] z-10 block w-[16vw] md:top-[2%] md:right-[3%] md:w-[min(12vw,22dvh)]"
        >
          <span className="spin block">
            <Logo outline className="w-full text-bone/35 transition duration-700 group-hover:rotate-180 group-hover:text-signal group-data-[tease]:rotate-180 group-data-[tease]:text-signal" />
          </span>
          <span
            aria-hidden
            className="pointer-events-none absolute top-[62%] right-[78%] translate-y-2 opacity-0 transition duration-200 group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:translate-y-0 group-focus-visible:opacity-100 group-data-[tease]:translate-y-0 group-data-[tease]:opacity-100"
          >
            <WannaPlay tail="up" />
          </span>
        </Link>

        {/* Under the first name, beside the last: what's on the bench right now. */}
        <div className="fade intro-hide absolute bottom-[8%] left-0 z-10 hidden md:block">
          <p className="font-mono text-xs text-dim uppercase">Now building</p>
          <ul className="mt-3 space-y-1.5">
            {projects.map((p) => (
              <li key={p.name}>
                <a href="#work" className="group inline-flex items-center gap-2 text-lg transition hover:text-signal">
                  {p.name}
                  <ArrowDownRight size={16} className="transition group-hover:translate-x-0.5 group-hover:translate-y-0.5" />
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
