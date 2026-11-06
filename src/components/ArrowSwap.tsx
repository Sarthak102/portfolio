import { ArrowLeft, ArrowRight, ArrowUp, ArrowUpRight } from "@phosphor-icons/react";

// An arrow that, on hover of its `group` parent, flies out the way it points and a twin slides in
// from the opposite side. `up-right` for links that leave (Resume), `up` for back-to-top,
// `left` for going back (the game's Portfolio button on the levels page).
const SWAP = {
  up: { Icon: ArrowUp, out: "group-hover:-translate-y-full", from: "translate-y-full" },
  "up-right": { Icon: ArrowUpRight, out: "group-hover:translate-x-full group-hover:-translate-y-full", from: "-translate-x-full translate-y-full" },
  right: { Icon: ArrowRight, out: "group-hover:translate-x-full", from: "-translate-x-full" },
  left: { Icon: ArrowLeft, out: "group-hover:-translate-x-full", from: "translate-x-full" },
};

export function ArrowSwap({ dir = "up-right", size = 12 }: { dir?: keyof typeof SWAP; size?: number }) {
  const { Icon, out, from } = SWAP[dir];
  const motion = "absolute inset-0 transition-transform duration-300 ease-out motion-reduce:transition-none";
  return (
    <span aria-hidden className="relative inline-block shrink-0 overflow-hidden" style={{ width: size, height: size }}>
      <Icon size={size} weight="bold" className={`${motion} ${out}`} />
      <Icon size={size} weight="bold" className={`${motion} ${from} group-hover:translate-x-0 group-hover:translate-y-0`} />
    </span>
  );
}
