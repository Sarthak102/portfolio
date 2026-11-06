"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CaretLeft, CaretRight, ArrowFatUp, Info, List, SpeakerHigh, SpeakerSlash } from "@phosphor-icons/react";
import { LIVES, startLevel, type Input, type Result, type Ui } from "./engine";
import { LEVELS, checkLevels } from "./levels";
import { PIP } from "./sprites";
import { isMuted, setMuted, startMusic, stopMusic } from "./sound";
import { closePortal, openPortal } from "@/components/portal";
import { ArrowSwap } from "@/components/ArrowSwap";
import { Confetti } from "./Confetti";
import { site } from "@/data/site";

if (process.env.NODE_ENV !== "production") checkLevels();

type Screen =
  | { at: "menu" }
  | { at: "play"; level: number; run: number; drop?: boolean }
  | { at: "clear"; level: number; result: Result }
  | { at: "over"; level: number }
  | { at: "error" };
type Best = { time: number; cores: number };
type Progress = { unlocked: number; best: Record<number, Best> };

const KEY = "pip-progress";
const fresh: Progress = { unlocked: 1, best: {} };

function readProgress(): Progress {
  try {
    const p = JSON.parse(localStorage.getItem(KEY) ?? "null");
    return p && typeof p.unlocked === "number" && p.best ? p : fresh;
  } catch {
    return fresh;
  }
}
function saveProgress(p: Progress) {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    /* private mode: progress just isn't kept */
  }
}

const clock = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

// Pip as a little crisp SVG, built from the same rows the game draws.
function PipIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox={`0 0 ${PIP[0].length} ${PIP.length}`} className={className} shapeRendering="crispEdges" aria-hidden>
      {PIP.flatMap((row, y) =>
        [...row].map((c, x) => (c === "." ? null : <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill={c === "o" ? "#0E0E0D" : "currentColor"} />)),
      )}
    </svg>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex h-7 min-w-7 items-center justify-center rounded-md border border-b-[3px] border-bone/30 bg-bone/5 px-1.5 font-mono text-xs text-bone">
      {children}
    </kbd>
  );
}

function Controls({ touch }: { touch: boolean }) {
  if (touch)
    return (
      <p className="font-mono text-xs text-dim">
        ◀ ▶ buttons to move, the orange button to jump (hold for higher). Sideways works best.
      </p>
    );
  const rows: [React.ReactNode, string][] = [
    [
      <>
        <Kbd>←</Kbd>
        <Kbd>→</Kbd>
        <span className="text-dim">or</span>
        <Kbd>A</Kbd>
        <Kbd>D</Kbd>
      </>,
      "Move",
    ],
    [<Kbd key="s">Space</Kbd>, "Jump, hold for higher"],
    [<Kbd key="e">Esc</Kbd>, "Back to levels"],
    [<Kbd key="m">M</Kbd>, "Sound on / off"],
  ];
  return (
    <dl className="grid w-fit grid-cols-[auto_1fr] items-center gap-x-5 gap-y-2.5 text-sm">
      {rows.map(([keys, what]) => (
        <div key={what} className="contents">
          <dt className="flex items-center gap-1.5">{keys}</dt>
          <dd className="text-bone/80">{what}</dd>
        </div>
      ))}
    </dl>
  );
}

function HoldButton({ label, children, onChange, className = "" }: { label: string; children: React.ReactNode; onChange: (down: boolean) => void; className?: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        onChange(true);
      }}
      onPointerUp={() => onChange(false)}
      onPointerCancel={() => onChange(false)}
      onContextMenu={(e) => e.preventDefault()}
      className={`flex touch-none items-center justify-center rounded-full border border-bone/25 bg-night/50 text-bone backdrop-blur-sm select-none active:bg-bone/15 ${className}`}
    >
      {children}
    </button>
  );
}

const pill = "pointer-events-auto inline-flex items-center gap-2 rounded-full border border-bone/25 bg-night/50 px-4 py-2 text-sm backdrop-blur-sm";

