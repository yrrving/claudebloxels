// Generates the bundled "starter game" (src/data/starterProject.json) used by
// the TrainCells HomeScreen's "Spela ett färdigt spel" entry point.
//
// Why this exists: TrainCells previously only offered a blank canvas
// (empty room, no character, no tile art) as the way in — a nybörjare had to
// draw a figure, draw tiles, build a room and link rooms before anything was
// playable at all. Trainstations own metodik (Handledarskill 5, "Sänkt
// tröskel") describes exactly the fix: a short hook, one click to start, and
// being playable within 2–5 minutes. This script builds that starter content
// once, offline — the app just imports the resulting JSON at runtime through
// the existing importProjectFromJSON() path (see HomeScreen.tsx).
//
// Run: node scripts/generate-starter-project.mjs

import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const ART_SIZE = 13; // matches models/types.ts
const ROOM_SIZE = 13;

// ─── Pixel-art helpers (row/col, 0-indexed, into a flat ART_SIZE*ART_SIZE array) ───

function emptyPixels() {
  return Array(ART_SIZE * ART_SIZE).fill('');
}

function setPx(pixels, row, col, color) {
  if (row < 0 || row >= ART_SIZE || col < 0 || col >= ART_SIZE) return;
  pixels[row * ART_SIZE + col] = color;
}

function rect(pixels, r0, c0, r1, c1, color) {
  for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) setPx(pixels, r, c, color);
}

let idCounter = 0;
function nextId(prefix) {
  idCounter += 1;
  return `${prefix}_${idCounter}`;
}

// ─── Character: a simple round blue figure — easy to recolor as the first
// mikrosteg ("byt figurens färg"), so it's deliberately plain, not fussy ───

const BODY = '#0ea5e9';
const BODY_DARK = '#0369a1';
const EYE_WHITE = '#ffffff';
const EYE_BLACK = '#0f172a';
const HURT_RED = '#ef4444';

function baseBody(pixels) {
  // Rounded-ish 7×7 body with corner-cut for a softer silhouette.
  rect(pixels, 3, 4, 3, 8, BODY);
  rect(pixels, 4, 3, 8, 9, BODY);
  rect(pixels, 9, 4, 9, 8, BODY);
  // Outline shading on the underside for a bit of depth.
  rect(pixels, 8, 3, 8, 9, BODY_DARK);
}

function eyes(pixels, offsetRow = 0) {
  setPx(pixels, 5 + offsetRow, 5, EYE_WHITE);
  setPx(pixels, 5 + offsetRow, 7, EYE_WHITE);
  setPx(pixels, 5 + offsetRow, 5, EYE_BLACK);
  setPx(pixels, 5 + offsetRow, 7, EYE_BLACK);
}

function idleFrame(bob) {
  const p = emptyPixels();
  baseBody(p);
  eyes(p, bob ? 1 : 0);
  // Straight legs.
  rect(p, 10, 4, 12, 5, BODY_DARK);
  rect(p, 10, 7, 12, 8, BODY_DARK);
  return p;
}

function walkFrame(legPhase) {
  const p = emptyPixels();
  baseBody(p);
  eyes(p, 0);
  if (legPhase === 0) {
    rect(p, 10, 3, 12, 4, BODY_DARK); // left leg forward
    rect(p, 10, 8, 11, 9, BODY_DARK); // right leg back
  } else if (legPhase === 1) {
    rect(p, 10, 4, 12, 5, BODY_DARK);
    rect(p, 10, 7, 12, 8, BODY_DARK);
  } else if (legPhase === 2) {
    rect(p, 10, 8, 12, 9, BODY_DARK); // right leg forward
    rect(p, 10, 3, 11, 4, BODY_DARK); // left leg back
  } else {
    rect(p, 10, 4, 12, 5, BODY_DARK);
    rect(p, 10, 7, 12, 8, BODY_DARK);
  }
  return p;
}

