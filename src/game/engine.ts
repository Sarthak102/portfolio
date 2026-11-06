import { LEVELS, ROWS } from "./levels";
import { sfx } from "./sound";
import { CACTUS, PIP, PIP_LEGS } from "./sprites";

// Pip: a pixel platformer. The world is laid out in game pixels (one tile is 10) and drawn
// at a whole-number scale, so art stays crisp while the camera and movement glide smoothly.

export type Input = { left: boolean; right: boolean; jump: boolean };
export type Ui = { cores: number; total: number; time: number; lives: number };
export type Result = { cores: number; total: number; time: number; deaths: number };
export type Events = {
  onUi: (ui: Ui) => void;
  onClear: (r: Result) => void;
  onGameOver: () => void;
  onPortal?: (screenX: number, screenY: number) => void; // where the drop portal sits on screen, once
};

const T = 10;
export const LIVES = 3;
const NIGHT = "#0E0E0D", BONE = "#EDEBE6", SIGNAL = "#FF5B1F", DIM = "#8E8B85", FAINT = "#3A3936";

// Physics, tuned so a jump clears about 4.5 tiles up and 5 across at a run.
const GRAVITY = 1100, CUT_GRAVITY = 2400, JUMP_V = 318, STOMP_V = 230;
const WALK = 80, RUN = 115, RUN_AFTER = 0.7, ACCEL = 700, AIR_ACCEL = 450, FRICTION = 800;
const COYOTE = 0.08, BUFFER = 0.12, STEP = 1 / 120, HURT_GRACE = 1.5, DROP_AT = 0.9;
const SMALL = { w: 8, h: 9 }, BIG = { w: 16, h: 19 };

// Sprites. X = the colour passed in, o = night (cut-out), s = signal, b = bone, . = empty.
// The spark: the power-up. A glowing cube with the asterisk on it, on two little feet.
const SPARK = [
  [".ssssss.", "sssbbsss", "sbbbbbbs", "sssbbsss", "ssbssbss", ".ssssss.", ".s....s."],
  [".ssssss.", "sssbbsss", "sbbbbbbs", "sssbbsss", "ssbssbss", ".ssssss.", "..s..s.."],
];
const WALKER = [
  ["...XXXX...", "..XXXXXX..", ".XXoXXoXX.", "XXXXXXXXXX", "XXXXXXXXXX", ".X.X..X.X."],
  ["...XXXX...", "..XXXXXX..", ".XXoXXoXX.", "XXXXXXXXXX", "XXXXXXXXXX", "..X.XX.X.."],
];
const BIRD = [
  ["X........X", "XX......XX", ".XXX..XXX.", "...XXXX...", "....XX...."],
  ["..........", "...XXXX...", ".XXXXXXXX.", "XX..XX..XX", "X...XX...X"],
];
const CLOUD = ["......XXXX......", "....XX....XX....", "..XX........XXX.", "XX.............X", "XXXXXXXXXXXXXXXX"];

type Body = { x: number; y: number; w: number; h: number; vx: number; vy: number };
type Enemy = { kind: "e" | "b"; x: number; y: number; vx: number; vy: number; baseY: number; active: boolean; dead: number }; // dead: seconds left on screen once hit
type Bit = { x: number; y: number; vx: number; vy: number; life: number; c: string };
type Pop = { x: number; y: number; life: number; text?: string };
type Spark = Body & { rise: number };

const solidCh = (c: string) => c === "#" || c === "B" || c === "?" || c === "M";

