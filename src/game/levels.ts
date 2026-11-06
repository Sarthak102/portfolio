// Five hand-built levels. Each is 13 rows tall and built left to right from small chunks.
//
//   .  empty      #  ground / stone    B  brick (breaks from below)    ?  core block
//   o  core       C  cactus (hazard)   e  walker                       b  bird
//   M  spark block (looks like ?, releases the power-up)
//   P  start      K  checkpoint        F  flag (finish)

export const ROWS = 13;

// A chunk lists the rows just above the ground, top to bottom; `on` adds two ground rows under it.
// `floor` replaces the ground with a mask, so "#....#" is a four-tile pit.
function on(rows: string[], floor?: string) {
  const w = Math.max(floor?.length ?? 0, ...rows.map((r) => r.length));
  const f = floor ?? "#".repeat(w);
  return [...rows, f, f].map((r) => r.padEnd(w, "."));
}

function level(...chunks: string[][]) {
  const out: string[] = Array.from({ length: ROWS }, () => "");
  for (const c of chunks) {
    const w = c[0].length;
    const padded = [...Array.from({ length: ROWS - c.length }, () => ".".repeat(w)), ...c];
    padded.forEach((r, i) => (out[i] += r));
  }
  return out;
}

export type Level = { name: string; map: string[] };

export const LEVELS: Level[] = [
  {
    name: "Warm up",
    map: level(
      on(["..P.........."]),
      on(["...o.o.o...", "", "", ""]),
      on(["...C.."]),
      on(["...M.B?B?B...", "", "", ".........e..."]),
      on(["...."]),
      on(["", ".ooo.", "", ""], "#...#"),
      on(["..K..C....."]),
      on(["..e....."]),
      on(["....#.....", "...##.....", "..###....."]),
      on(["....?....", "", "", ""]),
      on(["...e....C....."]),
      on(["......F........."]),
    ),
  },
  {
    name: "Up and over",
    map: level(
      on(["..P......."]),
      on(["...MB?B...", "", "", "......e..."]),
      on(["", "", "", ""], "#....#"),
      on(["....#", "...##", "..###", ".####"]),
      on(["", "", "", ""], "..."),
      on(["#....", "##...", "###..", "####."]),
      on(["....e.....e....K"]),
      on(["..o.o.o..", "..BBBBB..", "", "", "...C....."]),
      on(["", "", "", ""], "##....##"),
      on([".....C.....C......"]),
      on(["...?...?...?...", "", "", "....e.....e...."]),
      on(["", "", "", ""], "#....#"),
      on(["....#..........", "...##..........", "..###..........", ".####..........", "#####......F..."]),
    ),
  },
  {
    name: "Bird season",
    map: level(
      on(["..P........"]),
      on([".....C.C......"]),
      on(["......b......"]),
      on(["...o.o.o...", "..BBMBB....", "", "", ".....e....."]),
      on(["...b..", "", ""]),
      on(["", "", ""], "#....#"),
      on(["....CC..."]),
      on(["..b.........", "", "", "...........b"]),
      on(
        ["......ooo......", "......BBB......", "", "..BBB.....BBB..", "", "", ""],
        "##...........##",
      ),
      on(["..K..e...e......"]),
      on(["......?..?..?.....", "", "", ".......b..........."]),
      on([".....C......C..C...."]),
      on(["....F......"]),
    ),
  },
  {
    name: "Sky blocks",
    map: level(
      on(["....M....", "", "", "..P......"]),
      on(["......ooo......", "", "...BBB....BBB..", "", ""], "##...........##"),
      on([".....e....C...."]),
      on(
        [
          "..........ooo.........",
          "..........BBB.........",
          "......................",
          "......BB......BB......",
          "......................",
          "..BB..............BB..",
          "......................",
          "......................",
        ],
        "#....................#",
      ),
      on(["...K....b....."]),
      on(["...e..C..e......"]),
      on(["", "", "", ""], "#...#"),
      on(["", "", "...#...", "...#..."], "...#..."),
      on(["......?B?B?.....", "", "", "...e......e....."]),
      on(["", "", ""], "#....#"),
      on(["....F......"]),
    ),
  },
  {
    name: "Night shift",
    map: level(
      on(["..P........"]),
      on(["....C...b..CC....."]),
      on(["", "", ""], "#....#"),
      on(["..e..e..e......."]),
      on(["...o.o.o.o...", "...BMB?B?B...", "", "", "......C......"]),
      on(["", "..b...", "", ""], "#.....#"),
      on(["....K......"]),
      on(
        [
          "............ooo.........",
          "............BBB.........",
          "......................b.",
          "......BBB.......BBB.....",
          "........................",
          "..BB................BB..",
          "........................",
          "........................",
        ],
        "#......................#",
      ),
      on(["...e....e....C..."]),
      on(["", "", "...#...#...", "...#...#..."], "...#...#..."),
      on(["....K...."]),
      on(["....CC.....b......CCC....."]),
      on(["...?...?...?...", "", "", "..e...e...e...."]),
      on(["", "", "", ""], "#....#"),
      on(["....#..........", "...##..........", "..###..........", ".####..........", "#####......F..."]),
    ),
  },
];

// Fails loudly if a level is malformed or has a gap with nothing to stand on that's too wide to jump.
// ponytail: checks gap width only, not heights or full reachability; playtest any new level.
export function checkLevels(levels = LEVELS) {
  for (const { name, map } of levels) {
    const w = map[0].length;
    if (map.length !== ROWS || map.some((r) => r.length !== w)) throw new Error(`${name}: ragged map`);
    const all = map.join("");
    for (const ch of "PFM") if (all.split(ch).length !== 2) throw new Error(`${name}: needs exactly one ${ch}`);
    let gap = 0;
    for (let x = 0; x < w; x++) {
      gap = map.some((r) => "#B?M".includes(r[x])) ? 0 : gap + 1;
      if (gap > 5) throw new Error(`${name}: gap at column ${x} is too wide`);
    }
  }
}