function jumpFrame() {
  const p = emptyPixels();
  baseBody(p);
  eyes(p, 0);
  // Arms up, legs tucked.
  rect(p, 4, 1, 5, 2, BODY);
  rect(p, 4, 10, 5, 11, BODY);
  rect(p, 9, 5, 10, 7, BODY_DARK);
  return p;
}

function fallFrame() {
  const p = emptyPixels();
  baseBody(p);
  eyes(p, 0);
  // Legs spread wide, arms down.
  rect(p, 10, 2, 12, 4, BODY_DARK);
  rect(p, 10, 8, 12, 10, BODY_DARK);
  return p;
}

function hurtFrame() {
  const p = emptyPixels();
  rect(p, 3, 4, 3, 8, HURT_RED);
  rect(p, 4, 3, 8, 9, HURT_RED);
  rect(p, 9, 4, 9, 8, HURT_RED);
  rect(p, 8, 3, 8, 9, BODY_DARK);
  // X eyes.
  setPx(p, 5, 5, EYE_BLACK);
  setPx(p, 5, 7, EYE_BLACK);
  rect(p, 10, 4, 12, 5, BODY_DARK);
  rect(p, 10, 7, 12, 8, BODY_DARK);
  return p;
}

function frame(pixels) {
  return { id: nextId('frame'), pixels };
}

const playerCharacter = {
  id: nextId('char'),
  animations: {
    idle: { name: 'idle', fps: 4, frames: [frame(idleFrame(false)), frame(idleFrame(true))] },
    walk: {
      name: 'walk',
      fps: 8,
      frames: [walkFrame(0), walkFrame(1), walkFrame(2), walkFrame(3)].map(frame),
    },
    jump: { name: 'jump', fps: 6, frames: [frame(jumpFrame())] },
    fall: { name: 'fall', fps: 6, frames: [frame(fallFrame())] },
    hurt: { name: 'hurt', fps: 8, frames: [frame(hurtFrame())] },
  },
};

// ─── Tile art: terrain, collectible, enemy, story (goal) ───
// Deliberately only 4 of the 8 block types — hazard/liquid/action/powerup are
// left for the besökare to discover later, not thrown at them on arrival.

function terrainTile() {
  const p = emptyPixels();
  rect(p, 0, 0, 12, 12, '#78350f'); // dirt
  rect(p, 0, 0, 2, 12, '#22c55e'); // grass top
  rect(p, 2, 0, 2, 12, '#16a34a'); // grass edge shade
  return p;
}

function collectibleTile() {
  const p = emptyPixels();
  // Simple 5-point-ish star silhouette, blocky.
  rect(p, 2, 6, 2, 6, '#fde047');
  rect(p, 3, 5, 3, 7, '#fde047');
  rect(p, 4, 4, 4, 8, '#fde047');
  rect(p, 5, 3, 6, 9, '#eab308');
  rect(p, 7, 4, 7, 8, '#eab308');
  rect(p, 8, 3, 8, 9, '#fde047');
  rect(p, 9, 4, 9, 5, '#fde047');
  rect(p, 9, 7, 9, 8, '#fde047');
  return p;
}

function enemyTile() {
  const p = emptyPixels();
  rect(p, 3, 2, 9, 10, '#a855f7');
  rect(p, 9, 3, 10, 4, '#7e22ce');
  rect(p, 9, 8, 10, 9, '#7e22ce');
  // Angry eyes.
  rect(p, 5, 4, 6, 5, '#ffffff');
  rect(p, 5, 7, 6, 8, '#ffffff');
  setPx(p, 6, 5, '#000000');
  setPx(p, 6, 7, '#000000');
  rect(p, 8, 4, 8, 8, '#5b21b6');
  return p;
}

function storyTile() {
  const p = emptyPixels();
  // Flag on a pole — reads clearly as "goal".
  rect(p, 1, 6, 12, 6, '#78350f'); // pole
  rect(p, 1, 7, 5, 11, '#f97316'); // flag
  rect(p, 1, 7, 1, 11, '#fb923c');
  return p;
}