export function PlayClient() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const input = useRef<Input>({ left: false, right: false, jump: false });
  const [screen, setScreen] = useState<Screen>({ at: "menu" });
  const [progress, setProgress] = useState<Progress>(fresh);
  const [ui, setUi] = useState<Ui | null>(null);
  const [touch, setTouch] = useState(false);
  const [muted, setMutedState] = useState(false);
  const [showKeys, setShowKeys] = useState(false);

  useEffect(() => {
    setProgress(readProgress());
    setTouch(window.matchMedia("(pointer: coarse)").matches);
    setMutedState(isMuted());
    // Arriving from the footer (/play#drop): skip the menu and fall straight into level 1.
    if (window.location.hash === "#drop") {
      history.replaceState(null, "", window.location.pathname);
      setScreen({ at: "play", level: 0, run: Date.now(), drop: true });
      setShowKeys(true); // this skips the menu that lists the controls, so show them for a bit
    }
  }, []);

  // The controls card hides itself a few seconds after it's shown (on arrival, or from the i button).
  useEffect(() => {
    if (!showKeys) return;
    const t = setTimeout(() => setShowKeys(false), 5000);
    return () => clearTimeout(t);
  }, [showKeys]);

  // Back to the portfolio through the portal. `replace` swaps the game out of history,
  // so Back from the homepage never lands in it again.
  const router = useRouter();
  const leave = async (e: React.MouseEvent<HTMLButtonElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    await closePortal(r.left + r.width / 2, r.top + r.height / 2);
    router.replace("/");
  };

  const toggleMute = () =>
    setMutedState((m) => {
      setMuted(!m);
      return !m;
    });
  const play = (level: number) => setScreen({ at: "play", level, run: Date.now() });

  // Run the current level.
  const level = screen.at === "play" ? screen.level : -1;
  const run = screen.at === "play" ? screen.run : 0;
  const drop = screen.at === "play" && !!screen.drop;
  useEffect(() => {
    if (level < 0 || !canvas.current) return;
    let timer = 0;
    const onClear = (result: Result) => {
      setProgress((prev) => {
        const old = prev.best[level];
        const next = {
          unlocked: Math.max(prev.unlocked, Math.min(LEVELS.length, level + 2)),
          best: { ...prev.best, [level]: { time: Math.min(old?.time ?? Infinity, result.time), cores: Math.max(old?.cores ?? 0, result.cores) } },
        };
        saveProgress(next);
        return next;
      });
      timer = window.setTimeout(() => setScreen({ at: "clear", level, result }), 1300); // let the flag go up first
    };
    const onGameOver = () => (timer = window.setTimeout(() => setScreen({ at: "over", level }), 400));
    let stop = () => {};
    try {
      stop = startLevel(canvas.current, input.current, level, { onUi: setUi, onClear, onGameOver, onPortal: openPortal }, drop);
      startMusic();
    } catch {
      setScreen({ at: "error" });
    }
    return () => {
      clearTimeout(timer);
      stop();
      stopMusic();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `drop` only matters when a run starts
  }, [level, run]);

  // Keyboard: arrows / A D to move, Space / W / Up to jump, Escape for the level list, M to mute.
  useEffect(() => {
    const i = input.current;
    const set = (e: KeyboardEvent, down: boolean) => {
      const k = e.key.toLowerCase();
      if (k === "arrowleft" || k === "a") i.left = down;
      else if (k === "arrowright" || k === "d") i.right = down;
      else if (k === " " || k === "arrowup" || k === "w") i.jump = down;
      else return;
      e.preventDefault();
    };
    const down = (e: KeyboardEvent) => {
      if (e.key === "Escape") setScreen({ at: "menu" });
      if (e.key.toLowerCase() === "m" && !e.repeat) toggleMute();
      set(e, true);
    };
    const up = (e: KeyboardEvent) => set(e, false);
    const blur = () => Object.assign(i, { left: false, right: false, jump: false });
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", blur);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", blur);
    };
  }, []);

  const i = input.current;
  const playing = screen.at === "play";
  const name = (n: number) => `${n + 1}. ${LEVELS[n].name}`;
  const hire = (
    <div className="mt-8 border-t border-bone/10 pt-6">
      <p className="condensed text-4xl text-signal md:text-5xl">Now you can hire me.</p>
      <p className="mt-2 font-mono text-xs text-dim">{site.email}</p>
      <div className="mt-5 flex flex-wrap justify-center gap-3">
        <a href={`mailto:${site.email}`} className="btn-primary">
          Hire me
        </a>
        <a href={site.resume} className="btn-ghost">
          Resume
        </a>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 overflow-hidden bg-night text-bone select-none">
      <canvas ref={canvas} className="absolute inset-0 size-full [image-rendering:pixelated]" hidden={screen.at === "menu" || screen.at === "error"} />

      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-between gap-4 p-4 md:p-6">
        {playing ? (
          <button type="button" onClick={() => setScreen({ at: "menu" })} className={pill}>
            <List size={14} /> Levels
          </button>
        ) : null}
        {/* Portfolio: an orange pill at the top centre while playing; on the levels and results screens
            it matches the other top-bar buttons and points back. */}
        {playing ? (
          <button
            type="button"
            onClick={leave}
            className="group pointer-events-auto absolute top-16 left-1/2 inline-flex -translate-x-1/2 items-center gap-2 rounded-full bg-signal px-5 py-2 font-mono text-xs tracking-wide text-night uppercase transition hover:bg-bone sm:top-4 md:top-6"
          >
            Portfolio <ArrowSwap dir="up-right" size={12} />
          </button>
        ) : (
          <button type="button" onClick={leave} className={`group ${pill}`}>
            <ArrowSwap dir="left" size={14} /> Portfolio
          </button>
        )}

        <div className="flex items-start gap-2">
          {playing && ui && (
            <div className="flex items-center gap-4 rounded-2xl border border-bone/15 bg-night/50 px-4 py-2 font-mono text-xs backdrop-blur-sm">
              <span className="hidden text-dim sm:inline">{name(screen.level)}</span>
              <span className="flex items-center gap-1" aria-label={`${ui.lives} lives`}>
                {Array.from({ length: Math.max(LIVES, ui.lives) }, (_, n) => (
                  <PipIcon key={n} className={`h-3.5 ${n < ui.lives ? "text-signal" : "text-bone/15"}`} />
                ))}
              </span>
              <span>
                <span className="text-signal">■</span> {ui.cores}/{ui.total}
              </span>
              <span>{clock(ui.time)}</span>
            </div>
          )}
          {playing && (
            <button type="button" onClick={() => setShowKeys(true)} aria-label="Show controls" className={`${pill} px-2.5`}>
              <Info size={16} />
            </button>
          )}
          <button type="button" onClick={toggleMute} aria-label={muted ? "Turn sound on" : "Turn sound off"} className={`${pill} px-2.5`}>
            {muted ? <SpeakerSlash size={16} /> : <SpeakerHigh size={16} />}
          </button>
        </div>
      </div>

      {playing && touch && (
        <>
          <div className="absolute bottom-5 left-5 flex gap-3">
            <HoldButton label="Left" onChange={(d) => (i.left = d)} className="size-16">
              <CaretLeft size={26} weight="bold" />
            </HoldButton>
            <HoldButton label="Right" onChange={(d) => (i.right = d)} className="size-16">
              <CaretRight size={26} weight="bold" />
            </HoldButton>
          </div>
          <HoldButton label="Jump" onChange={(d) => (i.jump = d)} className="absolute right-5 bottom-5 size-20 border-signal bg-signal/80 text-night">
            <ArrowFatUp size={28} weight="fill" />
          </HoldButton>
        </>
      )}

      {playing && (
        <div
          className={`pointer-events-none absolute inset-x-0 top-28 flex justify-center sm:top-20 px-4 transition-opacity duration-700 ${showKeys ? "opacity-100" : "opacity-0"}`}
          aria-hidden={!showKeys}
        >
          <div className="rounded-2xl border border-bone/15 bg-night/70 px-5 py-4 backdrop-blur-sm">
            <Controls touch={touch} />
          </div>
        </div>
      )}

      {screen.at === "menu" && (
        // data-lenis-prevent: the site-wide smooth scroller otherwise swallows the wheel, and this list can't scroll.
        <div data-lenis-prevent className="absolute inset-0 overflow-y-auto">
          <div className="mx-auto flex min-h-full max-w-3xl flex-col justify-center px-6 py-24">
            <div className="flex items-end gap-5">
              <h1 className="condensed text-[22vw] leading-[0.85] md:text-9xl">Pip</h1>
              <PipIcon className="mb-[2vw] h-[12vw] text-signal md:mb-3 md:h-20" />
            </div>
            <p className="mt-4 max-w-md text-bone/80">
              Run, jump and stomp through five pixel levels. Grab the orange cores, find the spark hiding in a block to
              grow, and reach the flag. Three lives a level.
            </p>
            <div className="mt-6">
              <Controls touch={touch} />
            </div>
            <ol className="mt-10 divide-y divide-bone/10 border-y border-bone/10">
              {LEVELS.map((l, n) => {
                const locked = n >= progress.unlocked;
                const best = progress.best[n];
                return (
                  <li key={l.name}>
                    <button
                      type="button"
                      disabled={locked}
                      onClick={() => play(n)}
                      className="group flex w-full items-baseline gap-4 py-4 text-left disabled:cursor-not-allowed disabled:opacity-35"
                    >
                      <span className="font-mono text-xs text-dim">0{n + 1}</span>
                      <span className="condensed text-3xl transition group-enabled:group-hover:text-signal md:text-4xl">{l.name}</span>
                      <span className="ml-auto font-mono text-xs text-dim">
                        {locked ? "Locked" : best ? `${clock(best.time)} · ${best.cores} cores` : "Play"}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </div>
        </div>
      )}

      {screen.at === "clear" && <Confetti key={screen.level} big={screen.level === LEVELS.length - 1} />}
      {screen.at === "clear" && (
        <div data-lenis-prevent className="absolute inset-0 flex items-center justify-center overflow-y-auto bg-night/80 p-6 backdrop-blur-sm">
          <div className="max-w-md text-center">
            <p className="font-mono text-xs text-signal uppercase">{name(screen.level)}</p>
            <h2 className="condensed mt-2 text-7xl leading-[0.9] md:text-8xl">
              {screen.level === LEVELS.length - 1 ? "All five done" : "Cleared"}
            </h2>
            <p className="mt-5 font-mono text-sm text-bone/80">
              {clock(screen.result.time)} · {screen.result.cores}/{screen.result.total} cores · {screen.result.deaths}{" "}
              {screen.result.deaths === 1 ? "fall" : "falls"}
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              {screen.level < LEVELS.length - 1 && (
                <button type="button" onClick={() => play(screen.level + 1)} className="btn-primary">
                  Next level
                </button>
              )}
              <button type="button" onClick={() => play(screen.level)} className="btn-ghost">
                Play again
              </button>
              <button type="button" onClick={() => setScreen({ at: "menu" })} className="btn-ghost">
                Levels
              </button>
            </div>
            {screen.level === LEVELS.length - 1 && hire}
          </div>
        </div>
      )}

      {screen.at === "over" && (
        <div data-lenis-prevent className="absolute inset-0 flex items-center justify-center overflow-y-auto bg-night/85 p-6 backdrop-blur-sm">
          <div className="max-w-md text-center">
            <PipIcon className="mx-auto h-12 rotate-180 text-signal" />
            <p className="mt-5 font-mono text-xs text-signal uppercase">{name(screen.level)} · out of lives</p>
            <h2 className="condensed mt-2 text-7xl leading-[0.9] md:text-8xl">Game over</h2>
            <p className="mt-5 text-bone/80">Pip is out of lives. Good news: the developer who made him never runs out of retries.</p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <button type="button" onClick={() => play(screen.level)} className="btn-ghost">
                Try again
              </button>
              <button type="button" onClick={() => setScreen({ at: "menu" })} className="btn-ghost">
                Levels
              </button>
            </div>
            {hire}
          </div>
        </div>
      )}

      {screen.at === "error" && (
        <div className="absolute inset-0 flex items-center justify-center p-6 text-center text-dim">
          Your browser couldn&apos;t start the game. Try reloading, or open this page in a recent Chrome, Safari or Firefox.
        </div>
      )}
    </div>
  );
}
