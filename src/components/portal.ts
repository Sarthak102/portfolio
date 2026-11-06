// The portal transition, in the loader's pixel language: a full-screen grid of square cells.
// Closing fills cells in from the screen edges toward what you clicked; opening clears them outward
// from where Pip drops in. The moving front burns orange. The veil lives on <body>, so it survives
// the client-side route change between the two.

const ID = "portal-veil";
const NIGHT = "#0E0E0D", SIGNAL = "#FF5B1F";
const CELL = 40; // CSS px, the same scale as the loader's dissolve
const EDGE = 0.03; // width of the orange front, in progress units
const NOISE = 0.14; // how ragged the front is

function veil(closed: boolean) {
  let cv = document.getElementById(ID) as HTMLCanvasElement | null;
  if (!cv) {
    cv = document.createElement("canvas");
    cv.id = ID;
    cv.setAttribute("aria-hidden", "true");
    Object.assign(cv.style, { position: "fixed", inset: "0", width: "100%", height: "100%", zIndex: "200", pointerEvents: "none" });
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = innerWidth * dpr;
    cv.height = innerHeight * dpr;
    const ctx = cv.getContext("2d")!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (closed) {
      ctx.fillStyle = NIGHT;
      ctx.fillRect(0, 0, innerWidth, innerHeight);
    }
    document.body.appendChild(cv);
  }
  return cv;
}

// Each cell's turn: its distance from the point, roughened with noise so the front is pixel-ragged.
// Values run from 0 (at the point) to just under 1 - EDGE (the farthest corner).
function order(x: number, y: number) {
  const cols = Math.ceil(innerWidth / CELL), rows = Math.ceil(innerHeight / CELL);
  const far = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
  const cells = Array.from({ length: cols * rows }, (_, i) => {
    const cx = (i % cols) * CELL + CELL / 2, cy = Math.floor(i / cols) * CELL + CELL / 2;
    return (Math.hypot(cx - x, cy - y) / far) * (1 - NOISE - EDGE) + Math.random() * NOISE;
  });
  return { cols, cells };
}

// Cells beyond the front are night. Closing moves the front inward (1 to 0), opening moves it out.
function run(cv: HTMLCanvasElement, x: number, y: number, ms: number, opening: boolean) {
  const ctx = cv.getContext("2d")!;
  const { cols, cells } = order(x, y);
  return new Promise<void>((done) => {
    const start = performance.now();
    const tick = (now: number) => {
      const k = Math.min(1, (now - start) / ms);
      const e = opening ? 1 - (1 - k) ** 3 : k * k * (3 - 2 * k);
      const front = opening ? e : 1 - e;
      ctx.clearRect(0, 0, innerWidth, innerHeight);
      if (k === 1 && !opening) {
        ctx.fillStyle = NIGHT; // fully shut: no stray cell left open at the point
        ctx.fillRect(0, 0, innerWidth, innerHeight);
        return done();
      }
      for (let i = 0; i < cells.length; i++) {
        const c = cells[i];
        const burning = k < 1 && Math.abs(c - front) < EDGE;
        if (!burning && c <= front) continue;
        ctx.fillStyle = burning ? SIGNAL : NIGHT;
        ctx.fillRect((i % cols) * CELL, Math.floor(i / cols) * CELL, CELL + 0.5, CELL + 0.5);
      }
      if (k < 1) requestAnimationFrame(tick);
      else done();
    };
    requestAnimationFrame(tick);
  });
}

const calm = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export async function closePortal(x: number, y: number) {
  if (calm()) return;
  await run(veil(false), x, y, 1100, false);
}

// Opens from fully closed (making the veil if we arrived without one), then removes it.
export async function openPortal(x: number, y: number) {
  const cv = veil(true);
  if (!calm()) await run(cv, x, y, 1200, true);
  cv.remove();
}

// True while a closed veil is waiting for the next page to open it (e.g. coming back from the game).
export const portalWaiting = () => !!document.getElementById(ID);
