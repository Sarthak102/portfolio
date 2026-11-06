// "Open to work" with a live pulse. tone="dark" is for the orange footer.
export function StatusPill({ tone = "light" }: { tone?: "light" | "dark" }) {
  const dark = tone === "dark";
  return (
    <span
      className={`inline-flex items-center gap-2.5 rounded-full border px-3.5 py-1.5 text-xs font-medium ${
        dark ? "border-night/30 text-night" : "border-bone/20 text-bone"
      }`}
    >
      <span aria-hidden className="relative flex size-2">
        <span className={`absolute inline-flex size-full rounded-full opacity-70 motion-safe:animate-ping ${dark ? "bg-night" : "bg-signal"}`} />
        <span className={`relative inline-flex size-2 rounded-full ${dark ? "bg-night" : "bg-signal"}`} />
      </span>
      Open to work
    </span>
  );
}
