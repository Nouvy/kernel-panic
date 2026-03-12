// Game constants
export const TILE_SIZE = 20;
export const COLS = 28;
export const ROWS = 31;
export const CANVAS_WIDTH = COLS * TILE_SIZE;
export const CANVAS_HEIGHT = ROWS * TILE_SIZE;

export const FPS = 60;
export const PACMAN_SPEED = 2;
export const GHOST_SPEED = 1.8;
export const GHOST_FRIGHTENED_SPEED = 1.0;
export const GHOST_RETURNING_SPEED = 4;

export const FRIGHTENED_DURATION = 8000; // ms
export const FRIGHTENED_BLINK_START = 5000; // ms before end, start blinking

export const DOT_SCORE = 10;
export const POWER_PELLET_SCORE = 50;
export const GHOST_SCORE_BASE = 200; // doubles for each ghost eaten in sequence

export const INITIAL_LIVES = 3;

export enum Direction {
  UP = 'UP',
  DOWN = 'DOWN',
  LEFT = 'LEFT',
  RIGHT = 'RIGHT',
  NONE = 'NONE',
}

export enum CellType {
  WALL = 0,
  DOT = 1,
  EMPTY = 2,
  POWER_PELLET = 3,
  GHOST_HOUSE = 4,
  GHOST_DOOR = 5,
  TUNNEL = 6,
}

export enum GameState {
  START_SCREEN = 'START_SCREEN',
  PLAYING = 'PLAYING',
  DYING = 'DYING',
  LEVEL_COMPLETE = 'LEVEL_COMPLETE',
  GAME_OVER = 'GAME_OVER',
  PAUSED = 'PAUSED',
  READY = 'READY',
}

export enum GhostMode {
  SCATTER = 'SCATTER',
  CHASE = 'CHASE',
  FRIGHTENED = 'FRIGHTENED',
  RETURNING = 'RETURNING',
  IN_HOUSE = 'IN_HOUSE',
  LEAVING_HOUSE = 'LEAVING_HOUSE',
}

export enum GhostName {
  BLINKY = 'BLINKY',
  PINKY = 'PINKY',
  INKY = 'INKY',
  CLYDE = 'CLYDE',
}

export const GHOST_COLORS: Record<GhostName, string> = {
  [GhostName.BLINKY]: '#FF0000',
  [GhostName.PINKY]: '#FFB8FF',
  [GhostName.INKY]: '#00FFFF',
  [GhostName.CLYDE]: '#FFB852',
};

export const FRIGHTENED_COLOR = '#00AA44';
export const FRIGHTENED_BLINK_COLOR = '#FFFFFF';

