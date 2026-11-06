// The game-style "Wanna play?" box. Lives inside a `group` element: it types itself out on hover
// (or while the group has `data-tease`).
// `tail` says where the stepped pixel tail points: up-right (hero asterisk) or down (footer Pip).
// A down tail sits at `--tail` (default the middle), so a box nudged sideways can still point at Pip.
export function WannaPlay({ tail }: { tail: "up" | "down" }) {
  return (
    <span className="relative block border-2 border-bone bg-night px-4 py-3 font-mono text-sm whitespace-nowrap text-bone uppercase shadow-[4px_4px_0_0_var(--color-signal)]">
      <span className="inline-block w-[11ch] overflow-hidden align-bottom group-hover:animate-[type_0.7s_steps(11)_both] group-focus-visible:animate-[type_0.7s_steps(11)_both] group-data-[tease]:animate-[type_0.7s_steps(11)_both]">
        Wanna play?
      </span>
      <span className="ml-2 inline-block animate-[blink_0.8s_steps(1)_infinite] text-signal">▼</span>
      {tail === "up" ? (
        <>
          <span className="absolute -top-[8px] right-6 h-[6px] w-[8px] bg-bone" />
          <span className="absolute -top-[14px] right-3 h-[6px] w-[6px] bg-bone" />
        </>
      ) : (
        <>
          <span className="absolute -bottom-[8px] left-[var(--tail,50%)] h-[6px] w-[10px] -translate-x-1/2 bg-bone" />
          <span className="absolute -bottom-[14px] left-[var(--tail,50%)] h-[6px] w-[4px] -translate-x-1/2 bg-bone" />
        </>
      )}
    </span>
  );
}
