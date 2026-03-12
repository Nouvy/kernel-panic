import { Direction, GhostMode, GhostName } from './constants';

export interface Position {
  x: number; // pixel position
  y: number;
}

export interface TilePosition {
  col: number;
  row: number;
}

export interface PacmanState {
  position: Position;
  direction: Direction;
  nextDirection: Direction;
  mouthAngle: number;
  mouthOpening: boolean;
  dying: boolean;
  dyingFrame: number;
}

export interface GhostState {
  name: GhostName;
  position: Position;
  direction: Direction;
  mode: GhostMode;
  previousMode: GhostMode;
  frightenedTimer: number;
  color: string;
  dotCounter: number;
  released: boolean;
}

export interface GameData {
  maze: number[][];
  pacman: PacmanState;
  ghosts: GhostState[];
  score: number;
  lives: number;
  level: number;
  dotsRemaining: number;
  totalDots: number;
  ghostsEatenInFright: number;
}