// `drop`: a portal opens in the sky and Pip falls out of it (used when he's sent here from the homepage).
export function startLevel(canvas: HTMLCanvasElement, input: Input, index: number, ev: Events, drop = false) {
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("no 2d context");
  const map = LEVELS[index].map.map((r) => r.split(""));
  const COLS = map[0].length;
  const levelW = COLS * T, levelH = ROWS * T;

  // Spawn points and the static list of things the map places.
  let start = { x: 0, y: 0 }, flagX = 0;
  const enemySpawns: { kind: "e" | "b"; x: number; y: number }[] = [];
  const checkpoints: { x: number; y: number; i: number }[] = [];
  let total = 0;
  map.forEach((row, ty) =>
    row.forEach((c, tx) => {
      if (c === "P") start = { x: tx * T + 1, y: ty * T };
      if (c === "F") flagX = tx * T + 4;
      if (c === "K") checkpoints.push({ x: tx * T + 1, y: ty * T, i: checkpoints.length });
      if (c === "e" || c === "b") enemySpawns.push({ kind: c, x: tx * T, y: ty * T });
      if (c === "o" || c === "?") total++;
    }),
  );

  // Everything a death rolls back: collected cores, used blocks, broken bricks (all keyed by tile index).
  let taken = new Set<number>(), cores = 0;
  let saved = { taken: new Set<number>(), cores: 0, at: start, cp: -1 };

  const p = { x: 0, y: 0, vx: 0, vy: 0, ...SMALL, big: false, hurt: 0, grow: 0, ground: false, face: 1, coyote: 0, buffer: 0, hold: 0, walk: 0 };
  let enemies: Enemy[] = [];
  let spark: Spark | null = null;
  let bits: Bit[] = [], pops: Pop[] = [];
  let bump: { tx: number; ty: number; t: number } | null = null;
  let state: "play" | "dead" | "clear" | "over" = "play";
  // Drop intro clock: the portal opens, Pip comes through at DROP_AT, the portal closes. -1 when not dropping.
  let intro = drop ? 0 : -1, portalReported = false;
  const PORTAL = { x: start.x + SMALL.w / 2, y: 24 };
  let stateT = 0, time = 0, deaths = 0, lives = LIVES, camX = 0, prevJump = false, t = 0;
  let W = 0, H = 0, S = 1; // view size in game pixels, and screen pixels per game pixel

  const tileAt = (tx: number, ty: number) => {
    if (tx < 0 || tx >= COLS) return "#"; // level edges are walls
    if (ty < 0 || ty >= ROWS) return ".";
    const c = map[ty][tx];
    if ((c === "B" || c === "o") && taken.has(ty * COLS + tx)) return ".";
    return c;
  };
  const solid = (tx: number, ty: number) => solidCh(tileAt(tx, ty));

  const setSize = (big: boolean) => {
    const to = big ? BIG : SMALL;
    // Grow or shrink around the feet and the middle, so Pip doesn't jump sideways.
    p.x += (p.w - to.w) / 2;
    p.y += p.h - to.h;
    p.w = to.w;
    p.h = to.h;
    p.big = big;
  };

  const spawn = () => {
    taken = new Set(saved.taken);
    cores = saved.cores;
    if (p.big) setSize(false);
    Object.assign(p, { x: saved.at.x, y: saved.at.y + T - p.h, vx: 0, vy: 0, ground: false, face: 1, hold: 0, hurt: 0, grow: 0 });
    enemies = enemySpawns.map((s) => ({
      kind: s.kind,
      x: s.x,
      y: s.kind === "e" ? s.y + T - 6 : s.y + 2,
      vx: s.kind === "e" ? -22 : -40,
      vy: 0,
      baseY: s.y + 2,
      active: false,
      dead: 0,
    }));
    spark = null;
    bits = [];
    pops = [];
    state = "play";
    camX = Math.max(0, p.x - 60);
  };

  const burst = (x: number, y: number, n: number, c: string, speed: number) => {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, v = speed * (0.4 + Math.random() * 0.6);
      bits.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - speed * 0.5, life: 0.6 + Math.random() * 0.4, c });
    }
  };

  const die = () => {
    if (state !== "play") return;
    state = "dead";
    stateT = 0;
    deaths++;
    lives--;
    p.vy = -260;
    p.vx = 0;
    sfx("die");
  };

  // Anything but a pit: big Pip shrinks and blinks for a moment, small Pip loses a life.
  const hurt = () => {
    if (p.hurt > 0 || state !== "play") return;
    if (!p.big) return die();
    setSize(false);
    p.hurt = HURT_GRACE;
    sfx("shrink");
  };

  // Move a body along one axis and stop it at solid tiles. Returns the tile it ran into.
  const moveX = (b: Body, dx: number) => {
    b.x += dx;
    const ty0 = Math.floor(b.y / T), ty1 = Math.floor((b.y + b.h - 0.01) / T);
    const tx = Math.floor((dx > 0 ? b.x + b.w - 0.01 : b.x) / T);
    for (let ty = Math.max(0, ty0); ty <= ty1; ty++) {
      if (!solid(tx, ty)) continue;
      b.x = dx > 0 ? tx * T - b.w : (tx + 1) * T;
      b.vx = 0;
      return true;
    }
    return false;
  };
  const moveY = (b: Body, dy: number) => {
    b.y += dy;
    if (b.y > levelH || dy === 0) return null;
    const tx0 = Math.floor(b.x / T), tx1 = Math.floor((b.x + b.w - 0.01) / T);
    const ty = Math.floor((dy > 0 ? b.y + b.h - 0.01 : b.y) / T);
    // Prefer the tile under the body's centre, so a head bump hits the block you'd expect.
    const mid = Math.floor((b.x + b.w / 2) / T);
    const tx = [mid, tx0, tx1].find((x) => solid(x, ty));
    if (tx === undefined) return null;
    b.y = dy > 0 ? ty * T - b.h : (ty + 1) * T;
    b.vy = 0;
    return { tx, ty };
  };

  const hitBlock = (tx: number, ty: number) => {
    const c = tileAt(tx, ty), i = ty * COLS + tx;
    if ((c === "?" || c === "M") && !taken.has(i)) {
      taken.add(i);
      bump = { tx, ty, t: 0.15 };
      if (c === "M") {
        spark = { x: tx * T + 1, y: ty * T, w: 8, h: 7, vx: 30, vy: 0, rise: 0.5 };
        sfx("power");
      } else {
        cores++;
        pops.push({ x: tx * T + 3, y: ty * T - 4, life: 0.5 });
        sfx("core");
      }
    } else if (c === "B") {
      taken.add(i);
      burst(tx * T + 5, ty * T + 5, 10, BONE, 90);
      sfx("brick");
    } else {
      bump = { tx, ty, t: 0.15 };
      sfx("bump");
    }
    // Knock out anything standing on the block.
    for (const e of enemies)
      if (!e.dead && e.x + 10 > tx * T && e.x < tx * T + T && Math.abs(e.y + 6 - ty * T) < 3) killEnemy(e);
  };

  const killEnemy = (e: Enemy) => {
    e.dead = 0.35;
    burst(e.x + 5, e.y + 3, 6, BONE, 60);
    sfx("stomp");
  };

  const overlaps = (ax: number, ay: number, aw: number, ah: number) =>
    p.x < ax + aw && p.x + p.w > ax && p.y < ay + ah && p.y + p.h > ay;

  // Things that animate even while Pip is down or celebrating.
  const updateFx = (dt: number) => {
    t += dt;
    for (const b of bits) {
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.vy += 500 * dt;
      b.life -= dt;
    }
    bits = bits.filter((b) => b.life > 0);
    for (const o of pops) {
      o.y -= 30 * dt;
      o.life -= dt;
    }
    pops = pops.filter((o) => o.life > 0);
    if (bump && (bump.t -= dt) <= 0) bump = null;
  };

  const update = (dt: number) => {
    updateFx(dt);
    if (intro >= 0) {
      intro += dt;
      if (Math.random() < dt * 25) burst(PORTAL.x, PORTAL.y, 1, SIGNAL, 40);
      if (intro < DROP_AT) return; // Pip hasn't come through yet
      if (intro - dt < DROP_AT) Object.assign(p, { x: PORTAL.x - p.w / 2, y: PORTAL.y, vy: 0 });
      if (intro > 2.2) intro = -1;
    }
    if (state === "over") return;
    if (state === "dead") {
      stateT += dt;
      p.vy += GRAVITY * dt;
      p.y += p.vy * dt;
      if (stateT > 1.1) {
        if (lives > 0) spawn();
        else {
          state = "over";
          sfx("gameover");
          ev.onGameOver();
        }
      }
      return;
    }
    if (state === "clear") {
      stateT += dt;
      p.walk += dt;
      if (stateT > 0.2 && stateT < 1.2 && Math.random() < dt * 20) burst(flagX + 4, (ROWS - 10) * T, 3, SIGNAL, 70);
      return;
    }
    time += dt;
    p.hurt = Math.max(0, p.hurt - dt);
    p.grow = Math.max(0, p.grow - dt);

    // Horizontal: ramp to a run after holding one direction for a moment (no run button needed on phones).
    const dir = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    if (dir && dir === Math.sign(p.vx || dir)) p.hold += dt;
    else p.hold = 0;
    const max = p.hold > RUN_AFTER ? RUN : WALK;
    if (dir) {
      p.face = dir;
      p.vx += dir * (p.ground ? ACCEL : AIR_ACCEL) * dt;
      if (Math.abs(p.vx) > max) p.vx = Math.sign(p.vx) * Math.max(max, Math.abs(p.vx) - FRICTION * dt);
    } else {
      const f = (p.ground ? FRICTION : FRICTION * 0.4) * dt;
      p.vx = Math.abs(p.vx) <= f ? 0 : p.vx - Math.sign(p.vx) * f;
    }

    // Jump with coyote time and a press buffer, and a shorter hop if you let go early.
    if (input.jump && !prevJump) p.buffer = BUFFER;
    prevJump = input.jump;
    p.coyote = p.ground ? COYOTE : p.coyote - dt;
    p.buffer -= dt;
    if (p.buffer > 0 && p.coyote > 0) {
      p.vy = -JUMP_V;
      p.buffer = 0;
      p.coyote = 0;
      p.ground = false;
      sfx("jump");
    }
    p.vy += (p.vy < 0 && !input.jump ? CUT_GRAVITY : GRAVITY) * dt;
    p.vy = Math.min(p.vy, 400);

    const wasGround = p.ground, fallV = p.vy;
    p.ground = false;
    const prevBottom = p.y + p.h;
    moveX(p, p.vx * dt);
    const hit = moveY(p, p.vy * dt);
    if (hit && fallV > 0) {
      p.ground = true;
      if (!wasGround && fallV > 200) burst(p.x + p.w / 2, p.y + p.h, 4, DIM, 40);
    } else if (hit) hitBlock(hit.tx, hit.ty);
    if (p.ground && p.vx !== 0) p.walk += (dt * Math.abs(p.vx)) / 40;
    if (p.y > levelH + 10) return die();

    // Things you touch: cores, cacti, checkpoints, the flag.
    const tx0 = Math.floor(p.x / T), tx1 = Math.floor((p.x + p.w - 0.01) / T);
    const ty0 = Math.floor(p.y / T), ty1 = Math.floor((p.y + p.h - 0.01) / T);
    for (let ty = ty0; ty <= ty1; ty++)
      for (let tx = tx0; tx <= tx1; tx++) {
        const c = tileAt(tx, ty);
        if (c === "o" && overlaps(tx * T + 3, ty * T + 3, 4, 4)) {
          taken.add(ty * COLS + tx);
          cores++;
          burst(tx * T + 5, ty * T + 5, 5, SIGNAL, 50);
          sfx("core");
        }
        if (c === "C" && overlaps(tx * T + 2, ty * T + 1, 6, 9)) hurt();
      }
    if (state !== "play") return;
    for (const k of checkpoints)
      if (k.i > saved.cp && p.x + p.w > k.x + 3) {
        saved = { taken: new Set(taken), cores, at: k, cp: k.i };
        burst(k.x + 4, k.y - 10, 8, SIGNAL, 60);
        sfx("checkpoint");
      }
    if (p.x + p.w > flagX) {
      state = "clear";
      stateT = 0;
      p.vx = 0;
      sfx("flag");
      ev.onClear({ cores, total, time, deaths });
      return;
    }

    // The spark rises out of its block, then wanders off like it has somewhere to be.
    if (spark) {
      const s = spark;
      if (s.rise > 0) {
        s.rise -= dt;
        s.y -= (T / 0.5) * dt;
      } else {
        s.vy = Math.min(s.vy + GRAVITY * dt, 400);
        const v = s.vx;
        if (moveX(s, s.vx * dt)) s.vx = -v;
        moveY(s, s.vy * dt);
        if (s.y > levelH) spark = null;
      }
      if (spark && s.rise <= 0.25 && overlaps(s.x, s.y, s.w, s.h)) {
        spark = null;
        if (p.big) {
          lives++;
          pops.push({ x: p.x - 2, y: p.y - 6, life: 0.9, text: "+1" });
          sfx("life");
        } else {
          setSize(true);
          p.grow = 0.6;
          sfx("power");
        }
        burst(p.x + p.w / 2, p.y + p.h / 2, 12, SIGNAL, 80);
      }
    }

    // Enemies wake up just before they scroll into view.
    for (const e of enemies) {
      if (e.dead) continue;
      if (!e.active) e.active = e.x < camX + W + 20;
      if (!e.active) continue;
      if (e.kind === "b") {
        e.x += e.vx * dt;
        e.y = e.baseY + Math.round(Math.sin(t * 4 + e.baseY) * 2);
      } else {
        e.vy = Math.min(e.vy + GRAVITY * dt, 400);
        e.y += e.vy * dt;
        const below = Math.floor((e.y + 6) / T);
        if (solid(Math.floor((e.x + 1) / T), below) || solid(Math.floor((e.x + 9) / T), below)) {
          e.y = below * T - 6;
          e.vy = 0;
          // Turn around at walls and at ledges.
          const ahead = Math.floor((e.vx > 0 ? e.x + 10 + 0.5 : e.x - 0.5) / T);
          const row = Math.floor((e.y + 3) / T);
          if (solid(ahead, row) || !solid(ahead, below)) e.vx = -e.vx;
        }
        e.x += e.vx * dt;
        if (e.y > levelH) e.dead = 0.001;
      }
      const h = e.kind === "e" ? 6 : 5;
      if (!overlaps(e.x + 1, e.y, 8, h)) continue;
      if (p.vy > 0 && prevBottom <= e.y + 3) {
        killEnemy(e);
        p.vy = input.jump ? -JUMP_V : -STOMP_V;
      } else hurt();
      if (state !== "play") return;
    }
    enemies = enemies.filter((e) => !e.dead || (e.dead -= dt) > 0); // dead ones show squashed briefly, then go
  };

  // ---------- drawing ----------
  const snap = (v: number) => Math.round(v * S) / S;

  const sprite = (rows: string[], x: number, y: number, color: string, flip = false, px = 1) => {
    const w = rows[0].length;
    x = snap(x);
    y = snap(y);
    rows.forEach((r, ry) => {
      for (let rx = 0; rx < w; rx++) {
        const c = r[flip ? w - 1 - rx : rx];
        if (c === ".") continue;
        ctx.fillStyle = c === "o" ? NIGHT : c === "s" ? SIGNAL : c === "b" ? BONE : color;
        ctx.fillRect(x + rx * px, y + ry * px, px, px);
      }
    });
  };

  // Seeded scatter so pebbles and stars stay put frame to frame.
  const hash = (n: number) => {
    n = (n ^ 61) ^ (n >>> 16);
    n = Math.imul(n, 0x27d4eb2d);
    return ((n ^ (n >>> 15)) >>> 0) / 4294967296;
  };

  const drawTile = (c: string, tx: number, ty: number, x: number, y: number) => {
    const i = ty * COLS + tx;
    if (bump && bump.tx === tx && bump.ty === ty) y -= 2;
    if (c === "#") {
      ctx.fillStyle = BONE;
      if (tileAt(tx, ty - 1) !== "#") ctx.fillRect(x, y, T, 1);
      ctx.fillStyle = FAINT;
      if (tileAt(tx - 1, ty) !== "#" && tx > 0) ctx.fillRect(x, y, 1, T);
      if (tileAt(tx + 1, ty) !== "#" && tx < COLS - 1) ctx.fillRect(x + T - 1, y, 1, T);
      // Dino-style pebbles under the ground line.
      ctx.fillStyle = DIM;
      for (let k = 0; k < 2; k++) {
        const r = hash(i * 7 + k);
        if (r < 0.55) ctx.fillRect(x + Math.floor(hash(i * 13 + k) * 9), y + 2 + Math.floor(r * 14), r < 0.2 ? 2 : 1, 1);
      }
    } else if (c === "B") {
      ctx.fillStyle = BONE;
      ctx.fillRect(x, y, T, 1);
      ctx.fillRect(x, y + T - 1, T, 1);
      ctx.fillRect(x, y, 1, T);
      ctx.fillRect(x + T - 1, y, 1, T);
      ctx.fillStyle = FAINT;
      ctx.fillRect(x + 1, y + 5, T - 2, 1);
      ctx.fillRect(x + 4, y + 1, 1, 4);
      ctx.fillRect(x + 7, y + 6, 1, 3);
    } else if (c === "?" || c === "M") {
      if (taken.has(i)) {
        ctx.fillStyle = FAINT;
        ctx.fillRect(x, y, T, 1);
        ctx.fillRect(x, y + T - 1, T, 1);
        ctx.fillRect(x, y, 1, T);
        ctx.fillRect(x + T - 1, y, 1, T);
      } else {
        // The spark block looks like any other: that's the surprise.
        ctx.fillStyle = SIGNAL;
        ctx.fillRect(x, y, T, T);
        ctx.fillStyle = Math.floor(t * 2) % 2 ? NIGHT : "#5A230D";
        ctx.fillRect(x + 4, y + 2, 2, 6);
        ctx.fillRect(x + 2, y + 4, 6, 2);
      }
    } else if (c === "o") {
      const bob = Math.round(Math.sin(t * 5 + tx) * 1);
      ctx.fillStyle = SIGNAL;
      ctx.fillRect(x + 3, y + 3 + bob, 4, 4);
      ctx.fillStyle = BONE;
      ctx.fillRect(x + 4, y + 4 + bob, 1, 1);
    } else if (c === "C") {
      sprite(CACTUS, x, y, BONE);
    } else if (c === "K") {
      const k = checkpoints.find((q) => q.x === tx * T + 1);
      const lit = k && k.i <= saved.cp;
      ctx.fillStyle = DIM;
      ctx.fillRect(x + 4, y - 10, 1, 20);
      ctx.fillStyle = lit ? SIGNAL : FAINT;
      ctx.fillRect(x + 5, y - 10, 5, 3);
    } else if (c === "F") {
      ctx.fillStyle = BONE;
      ctx.fillRect(x + 4, y - 70, 1, 80);
      ctx.fillRect(x + 2, y + 8, 5, 2);
      const fy = state === "clear" ? y - 70 + Math.max(0, 60 - stateT * 90) : y - 10;
      ctx.fillStyle = SIGNAL;
      ctx.fillRect(x + 5, fy, 8, 6);
      ctx.fillStyle = NIGHT;
      ctx.fillRect(x + 8, fy + 1, 2, 4);
      ctx.fillRect(x + 7, fy + 2, 4, 2);
    }
  };

  const render = () => {
    const offY = Math.round((H - levelH) * (H > W ? 0.45 : 1)); // level sits at the bottom, or mid-screen on a tall phone
    ctx.setTransform(S, 0, 0, S, 0, 0);
    ctx.fillStyle = NIGHT;
    ctx.fillRect(0, 0, W, H);

    // Far layers: stars and a big faint asterisk moon, then clouds.
    ctx.fillStyle = FAINT;
    for (let s = 0; s < 60; s++) {
      const span = W + 400;
      const sx = (((hash(s * 3) * span - camX * 0.1) % span) + span) % span;
      ctx.fillRect(snap(sx), Math.floor(hash(s * 5 + 1) * (offY + 70)), 1, 1);
    }
    const mx = snap(W * 0.78 - camX * 0.04), my = Math.max(8, offY + 12);
    ctx.fillStyle = "#26251F";
    ctx.fillRect(mx - 2, my - 9, 4, 18);
    ctx.fillRect(mx - 9, my - 2, 18, 4);
    ctx.fillStyle = "#3D2416";
    ctx.fillRect(mx - 2, my - 2, 4, 4);
    for (let c = 0; c < 8; c++) {
      const span = W + 120;
      const cx = (((c * 90 + 30 - camX * 0.3) % span) + span) % span - 60;
      sprite(CLOUD, cx, offY + 14 + Math.floor(hash(c + 99) * 30), "#2A2926");
    }

    const cam = snap(camX);
    ctx.translate(-cam, offY); // in game pixels: the scale is already applied
    const c0 = Math.max(0, Math.floor(cam / T) - 1), c1 = Math.min(COLS - 1, Math.ceil((cam + W) / T) + 1);
    for (let ty = 0; ty < ROWS; ty++)
      for (let tx = c0; tx <= c1; tx++) {
        const c = tileAt(tx, ty);
        if (c !== "." && c !== "P" && c !== "e" && c !== "b") drawTile(c, tx, ty, tx * T, ty * T);
      }
    for (const o of pops) {
      if (o.text) {
        ctx.fillStyle = SIGNAL;
        ctx.font = "bold 6px monospace";
        ctx.fillText(o.text, snap(o.x), snap(o.y));
      } else {
        ctx.fillStyle = SIGNAL;
        ctx.fillRect(snap(o.x), snap(o.y), 4, 4);
      }
    }
    if (spark) sprite(SPARK[Math.floor(t * 6) % 2], spark.x, spark.y, SIGNAL);
    // Blocks draw over the spark while it's still climbing out.
    if (spark && spark.rise > 0) {
      const tx = Math.floor((spark.x + 4) / T), ty = Math.floor((spark.y + spark.h) / T);
      drawTile(tileAt(tx, ty), tx, ty, tx * T, ty * T);
    }
    for (const e of enemies) {
      const f = Math.floor(t * 6) % 2;
      if (e.dead) {
        ctx.fillStyle = DIM;
        ctx.fillRect(snap(e.x), snap(e.y) + 4, 10, 2); // squashed
      } else if (e.kind === "e") sprite(WALKER[f], e.x, e.y, BONE, e.vx > 0);
      else sprite(BIRD[f], e.x, e.y, BONE);
    }

    // The drop portal: a pixel ellipse that opens, holds while Pip comes through, then closes.
    if (intro >= 0) {
      const k = Math.min(1, intro / 0.6, Math.max(0, (2.2 - intro) / 0.6));
      const rx = 11 * k, ry = 4 * k;
      for (let dy = -Math.ceil(ry); dy <= Math.ceil(ry); dy++) {
        const outer = rx * Math.sqrt(Math.max(0, 1 - (dy / ry) ** 2));
        const inner = (rx - 2) * Math.sqrt(Math.max(0, 1 - (dy / Math.max(0.1, ry - 1)) ** 2));
        ctx.fillStyle = SIGNAL;
        ctx.fillRect(Math.round(PORTAL.x - outer), PORTAL.y + dy, Math.round(outer * 2), 1);
        ctx.fillStyle = NIGHT;
        if (inner > 0) ctx.fillRect(Math.round(PORTAL.x - inner), PORTAL.y + dy, Math.round(inner * 2), 1);
      }
      if (!portalReported && ev.onPortal) {
        portalReported = true;
        const r = canvas.getBoundingClientRect();
        ev.onPortal(r.left + ((PORTAL.x - camX) * r.width) / W, r.top + ((PORTAL.y + offY) * r.height) / H);
      }
    }

    // Pip: legs cycle while running, tucked in the air, upside down when out, blinking after a hit.
    const blink = (p.hurt > 0 && Math.floor(t * 20) % 2 === 0) || (intro >= 0 && intro < DROP_AT);
    if (!blink) {
      const legs = !p.ground && state === "play" ? PIP_LEGS.air : Math.abs(p.vx) > 5 || state === "clear" ? (Math.floor(p.walk * 3) % 2 ? PIP_LEGS.a : PIP_LEGS.b) : PIP_LEGS.stand;
      const rows = [...PIP, legs];
      // While growing, flick between sizes like an old console.
      const big = p.big && !(p.grow > 0 && Math.floor(p.grow * 14) % 2 === 0);
      const px = big ? 2 : 1;
      const sw = rows[0].length * px, sh = rows.length * px;
      const drawn = state === "dead" || state === "over" ? [...rows].reverse() : rows;
      sprite(drawn, p.x + p.w / 2 - sw / 2, p.y + p.h - sh, SIGNAL, p.face < 0, px);
    }

    for (const b of bits) {
      ctx.fillStyle = b.c;
      ctx.fillRect(snap(b.x), snap(b.y), 1, 1);
    }
  };

  // ---------- loop ----------
  const resize = () => {
    const vw = window.innerWidth, vh = Math.max(1, window.innerHeight);
    const aspect = vw / vh;
    W = Math.round(130 * aspect);
    H = 130;
    if (W < 180) {
      W = 180;
      H = Math.round(180 / aspect);
    }
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    S = Math.max(1, Math.round((vh * dpr) / H));
    canvas.width = W * S;
    canvas.height = H * S;
  };

  let lastUi = "";
  const pushUi = () => {
    const ui = { cores, total, time: Math.floor(time), lives };
    const key = JSON.stringify(ui);
    if (key !== lastUi) {
      lastUi = key;
      ev.onUi(ui);
    }
  };

  let raf = 0, last = performance.now();
  const frame = (now: number) => {
    raf = requestAnimationFrame(frame);
    // Clamp both ways: a background tab must not teleport anything, and the first frame can stamp slightly
    // before start, which made time negative and sprite frame indexes -1.
    const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
    last = now;
    // Small fixed-size physics steps: the same feel at 60, 120 or 144 Hz.
    const n = Math.max(1, Math.ceil(dt / STEP));
    for (let k = 0; k < n; k++) update(dt / n);
    const target = p.x + p.w / 2 + p.face * 15 - W / 2;
    camX += (target - camX) * (1 - Math.exp(-dt * 5));
    camX = Math.max(0, Math.min(camX, levelW - W));
    render();
    pushUi();
  };

  resize();
  spawn();
  window.addEventListener("resize", resize);
  raf = requestAnimationFrame(frame);
  if (process.env.NODE_ENV === "development")
    Object.assign(window, { __pip: { p, enemies: () => enemies, spark: () => spark, warp: (tx: number) => (p.x = tx * T) } });

  return () => {
    cancelAnimationFrame(raf);
    window.removeEventListener("resize", resize);
  };
}