const tileArts = [
  { id: nextId('tile'), name: 'Gräsmark', blockTypeId: 'terrain', pixels: terrainTile(), createdAt: Date.now() },
  { id: nextId('tile'), name: 'Stjärna', blockTypeId: 'collectible', pixels: collectibleTile(), createdAt: Date.now() },
  { id: nextId('tile'), name: 'Vakt', blockTypeId: 'enemy', pixels: enemyTile(), createdAt: Date.now() },
  { id: nextId('tile'), name: 'Mål', blockTypeId: 'story', pixels: storyTile(), createdAt: Date.now() },
];
const [terrainArt, starArt, enemyArt, goalArt] = tileArts;

// ─── Rooms ───
// Row 11 = ground row everywhere (matches the engine's own default spawn
// convention: spawnCellIndex row 11 stands exactly on a row-11 tile top).
// Both rooms are entirely fall-proof and enemy-free — first exposure is pure
// "walk, jump, collect", zero risk (Trainstations Värde 1: Sedd & trygg).
// An earlier draft placed a patrolling 'enemy' cell in room 2; playtesting
// (headless, but real physics) showed it drifts right into the room's
// entrance and repeatedly hits the besökare with no room to react — the
// opposite of "lagom utmaning". Enemy placement needs an actual playtest
// pass with a person, not guessed coordinates — left out of this draft.
// The 'Vakt' (enemy) tile art still exists in tileArts below so it's ready
// to place once someone has actually tried it.

function makeEmptyCells() {
  return Array(ROOM_SIZE * ROOM_SIZE).fill(null);
}

function idx(row, col) {
  return row * ROOM_SIZE + col;
}

function room1Cells() {
  const cells = makeEmptyCells();
  for (let c = 0; c < ROOM_SIZE; c++) cells[idx(11, c)] = terrainArt.id;
  cells[idx(9, 3)] = starArt.id;
  cells[idx(9, 6)] = starArt.id;
  cells[idx(9, 9)] = starArt.id;
  return cells;
}

function room2Cells() {
  const cells = makeEmptyCells();
  // NOTE (see WORKLOG / conversation): continuous ground across a room's
  // entry edge currently trips a pre-existing resolveSolids collision bug
  // on room transition — reproducible with plain full-width ground (this
  // version) and with a 1-tile entry gap alike, so it isn't a content-side
  // fix. Left as the natural, obviously-correct design; blocked on an
  // engine fix before room 2 is reachable without a bug.
  for (let c = 0; c < ROOM_SIZE; c++) cells[idx(11, c)] = terrainArt.id;
  // A small raised platform in the middle, reachable with one jump.
  cells[idx(8, 6)] = terrainArt.id;
  cells[idx(8, 7)] = terrainArt.id;
  cells[idx(8, 8)] = terrainArt.id;
  cells[idx(7, 7)] = goalArt.id; // goal sits on the platform
  cells[idx(9, 10)] = starArt.id;
  return cells;
}

const room1Id = nextId('room');
const room2Id = nextId('room');

const worldMap = {
  rooms: {
    [room1Id]: { id: room1Id, name: 'Start', cells: room1Cells() },
    [room2Id]: { id: room2Id, name: 'Mål', cells: room2Cells() },
  },
  grid: [
    [null, null, null, null, null],
    [null, null, null, null, null],
    [null, room1Id, room2Id, null, null],
    [null, null, null, null, null],
    [null, null, null, null, null],
  ],
  gridRows: 5,
  gridCols: 5,
  startRoomId: room1Id,
  spawnCellIndex: idx(11, 1),
};

const project = {
  id: 'starter-project', // replaced with a fresh id on import, see HomeScreen.tsx
  name: 'Mitt första spel',
  gameType: 'platformer',
  tileArts,
  worldMap,
  playerCharacter,
  backgroundColor: '#7dd3fc',
  moveSpeed: 1.0,
  createdAt: 0,
  updatedAt: 0,
};

const outPath = path.join(__dirname, '..', 'src', 'data', 'starterProject.json');
writeFileSync(outPath, JSON.stringify(project, null, 2) + '\n');
console.log(`Wrote ${outPath}`);
