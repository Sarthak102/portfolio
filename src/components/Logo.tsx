// Asterisk with a pixel core: master symbol from brand/kit/svg/symbol-black.svg (hole via evenodd).
// `outline` draws it as a hairline; give a parent `group` and it fills orange on hover.
export const LOGO_PATH =
  "M108.00,93.36L108.00,36.00A20,20 0 0 1 148.00,36.00L148.00,93.36L197.67,64.68A20,20 0 0 1 217.67,99.32L168.00,128.00L217.67,156.68A20,20 0 0 1 197.67,191.32L148.00,162.64L148.00,220.00A20,20 0 0 1 108.00,220.00L108.00,162.64L58.33,191.32A20,20 0 0 1 38.33,156.68L88.00,128.00L38.33,99.32A20,20 0 0 1 58.33,64.68L108.00,93.36ZM114.00,114.00h28v28h-28Z";

export function Logo({ className = "", outline = false }: { className?: string; outline?: boolean }) {
  return (
    <svg viewBox="0 0 256 256" className={className} aria-hidden>
      {outline ? (
        <path
          fillRule="evenodd"
          d={LOGO_PATH}
          vectorEffect="non-scaling-stroke"
          className="fill-transparent stroke-current [stroke-width:1.5] transition-[fill] duration-700 group-hover:fill-signal group-hover:stroke-signal"
        />
      ) : (
        <path fillRule="evenodd" d={LOGO_PATH} fill="currentColor" />
      )}
    </svg>
  );
}
