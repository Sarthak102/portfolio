// Six-arm asterisk. Outlined by default (an inner arm set in the background colour sits on a
// filled one, so overlaps stay clean); add `group-hover` on a parent to fill it.
const arms = [0, 60, 120];

export function Asterisk({ className = "", inner = "fill-night" }: { className?: string; inner?: string }) {
  return (
    <svg viewBox="0 0 100 100" aria-hidden className={className}>
      <g fill="currentColor">
        {arms.map((a) => (
          <rect key={a} x="42" y="4" width="16" height="92" rx="8" transform={`rotate(${a} 50 50)`} />
        ))}
      </g>
      <g className={`${inner} transition-opacity duration-500 group-hover:opacity-0`}>
        {arms.map((a) => (
          <rect key={a} x="43.5" y="5.5" width="13" height="89" rx="6.5" transform={`rotate(${a} 50 50)`} />
        ))}
      </g>
    </svg>
  );
}
