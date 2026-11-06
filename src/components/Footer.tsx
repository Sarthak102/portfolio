"use client";

import { useEffect, useState } from "react";
import {
  Check,
  Copy,
  DownloadSimple,
  GithubLogo,
  LinkedinLogo,
} from "@phosphor-icons/react";
import { ArrowSwap } from "@/components/ArrowSwap";
import { Logo } from "@/components/Logo";
import { StatusPill } from "@/components/StatusPill";
import { Asterisk } from "@/components/Asterisk";
import { FooterPip } from "@/components/FooterPip";
import { site } from "@/data/site";

type CopyState = "idle" | "copied" | "failed";

function CopyEmail() {
  const [state, setState] = useState<CopyState>("idle");

  useEffect(() => {
    if (state === "idle") return;
    const t = setTimeout(() => setState("idle"), 2200);
    return () => clearTimeout(t);
  }, [state]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(site.email);
      setState("copied");
    } catch {
      setState("failed");
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      aria-live="polite"
      className="inline-flex items-center gap-2 rounded-full bg-night px-5 py-2.5 text-sm text-bone transition hover:bg-night/80 active:scale-[0.98]"
    >
      {state === "copied" ? <Check size={16} /> : <Copy size={16} />}
      {state === "idle" && "Copy"}
      {state === "copied" && "Copied"}
      {state === "failed" && "Couldn't copy, select the address"}
    </button>
  );
}

function LocalTime() {
  const [time, setTime] = useState<string | null>(null);

  useEffect(() => {
    const fmt = new Intl.DateTimeFormat("en-IN", {
      timeZone: "Asia/Kolkata",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    const update = () => setTime(fmt.format(new Date()));
    update();
    const id = setInterval(update, 15_000);
    return () => clearInterval(id);
  }, []);

  return <span suppressHydrationWarning>{time ? `Mumbai ${time} IST` : "Mumbai"}</span>;
}

const icon = "rounded-full p-2.5 transition hover:bg-night/10";

// The download half of the Resume button: the arrow drops into the tray, a check pops in and a
// line fills underneath, then it resets.
function DownloadResume() {
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!done) return;
    const t = setTimeout(() => setDone(false), 1800);
    return () => clearTimeout(t);
  }, [done]);

  return (
    <a
      href={site.resume}
      download
      onClick={() => setDone(true)}
      aria-label={done ? "Resume downloading" : "Download resume"}
      className="group relative overflow-hidden border-l border-night/30 px-3 py-2 hover:bg-night/10"
    >
      <span className="relative block size-4 overflow-hidden">
        <DownloadSimple
          size={16}
          className={`absolute inset-0 transition duration-300 ease-in ${done ? "translate-y-full opacity-0" : "group-hover:translate-y-0.5"}`}
        />
        <Check
          size={16}
          weight="bold"
          className={`absolute inset-0 transition duration-300 ease-out ${done ? "scale-100 opacity-100 delay-200" : "scale-0 opacity-0"}`}
        />
      </span>
      <span
        aria-hidden
        className={`absolute inset-x-0 bottom-0 h-[2px] origin-left bg-night transition-transform ${done ? "scale-x-100 duration-700" : "scale-x-0 duration-200"}`}
      />
    </a>
  );
}

export function Footer() {
  return (
    // Reveal: the footer sits pinned behind the page (and under its curved edge) and is uncovered as the page scrolls away.
    <div
      className="relative -mt-16 h-[calc(var(--fh)+4rem)]"
      style={{ clipPath: "polygon(0% 0, 100% 0%, 100% 100%, 0 100%)" }}
    >
      <div className="relative -top-[100dvh] h-[calc(100dvh+var(--fh)+4rem)]">
        <footer
          className="sticky top-[calc(100dvh-var(--fh))] flex h-[var(--fh)] flex-col justify-end bg-signal px-5 pt-16 pb-8 text-night md:px-10"
        >
          <div aria-hidden className="group absolute top-10 right-5 w-16 md:right-10 md:w-24">
            <Asterisk className="w-full text-night transition duration-700 group-hover:rotate-[60deg]" inner="fill-signal" />
          </div>
          <div>
            <StatusPill tone="dark" />
          </div>
          <p className="condensed mt-5 text-[13vw] leading-[0.82] md:text-[7vw]">Got something to build?</p>

          <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-4">
            <a
              href={`mailto:${site.email}`}
              className="font-display text-[clamp(1.4rem,3.6vw,3rem)] font-semibold tracking-[-0.03em] break-all underline decoration-2 underline-offset-[0.2em] hover:decoration-transparent"
            >
              {site.email}
            </a>
            <CopyEmail />
          </div>

          <div className="relative mt-24 flex flex-wrap items-center justify-between gap-6 border-t border-night/20 pt-6 pr-16 md:pr-14">
            <FooterPip />
            <div className="flex flex-wrap items-center gap-2">
              <Logo className="mr-3 size-8" />
              <a href={site.github} target="_blank" rel="noreferrer" aria-label="GitHub" className={icon}>
                <GithubLogo size={22} />
              </a>
              <a href={site.linkedin} target="_blank" rel="noreferrer" aria-label="LinkedIn" className={icon}>
                <LinkedinLogo size={22} />
              </a>
              <span className="ml-2 inline-flex overflow-hidden rounded-full border border-night/30 text-sm">
                <a
                  href={site.resume}
                  target="_blank"
                  rel="noreferrer"
                  className="group inline-flex items-center gap-1.5 px-4 py-2 hover:bg-night/10"
                >
                  Resume <ArrowSwap size={14} />
                </a>
                <DownloadResume />
              </span>
            </div>
            <p className="text-sm">
              <LocalTime /> <span aria-hidden>·</span> © {new Date().getFullYear()} {site.name}
            </p>
          </div>
        </footer>
      </div>
      {/* The #contact target sits at the very end of the page, not on the sticky footer: a sticky
          element's position shifts while scrolling, so the jump took several clicks to land. */}
      <span id="contact" className="absolute bottom-0" />
    </div>
  );
}