// Classic PacMan maze layout
// 0 = wall, 1 = dot, 2 = empty, 3 = power pellet, 4 = ghost house, 5 = ghost door, 6 = tunnel
export const MAZE_TEMPLATE: number[][] = [
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,1,1,1,1,1,1,1,1,1,1,1,1,0,0,1,1,1,1,1,1,1,1,1,1,1,1,0],
  [0,1,0,0,0,0,1,0,0,0,0,0,1,0,0,1,0,0,0,0,0,1,0,0,0,0,1,0],
  [0,3,0,0,0,0,1,0,0,0,0,0,1,0,0,1,0,0,0,0,0,1,0,0,0,0,3,0],
  [0,1,0,0,0,0,1,0,0,0,0,0,1,0,0,1,0,0,0,0,0,1,0,0,0,0,1,0],
  [0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0],
  [0,1,0,0,0,0,1,0,0,1,0,0,0,0,0,0,0,0,1,0,0,1,0,0,0,0,1,0],
  [0,1,0,0,0,0,1,0,0,1,0,0,0,0,0,0,0,0,1,0,0,1,0,0,0,0,1,0],
  [0,1,1,1,1,1,1,0,0,1,1,1,1,0,0,1,1,1,1,0,0,1,1,1,1,1,1,0],
  [0,0,0,0,0,0,1,0,0,0,0,0,2,0,0,2,0,0,0,0,0,1,0,0,0,0,0,0],
  [2,2,2,2,2,0,1,0,0,0,0,0,2,0,0,2,0,0,0,0,0,1,0,2,2,2,2,2],
  [2,2,2,2,2,0,1,0,0,2,2,2,2,2,2,2,2,2,2,0,0,1,0,2,2,2,2,2],
  [2,2,2,2,2,0,1,0,0,2,0,0,0,5,5,0,0,0,2,0,0,1,0,2,2,2,2,2],
  [0,0,0,0,0,0,1,0,0,2,0,4,4,4,4,4,4,0,2,0,0,1,0,0,0,0,0,0],
  [6,2,2,2,2,2,1,2,2,2,0,4,4,4,4,4,4,0,2,2,2,1,2,2,2,2,2,6],
  [0,0,0,0,0,0,1,0,0,2,0,4,4,4,4,4,4,0,2,0,0,1,0,0,0,0,0,0],
  [2,2,2,2,2,0,1,0,0,2,0,0,0,0,0,0,0,0,2,0,0,1,0,2,2,2,2,2],
  [2,2,2,2,2,0,1,0,0,2,2,2,2,2,2,2,2,2,2,0,0,1,0,2,2,2,2,2],
  [2,2,2,2,2,0,1,0,0,2,0,0,0,0,0,0,0,0,2,0,0,1,0,2,2,2,2,2],
  [0,0,0,0,0,0,1,0,0,2,0,0,0,0,0,0,0,0,2,0,0,1,0,0,0,0,0,0],
  [0,1,1,1,1,1,1,1,1,1,1,1,1,0,0,1,1,1,1,1,1,1,1,1,1,1,1,0],
  [0,1,0,0,0,0,1,0,0,0,0,0,1,0,0,1,0,0,0,0,0,1,0,0,0,0,1,0],
  [0,1,0,0,0,0,1,0,0,0,0,0,1,0,0,1,0,0,0,0,0,1,0,0,0,0,1,0],
  [0,3,1,1,0,0,1,1,1,1,1,1,1,2,2,1,1,1,1,1,1,1,0,0,1,1,3,0],
  [0,0,0,1,0,0,1,0,0,1,0,0,0,0,0,0,0,0,1,0,0,1,0,0,1,0,0,0],
  [0,0,0,1,0,0,1,0,0,1,0,0,0,0,0,0,0,0,1,0,0,1,0,0,1,0,0,0],
  [0,1,1,1,1,1,1,0,0,1,1,1,1,0,0,1,1,1,1,0,0,1,1,1,1,1,1,0],
  [0,1,0,0,0,0,0,0,0,0,0,0,1,0,0,1,0,0,0,0,0,0,0,0,0,0,1,0],
  [0,1,0,0,0,0,0,0,0,0,0,0,1,0,0,1,0,0,0,0,0,0,0,0,0,0,1,0],
  [0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
];

// Pacman start position (tile coordinates)
export const PACMAN_START_COL = 14;
export const PACMAN_START_ROW = 23;

// Ghost start positions (tile coordinates)
export const GHOST_START_POSITIONS: Record<GhostName, { col: number; row: number }> = {
  [GhostName.BLINKY]: { col: 14, row: 11 },
  [GhostName.PINKY]: { col: 14, row: 14 },
  [GhostName.INKY]: { col: 12, row: 14 },
  [GhostName.CLYDE]: { col: 16, row: 14 },
};

// Ghost scatter targets (corners)
export const GHOST_SCATTER_TARGETS: Record<GhostName, { col: number; row: number }> = {
  [GhostName.BLINKY]: { col: 25, row: 0 },
  [GhostName.PINKY]: { col: 2, row: 0 },
  [GhostName.INKY]: { col: 27, row: 30 },
  [GhostName.CLYDE]: { col: 0, row: 30 },
};

// Ghost house entrance
export const GHOST_HOUSE_ENTRANCE = { col: 14, row: 11 };
