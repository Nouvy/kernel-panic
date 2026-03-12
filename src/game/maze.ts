import {
  CellType,
  COLS,
  ROWS,
  TILE_SIZE,
  MAZE_TEMPLATE,
} from './constants';

export function createMaze(): number[][] {
  return MAZE_TEMPLATE.map(row => [...row]);
}

export function countDots(maze: number[][]): number {
  let count = 0;
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      if (maze[row][col] === CellType.DOT || maze[row][col] === CellType.POWER_PELLET) {
        count++;
      }
    }
  }
  return count;
}

export function isWall(maze: number[][], col: number, row: number): boolean {
  if (row < 0 || row >= ROWS) return true;
  // Handle tunnel wrapping
  if (col < 0 || col >= COLS) return false;
  return maze[row][col] === CellType.WALL;
}

export function isWalkable(maze: number[][], col: number, row: number, isGhost: boolean = false): boolean {
  if (row < 0 || row >= ROWS) return false;
  // Tunnel
  if (col < 0 || col >= COLS) return true;
  const cell = maze[row][col];
  if (cell === CellType.WALL) return false;
  if (cell === CellType.GHOST_DOOR) return isGhost;
  return true;
}

export function drawMaze(ctx: CanvasRenderingContext2D, maze: number[][], frameCount: number): void {
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const x = col * TILE_SIZE;
      const y = row * TILE_SIZE;
      const cell = maze[row][col];

      if (cell === CellType.WALL) {
        drawWallTile(ctx, maze, col, row, x, y);
      } else if (cell === CellType.DOT) {
        // Bits: alternating 0 and 1
        ctx.fillStyle = '#00FF88';
        ctx.font = '7px "Press Start 2P", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const bit = (col + row) % 2 === 0 ? '0' : '1';
        ctx.fillText(bit, x + TILE_SIZE / 2, y + TILE_SIZE / 2 + 1);
      } else if (cell === CellType.POWER_PELLET) {
        // Hotfix patch - pulsing wrench/patch icon
        const pulse = Math.sin(frameCount * 0.1) * 0.3 + 0.7;
        const cx = x + TILE_SIZE / 2;
        const cy = y + TILE_SIZE / 2;
        // Glowing circle
        ctx.fillStyle = `rgba(0, 255, 136, ${pulse * 0.3})`;
        ctx.beginPath();
        ctx.arc(cx, cy, 9, 0, Math.PI * 2);
        ctx.fill();
        // Cross/plus sign (patch icon)
        ctx.fillStyle = `rgba(0, 255, 200, ${pulse})`;
        ctx.fillRect(cx - 5, cy - 2, 10, 4);
        ctx.fillRect(cx - 2, cy - 5, 4, 10);
        // Border glow
        ctx.strokeStyle = `rgba(0, 255, 136, ${pulse * 0.8})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(cx, cy, 7, 0, Math.PI * 2);
        ctx.stroke();
      } else if (cell === CellType.GHOST_DOOR) {
        ctx.fillStyle = '#00FF88';
        ctx.fillRect(x, y + TILE_SIZE / 2 - 2, TILE_SIZE, 4);
      }
    }
  }
}

function drawWallTile(
  ctx: CanvasRenderingContext2D,
  maze: number[][],
  col: number,
  row: number,
  x: number,
  y: number
): void {
  ctx.strokeStyle = '#00CC66';
  ctx.lineWidth = 2;

  const hasWall = (c: number, r: number): boolean => {
    if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return true;
    return maze[r][c] === CellType.WALL;
  };

  const top = hasWall(col, row - 1);
  const bottom = hasWall(col, row + 1);
  const left = hasWall(col - 1, row);
  const right = hasWall(col + 1, row);

  const cx = x + TILE_SIZE / 2;
  const cy = y + TILE_SIZE / 2;

  // Fill wall background - dark circuit board
  ctx.fillStyle = '#001a0d';
  ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);

  ctx.beginPath();

  // Draw connecting lines based on neighbors
  if (!top && !bottom && !left && !right) {
    // Isolated wall - draw a small box
    ctx.strokeRect(x + 4, y + 4, TILE_SIZE - 8, TILE_SIZE - 8);
    return;
  }

  if (top && bottom && left && right) {
    // Surrounded by walls - no border needed
    return;
  }

  // Draw borders on sides that face non-wall cells
  if (!top) {
    ctx.moveTo(x, cy);
    ctx.lineTo(x, y + 2);
    ctx.lineTo(x + TILE_SIZE, y + 2);
    ctx.lineTo(x + TILE_SIZE, cy);
  }
  if (!bottom) {
    ctx.moveTo(x, cy);
    ctx.lineTo(x, y + TILE_SIZE - 2);
    ctx.lineTo(x + TILE_SIZE, y + TILE_SIZE - 2);
    ctx.lineTo(x + TILE_SIZE, cy);
  }
  if (!left) {
    ctx.moveTo(cx, y);
    ctx.lineTo(x + 2, y);
    ctx.lineTo(x + 2, y + TILE_SIZE);
    ctx.lineTo(cx, y + TILE_SIZE);
  }
  if (!right) {
    ctx.moveTo(cx, y);
    ctx.lineTo(x + TILE_SIZE - 2, y);
    ctx.lineTo(x + TILE_SIZE - 2, y + TILE_SIZE);
    ctx.lineTo(cx, y + TILE_SIZE);
  }

  ctx.stroke();
}
