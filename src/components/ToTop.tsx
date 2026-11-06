"use client";

import { useEffect, useState } from "react";
import { ArrowSwap } from "@/components/ArrowSwap";
import { lenis } from "@/components/SmoothScroll";

// Back to the top, bottom-right. Shows up once you're past the hero.
export function ToTop() {
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const onScroll = () => setShown(window.scrollY > window.innerHeight * 0.8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const top = () => (lenis ? lenis.scrollTo(0) : window.scrollTo({ top: 0, behavior: "smooth" }));

  return (
    <button
      type="button"
      onClick={top}
      aria-label="Back to top"
      tabIndex={shown ? 0 : -1}
      className={`group fixed right-5 bottom-5 z-50 flex size-12 items-center justify-center rounded-full bg-night text-bone shadow-[0_0_0_1px_rgba(237,235,230,0.15)] transition duration-300 hover:bg-signal hover:text-night md:right-10 md:bottom-8 ${
        shown ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-4 opacity-0"
      }`}
    >
      <ArrowSwap dir="up" size={18} />
    </button>
  );
}
