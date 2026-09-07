// ─── Block Types ───────────────────────────────────────────────────────────────
export type BlockTypeBehavior =
  | 'terrain'
  | 'hazard'
  | 'collectible'
  | 'liquid'
  | 'enemy'
  | 'action'
  | 'powerup'
  | 'story';

export interface BlockType {
  id: BlockTypeBehavior;
  name: string;
  color: string; // Primary UI color for this block type
  lightColor: string; // Lighter variant for palette
  description: string;
  icon: string; // Emoji icon
}

// ─── Character / Animation ─────────────────────────────────────────────────────
export type AnimationName = 'idle' | 'walk' | 'jump' | 'fall' | 'hurt';

export interface AnimationFrame {
  id: string;
  pixels: string[]; // ART_SIZE * ART_SIZE colors
}

export interface CharacterAnimation {
  name: AnimationName;
  frames: AnimationFrame[];
  fps: number;
}

export interface CharacterDefinition {
  id: string;
  animations: Record<AnimationName, CharacterAnimation>;
}

// ─── Tile Art ──────────────────────────────────────────────────────────────────
export const ART_SIZE = 13; // 13×13 pixel art grid (Bloxels standard)
export const ROOM_SIZE = 13; // 13×13 tiles per room

export interface TileArt {
  id: string;
  name: string;
  blockTypeId: BlockTypeBehavior;
  pixels: string[]; // ART_SIZE*ART_SIZE colors (hex or '') for each pixel
  createdAt: number;
}

// ─── World / Rooms ─────────────────────────────────────────────────────────────
export interface Room {
  id: string;
  name: string;
  cells: (string | null)[]; // ROOM_SIZE*ROOM_SIZE: TileArt id or null
}

export interface WorldMapLayout {
  rooms: Record<string, Room>;
  // 2D map grid: layout[row][col] = roomId or null
  grid: (string | null)[][];
  gridRows: number;
  gridCols: number;
  startRoomId: string | null;
  spawnCellIndex: number; // Which cell in start room is spawn (use story/checkpt tile)
}

// ─── Project ───────────────────────────────────────────────────────────────────
export interface Project {
  id: string;
  name: string;
  gameType: 'platformer';
  tileArts: TileArt[];
  worldMap: WorldMapLayout;
  playerCharacter: CharacterDefinition | null;
  backgroundColor: string;
  moveSpeed: number; // Multiplier: 0.6 = slow, 1.0 = normal, 1.5 = fast
  createdAt: number;
  updatedAt: number;
}

// ─── UI State ──────────────────────────────────────────────────────────────────
export type AppMode = 'home' | 'artboard' | 'character' | 'worldmap' | 'gametest';

export type DrawTool = 'pen' | 'eraser' | 'fill' | 'eyedropper';

export interface UIState {
  mode: AppMode;
  selectedBlockTypeId: BlockTypeBehavior;
  selectedColor: string;
  drawTool: DrawTool;
  editingTileId: string | null;     // Which tile art is being edited
  activeRoomId: string | null;      // Which room is open in world map
  selectedTileArtId: string | null; // Which tile to paint in world map
  artPalette: string[];             // Current color palette in art editor (8 colors)
  // Drives the guided "prova ändra något" flow started from the GamePlayer
  // invite, one explicit step at a time with an arrow pointing at exactly
  // where to click. Three mini-chapters, each ending back in Play mode:
  //   Character:  change-color → paint-now      → return-to-game
  //   Tile art:   change-tile  → paint-tile-now  → return-to-game-2
  //   World map:  place-tile                     → return-to-game-3
  // null = no active guidance.
  onboardingHint:
    | 'change-color' | 'paint-now' | 'return-to-game'
    | 'change-tile' | 'paint-tile-now' | 'return-to-game-2'
    | 'place-tile' | 'return-to-game-3'
    | null;
  // How many onboarding chapters the besökare has completed (0–3). Drives
  // which invite GamePlayer shows next: 0 → character, 1 → tile, 2 → world
  // map, 3 → done, no more invites.
  onboardingStage: 0 | 1 | 2 | 3;
  // Drives "Super handlett läge" — unlike the (lighter) Handlett läge above,
  // this never lets the besökare play until the very end: draw a character,
  // build + place a floor tile, then draw + place at least one of
  // collectible/enemy (with the option to also do the other one), then
  // finally point at Spela. Every step uses the same pattern: a banner, an
  // arrow pointing at what to do, and an explicit "Klar, gå vidare" button
  // the besökare presses whenever THEY feel done — no auto-detection of
  // "enough" pixels painted or cells placed.
  superFlow: {
    step:
      | 'character'      // draw the player character from scratch
      | 'floor-draw'     // create + draw a new terrain tile art
      | 'floor-place'    // paint it onto the room
      | 'choice'         // "vill du lägga till mynt eller en fiende?"
      | 'draw'           // create + draw a new tile art of `drawing`'s type
      | 'place'          // paint it onto the room
      | 'ask-other'      // offer the one remaining type, if any
      | 'done';          // point at Spela, guidance flow complete
    drawing: 'collectible' | 'enemy' | null; // which type 'draw'/'place' is about
    remaining: ('collectible' | 'enemy')[];  // not yet offered/completed
  } | null;
}

// ─── Runtime / Engine ──────────────────────────────────────────────────────────
export interface Vec2 {
  x: number;
  y: number;
}

export interface AABB {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface PlayerState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  onGround: boolean;
  inLiquid: boolean;
  health: number;
  maxHealth: number;
  invTimer: number;    // Invulnerability frames after taking damage
  coyoteTimer: number; // Frames after leaving ground where jump still works
  jumpBuffer: number;  // Frames where jump input is buffered
}

export interface CoinState {
  id: string;
  x: number;
  y: number;
  roomId: string;
  cellIndex: number;
  collected: boolean;
  animTime: number;
}

export interface EnemyState {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  onGround: boolean;
  direction: 1 | -1;
  roomId: string;
  health: number;
  invTimer: number;
  patrolTimer: number;
}

export interface GameState {
  player: PlayerState;
  currentRoomId: string;
  currentRoomRow: number;
  currentRoomCol: number;
  status: 'playing' | 'won' | 'dead' | 'transition';
  coinsCollected: number;
  totalCoins: number;
  coins: CoinState[];
  enemies: EnemyState[];
  transitionTimer: number;
  transitionDir: 'left' | 'right' | 'up' | 'down' | null;
  cameraX: number;
  cameraY: number;
  time: number;
}
