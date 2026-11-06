// Tiny synthesized sound effects and a quiet music loop (Web Audio, no files). Muting is remembered per browser.

export type Sfx = "jump" | "core" | "bump" | "brick" | "stomp" | "power" | "life" | "shrink" | "die" | "checkpoint" | "flag" | "gameover";

const MUTE_KEY = "pip-muted";
let ac: AudioContext | null = null;
let master: GainNode | null = null;
let muted = false;
try {
  muted = typeof localStorage !== "undefined" && localStorage.getItem(MUTE_KEY) === "1";
} catch {
  /* storage blocked: default to sound on */
}

export const isMuted = () => muted;
export function setMuted(m: boolean) {
  muted = m;
  try {
    localStorage.setItem(MUTE_KEY, m ? "1" : "0");
  } catch {
    /* private mode: the choice just isn't kept */
  }
}

// Created on first use, which is always after a click or key press, so browsers allow it.
function audio() {
  if (!ac) {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return null;
    ac = new Ctx();
    master = ac.createGain();
    master.gain.value = 0.5;
    master.connect(ac.destination);
  }
  if (ac.state === "suspended") void ac.resume();
  return ac;
}

function tone(f0: number, f1: number, dur: number, type: OscillatorType = "square", vol = 0.08, at = 0) {
  const a = audio();
  if (!a || !master) return;
  const t = a.currentTime + at;
  const osc = a.createOscillator(), g = a.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(f0, t);
  osc.frequency.exponentialRampToValueAtTime(f1, t + dur);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(g).connect(master);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

function noise(dur: number, vol = 0.12) {
  const a = audio();
  if (!a || !master) return;
  const buf = a.createBuffer(1, Math.floor(a.sampleRate * dur), a.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
  const src = a.createBufferSource(), g = a.createGain();
  src.buffer = buf;
  g.gain.value = vol;
  src.connect(g).connect(master);
  src.start();
}

const notes = (fs: number[], step: number, dur: number, type: OscillatorType = "square", vol = 0.07) =>
  fs.forEach((f, i) => tone(f, f, dur, type, vol, i * step));

export function sfx(name: Sfx) {
  if (muted) return;
  switch (name) {
    case "jump": return tone(260, 560, 0.12, "square", 0.05);
    case "core": return notes([988, 1319], 0.05, 0.1, "square", 0.05);
    case "bump": return tone(150, 90, 0.08, "triangle", 0.2);
    case "brick": noise(0.15); return tone(220, 60, 0.12, "triangle", 0.15);
    case "stomp": return tone(520, 110, 0.12, "square", 0.07);
    case "power": return notes([523, 659, 784, 1047, 1319], 0.06, 0.08);
    case "life": return notes([784, 988, 1175, 1568], 0.07, 0.1);
    case "shrink": return notes([784, 587, 440, 330], 0.06, 0.09, "triangle", 0.12);
    case "die": return tone(620, 80, 0.6, "square", 0.07);
    case "checkpoint": return notes([880, 1175], 0.08, 0.14, "triangle", 0.15);
    case "flag": stopMusic(); return notes([523, 659, 784, 1047, 784, 1047], 0.1, 0.12);
    case "gameover": stopMusic(); return notes([392, 330, 262, 196], 0.22, 0.24, "triangle", 0.15);
  }
}

// ---------- music ----------
// A soft four-chord loop (Am, F, C, G): a triangle bass on the beat and a quiet square arpeggio.
// Notes are scheduled a little ahead on the audio clock, so the timing stays tight.
const BPM = 100, SIXTEENTH = 60 / BPM / 4;
const CHORDS = [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]]; // MIDI notes
const ARP = [0, 1, 2, 1];
const hz = (m: number) => 440 * 2 ** ((m - 69) / 12);
let musicTimer = 0, nextAt = 0, stepI = 0;

function note(f: number, at: number, dur: number, type: OscillatorType, vol: number) {
  if (!ac || !master) return;
  const osc = ac.createOscillator(), g = ac.createGain();
  osc.type = type;
  osc.frequency.value = f;
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(vol, at + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  osc.connect(g).connect(master);
  osc.start(at);
  osc.stop(at + dur + 0.02);
}

function scheduleMusic() {
  if (!ac) return;
  if (nextAt < ac.currentTime) nextAt = ac.currentTime + 0.05; // after a throttled background tab: skip, don't burst
  while (nextAt < ac.currentTime + 0.25) {
    if (!muted) {
      const chord = CHORDS[Math.floor(stepI / 16)], s = stepI % 16;
      if (s % 4 === 0) note(hz(chord[0] - 12), nextAt, SIXTEENTH * 3.5, "triangle", 0.06);
      if (s % 2 === 0) note(hz(chord[ARP[(s / 2) % 4]] + 12), nextAt, SIXTEENTH * 1.5, "square", 0.012);
    }
    nextAt += SIXTEENTH;
    stepI = (stepI + 1) % (16 * CHORDS.length);
  }
}

export function startMusic() {
  const a = audio();
  if (!a || musicTimer) return;
  nextAt = a.currentTime + 0.1;
  stepI = 0;
  musicTimer = window.setInterval(scheduleMusic, 60);
}

export function stopMusic() {
  clearInterval(musicTimer);
  musicTimer = 0;
}
