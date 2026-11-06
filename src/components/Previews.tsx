"use client";

import { useRef } from "react";
import { gsap } from "gsap";
import { TextPlugin } from "gsap/TextPlugin";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { Microphone } from "@phosphor-icons/react";

gsap.registerPlugin(TextPlugin, ScrollTrigger, useGSAP);

// Looping concept previews, built as real markup. The static markup is the final frame,
// so reduced motion (and no JS) shows the finished state.

const QUESTION =
  "Line 4 catches every error. What happens to a 401 here, and what does the function return after the last attempt?";
const ANSWER = "It retries the 401 three times, then returns undefined.";

function useLoop(build: (tl: gsap.core.Timeline) => void) {
  const scope = useRef<HTMLDivElement>(null);
  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const tl = gsap.timeline({ repeat: -1, repeatDelay: 1.2, paused: true });
        build(tl);
        ScrollTrigger.create({
          trigger: scope.current,
          start: "top bottom",
          end: "bottom top",
          onToggle: (self) => (self.isActive ? tl.play() : tl.pause()),
        });
      });
    },
    { scope },
  );
  return scope;
}

export function InterviewPreview({ compact = false }: { compact?: boolean }) {
  const scope = useLoop((tl) => {
    tl.set([".q", ".a"], { text: "" })
      .set(".verdict", { autoAlpha: 0, y: 8 })
      .fromTo(".hl", { backgroundColor: "rgba(255,91,31,0)" }, { backgroundColor: "rgba(255,91,31,0.18)", duration: 0.5 })
      .to(".q", { text: QUESTION, duration: 2.2, ease: "none" })
      .to(".a", { text: ANSWER, duration: 1.6, ease: "none" }, "+=0.5")
      .to(".verdict", { autoAlpha: 1, y: 0, duration: 0.5, ease: "power3.out" }, "+=0.3")
      .to({}, { duration: 2.5 });
  });

  return (
    <div
      ref={scope}
      className={`w-full overflow-hidden rounded-[20px] border border-bone/10 bg-night text-sm ${compact ? "text-[0.7rem]" : ""}`}
    >
      <div className="flex items-center justify-between border-b border-bone/10 px-5 py-3 font-mono text-xs text-dim">
        <span>src/queue/retry.ts</span>
        <span>Concept preview</span>
      </div>
      <pre className="overflow-x-auto px-5 py-4 font-mono text-[0.78rem] leading-relaxed text-bone/80">
        <code>
          {`1  export async function withRetry(fn, attempts = 3) {
2    for (let i = 0; i < attempts; i++) {
3      try { return await fn(); }
`}
          <span className="hl block bg-signal/20 text-bone">{`4      catch (e) { await sleep(2 ** i * 100); }`}</span>
          {`5    }
6  }`}
        </code>
      </pre>
      <div className="space-y-3 border-t border-bone/10 px-5 py-4">
        <p className="q min-h-[3em] border-l-2 border-signal pl-3 leading-relaxed text-bone">{QUESTION}</p>
        <div className="flex items-center justify-between gap-3 rounded-full border border-bone/15 px-4 py-2.5 text-bone/80">
          <span className="a min-h-[1.25em]">{ANSWER}</span>
          <Microphone size={16} className="shrink-0 text-dim" />
        </div>
        <p className="verdict font-mono text-xs text-signal">Half right: a 401 shouldn&apos;t be retried. Saved to weak spots.</p>
      </div>
    </div>
  );
}

const rows = [
  { item: "Masala dosa", who: "Aarav", amt: 180 },
  { item: "Filter coffee x2", who: "You", amt: 120 },
  { item: "Idli vada", who: "Meera", amt: 140 },
];

export function ReceiptPreview() {
  const scope = useLoop((tl) => {
    const total = { v: 0 };
    const out = scope.current!.querySelector(".share")!;
    tl.set(".chip", { scale: 0, autoAlpha: 0 })
      .set(".pay", { autoAlpha: 0.3 })
      .call(() => (out.textContent = "₹0"))
      .to(".chip", { scale: 1, autoAlpha: 1, duration: 0.35, stagger: 0.6, ease: "back.out(2)" }, "+=0.4")
      .to(total, {
        v: 126,
        duration: 0.9,
        ease: "power2.out",
        onUpdate: () => (out.textContent = `₹${Math.round(total.v)}`),
      })
      .to(".pay", { autoAlpha: 1, duration: 0.3 })
      .to(".pay", { scale: 1.04, duration: 0.25, yoyo: true, repeat: 1 })
      .to({}, { duration: 2.5 });
  });

  return (
    <div ref={scope} className="w-full max-w-[26rem] rounded-[20px] bg-bone p-6 font-mono text-[0.82rem] text-night">
      <div className="flex justify-between text-xs opacity-60">
        <span>Table 4</span>
        <span>Concept preview</span>
      </div>
      <ul className="mt-5 space-y-3">
        {rows.map((r) => (
          <li key={r.item} className="flex items-baseline justify-between gap-4">
            <span>
              {r.item}
              <span
                className={`chip ml-2 inline-block rounded-full px-2 py-0.5 text-[0.7rem] ${r.who === "You" ? "bg-signal text-night" : "bg-night/10"}`}
              >
                {r.who}
              </span>
            </span>
            <span>₹{r.amt}</span>
          </li>
        ))}
      </ul>
      <div className="mt-5 flex justify-between border-t border-dashed border-night/30 pt-4 text-xs opacity-70">
        <span>GST 5%, split by share</span>
        <span>₹22</span>
      </div>
      <div className="mt-4 flex items-center justify-between">
        <span>Your share</span>
        <span className="share text-lg font-semibold">₹126</span>
      </div>
      <div className="pay mt-4 rounded-full bg-night py-3 text-center text-bone">Pay with UPI</div>
    </div>
  );
}
