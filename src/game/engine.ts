import {
  Direction,
  CellType,
  GhostMode,
  GhostName,
  TILE_SIZE,
  COLS,
  ROWS,
  PACMAN_SPEED,
  GHOST_SPEED,
  GHOST_FRIGHTENED_SPEED,
  GHOST_RETURNING_SPEED,
  FRIGHTENED_DURATION,
  DOT_SCORE,
  POWER_PELLET_SCORE,
  GHOST_SCORE_BASE,
  PACMAN_START_COL,
  PACMAN_START_ROW,
  GHOST_START_POSITIONS,
  GHOST_SCATTER_TARGETS,
  GHOST_HOUSE_ENTRANCE,
  GHOST_COLORS,
  INITIAL_LIVES,
  GameState,
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
} from './constants';
import { PacmanState, GhostState, GameData } from './types';
import { createMaze, countDots, isWalkable, drawMaze } from './maze';
import { drawPacman, drawGhost, drawScore, drawLives, drawLevel, drawReadyText } from './renderer';

const OPPOSITE_DIRECTION: Record<string, Direction> = {
  [Direction.UP]: Direction.DOWN,
  [Direction.DOWN]: Direction.UP,
  [Direction.LEFT]: Direction.RIGHT,
  [Direction.RIGHT]: Direction.LEFT,
};

export class PacmanEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private animationId: number = 0;
  private frameCount: number = 0;
  private lastTime: number = 0;
  private accumulator: number = 0;
  private readonly fixedStep: number = 1000 / 60;
  private readonly maxDelta: number = 200; // cap to prevent spiral when tab is backgrounded

  private gameState: GameState = GameState.START_SCREEN;
  private gameData!: GameData;

  private readyTimer: number = 0;
  private dyingTimer: number = 0;
  private levelCompleteTimer: number = 0;
  private frightenedTimer: number = 0;

  private scatterChaseTimer: number = 0;
  private scatterChaseCycle: number = 0;
  // Scatter/Chase mode timing (in frames at 60fps)
  private readonly scatterChasePattern = [
    { mode: 'SCATTER' as const, duration: 420 },  // 7s
    { mode: 'CHASE' as const, duration: 1200 },   // 20s
    { mode: 'SCATTER' as const, duration: 420 },   // 7s
    { mode: 'CHASE' as const, duration: 1200 },   // 20s
    { mode: 'SCATTER' as const, duration: 300 },   // 5s
    { mode: 'CHASE' as const, duration: 1200 },   // 20s
    { mode: 'SCATTER' as const, duration: 300 },   // 5s
    { mode: 'CHASE' as const, duration: Infinity }, // permanent chase
  ];

  private onScoreChange?: (score: number) => void;
  private onLivesChange?: (lives: number) => void;
  private onGameStateChange?: (state: GameState) => void;
  private onLevelChange?: (level: number) => void;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.initGame();
  }

  setCallbacks(callbacks: {
    onScoreChange?: (score: number) => void;
    onLivesChange?: (lives: number) => void;
    onGameStateChange?: (state: GameState) => void;
    onLevelChange?: (level: number) => void;
  }): void {
    this.onScoreChange = callbacks.onScoreChange;
    this.onLivesChange = callbacks.onLivesChange;
    this.onGameStateChange = callbacks.onGameStateChange;
    this.onLevelChange = callbacks.onLevelChange;
  }

  private initGame(): void {
    const maze = createMaze();
    const totalDots = countDots(maze);

    this.gameData = {
      maze,
      pacman: this.createPacman(),
      ghosts: this.createGhosts(),
      score: 0,
      lives: INITIAL_LIVES,
      level: 1,
      dotsRemaining: totalDots,
      totalDots,
      ghostsEatenInFright: 0,
    };

    this.scatterChaseTimer = 0;
    this.scatterChaseCycle = 0;
    this.frightenedTimer = 0;
  }

  private createPacman(): PacmanState {
    return {
      position: {
        x: PACMAN_START_COL * TILE_SIZE + TILE_SIZE / 2,
        y: PACMAN_START_ROW * TILE_SIZE + TILE_SIZE / 2,
      },
      direction: Direction.LEFT,
      nextDirection: Direction.LEFT,
      mouthAngle: 0.25,
      mouthOpening: false,
      dying: false,
      dyingFrame: 0,
    };
  }

  private createGhosts(): GhostState[] {
    return [
      this.createGhost(GhostName.BLINKY, true),
      this.createGhost(GhostName.PINKY, false),
      this.createGhost(GhostName.INKY, false),
      this.createGhost(GhostName.CLYDE, false),
    ];
  }

  private createGhost(name: GhostName, released: boolean): GhostState {
    const startPos = GHOST_START_POSITIONS[name];
    return {
      name,
      position: {
        x: startPos.col * TILE_SIZE + TILE_SIZE / 2,
        y: startPos.row * TILE_SIZE + TILE_SIZE / 2,
      },
      direction: name === GhostName.BLINKY ? Direction.LEFT : Direction.UP,
      mode: released ? GhostMode.SCATTER : GhostMode.IN_HOUSE,
      previousMode: GhostMode.SCATTER,
      frightenedTimer: 0,
      color: GHOST_COLORS[name],
      dotCounter: 0,
      released,
    };
  }

  private resetPositions(): void {
    this.gameData.pacman = this.createPacman();
    this.gameData.ghosts = this.createGhosts();
    this.frightenedTimer = 0;
    this.scatterChaseTimer = 0;
    this.scatterChaseCycle = 0;
    this.gameData.ghostsEatenInFright = 0;
  }

  start(): void {
    this.gameState = GameState.START_SCREEN;
    this.onGameStateChange?.(this.gameState);
    this.lastTime = performance.now();
    this.gameLoop(this.lastTime);
  }

  stop(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = 0;
    }
  }

  startGame(): void {
    this.initGame();
    this.gameState = GameState.READY;
    this.readyTimer = 120; // 2 seconds
    this.onGameStateChange?.(this.gameState);
    this.onScoreChange?.(0);
    this.onLivesChange?.(INITIAL_LIVES);
    this.onLevelChange?.(1);
  }

  handleKeyDown(key: string): void {
    if (this.gameState === GameState.START_SCREEN) {
      if (key === 'Enter' || key === ' ') {
        this.startGame();
      }
      return;
    }

    if (this.gameState === GameState.GAME_OVER) {
      if (key === 'Enter' || key === ' ') {
        this.startGame();
      }
      return;
    }

    if (this.gameState === GameState.PLAYING) {
      switch (key) {
        case 'ArrowUp':
        case 'w':
          this.gameData.pacman.nextDirection = Direction.UP;
          break;
        case 'ArrowDown':
        case 's':
          this.gameData.pacman.nextDirection = Direction.DOWN;
          break;
        case 'ArrowLeft':
        case 'a':
          this.gameData.pacman.nextDirection = Direction.LEFT;
          break;
        case 'ArrowRight':
        case 'd':
          this.gameData.pacman.nextDirection = Direction.RIGHT;
          break;
      }
    }
  }

  private gameLoop = (timestamp: number): void => {
    this.animationId = requestAnimationFrame(this.gameLoop);

    const delta = Math.min(timestamp - this.lastTime, this.maxDelta);
    this.lastTime = timestamp;
    this.accumulator += delta;

    while (this.accumulator >= this.fixedStep) {
      this.update();
      this.accumulator -= this.fixedStep;
    }

    this.render();
  };

  private update(): void {
    this.frameCount++;

    switch (this.gameState) {
      case GameState.READY:
        this.readyTimer--;
        if (this.readyTimer <= 0) {
          this.gameState = GameState.PLAYING;
          this.onGameStateChange?.(this.gameState);
        }
        break;

      case GameState.PLAYING:
        this.updatePacman();
        this.updateGhosts();
        this.checkCollisions();
        this.updateScatterChase();
        if (this.frightenedTimer > 0) {
          this.frightenedTimer--;
          if (this.frightenedTimer <= 0) {
            this.endFrightened();
          }
        }
        break;

      case GameState.DYING:
        this.gameData.pacman.dyingFrame++;
        if (this.gameData.pacman.dyingFrame >= 70) {
          this.gameData.lives--;
          this.onLivesChange?.(this.gameData.lives);
          if (this.gameData.lives <= 0) {
            this.gameState = GameState.GAME_OVER;
            this.onGameStateChange?.(this.gameState);
          } else {
            this.resetPositions();
            this.gameState = GameState.READY;
            this.readyTimer = 120;
            this.onGameStateChange?.(this.gameState);
          }
        }
        break;

      case GameState.LEVEL_COMPLETE:
        this.levelCompleteTimer--;
        if (this.levelCompleteTimer <= 0) {
          this.gameData.level++;
          this.onLevelChange?.(this.gameData.level);
          this.gameData.maze = createMaze();
          const totalDots = countDots(this.gameData.maze);
          this.gameData.dotsRemaining = totalDots;
          this.gameData.totalDots = totalDots;
          this.resetPositions();
          this.gameState = GameState.READY;
          this.readyTimer = 120;
          this.onGameStateChange?.(this.gameState);
        }
        break;
    }
  }

  private updatePacman(): void {
    const pacman = this.gameData.pacman;
    const maze = this.gameData.maze;

    // Animate mouth
    if (pacman.mouthOpening) {
      pacman.mouthAngle += 0.04;
      if (pacman.mouthAngle >= 0.4) {
        pacman.mouthOpening = false;
      }
    } else {
      pacman.mouthAngle -= 0.04;
      if (pacman.mouthAngle <= 0.05) {
        pacman.mouthOpening = true;
      }
    }

    // Try next direction first
    if (pacman.nextDirection !== pacman.direction) {
      if (this.canMoveInDirection(pacman.position.x, pacman.position.y, pacman.nextDirection, false)) {
        pacman.direction = pacman.nextDirection;
      }
    }

    // Move in current direction
    if (this.canMoveInDirection(pacman.position.x, pacman.position.y, pacman.direction, false)) {
      this.moveEntity(pacman, PACMAN_SPEED);
    }

    // Handle tunnel
    this.handleTunnel(pacman);

    // Eat dots
    const col = Math.floor(pacman.position.x / TILE_SIZE);
    const row = Math.floor(pacman.position.y / TILE_SIZE);

    if (col >= 0 && col < COLS && row >= 0 && row < ROWS) {
      const cell = maze[row][col];
      if (cell === CellType.DOT) {
        maze[row][col] = CellType.EMPTY;
        this.gameData.score += DOT_SCORE;
        this.gameData.dotsRemaining--;
        this.onScoreChange?.(this.gameData.score);
        this.checkLevelComplete();
        this.releaseGhostByDots();
      } else if (cell === CellType.POWER_PELLET) {
        maze[row][col] = CellType.EMPTY;
        this.gameData.score += POWER_PELLET_SCORE;
        this.gameData.dotsRemaining--;
        this.onScoreChange?.(this.gameData.score);
        this.startFrightened();
        this.checkLevelComplete();
      }
    }
  }

  private releaseGhostByDots(): void {
    const eaten = this.gameData.totalDots - this.gameData.dotsRemaining;
    const ghosts = this.gameData.ghosts;

    // Release Pinky after 1 dot
    if (eaten >= 1) {
      const pinky = ghosts.find(g => g.name === GhostName.PINKY);
      if (pinky && pinky.mode === GhostMode.IN_HOUSE) {
        pinky.mode = GhostMode.LEAVING_HOUSE;
        pinky.released = true;
      }
    }
    // Release Inky after 30 dots
    if (eaten >= 30) {
      const inky = ghosts.find(g => g.name === GhostName.INKY);
      if (inky && inky.mode === GhostMode.IN_HOUSE) {
        inky.mode = GhostMode.LEAVING_HOUSE;
        inky.released = true;
      }
    }
    // Release Clyde after 60 dots
    if (eaten >= 60) {
      const clyde = ghosts.find(g => g.name === GhostName.CLYDE);
      if (clyde && clyde.mode === GhostMode.IN_HOUSE) {
        clyde.mode = GhostMode.LEAVING_HOUSE;
        clyde.released = true;
      }
    }
  }

  private updateGhosts(): void {
    for (const ghost of this.gameData.ghosts) {
      this.updateGhost(ghost);
    }
  }

  private updateGhost(ghost: GhostState): void {
    if (ghost.mode === GhostMode.IN_HOUSE) {
      // Bounce up and down in house
      ghost.position.y += ghost.direction === Direction.UP ? -0.5 : 0.5;
      const homeRow = GHOST_START_POSITIONS[ghost.name].row;
      const homeY = homeRow * TILE_SIZE + TILE_SIZE / 2;
      if (ghost.position.y < homeY - 5) ghost.direction = Direction.DOWN;
      if (ghost.position.y > homeY + 5) ghost.direction = Direction.UP;
      return;
    }

    if (ghost.mode === GhostMode.LEAVING_HOUSE) {
      // Move to house entrance
      const targetX = GHOST_HOUSE_ENTRANCE.col * TILE_SIZE + TILE_SIZE / 2;
      const targetY = GHOST_HOUSE_ENTRANCE.row * TILE_SIZE + TILE_SIZE / 2;

      // First center horizontally
      if (Math.abs(ghost.position.x - targetX) > 1) {
        ghost.position.x += ghost.position.x < targetX ? 1 : -1;
      } else {
        ghost.position.x = targetX;
        // Then move up
        if (ghost.position.y > targetY) {
          ghost.position.y -= 1;
          ghost.direction = Direction.UP;
        } else {
          ghost.position.y = targetY;
          ghost.mode = this.getCurrentGhostMode();
          ghost.direction = Direction.LEFT;
        }
      }
      return;
    }

    const speed = ghost.mode === GhostMode.FRIGHTENED
      ? GHOST_FRIGHTENED_SPEED
      : ghost.mode === GhostMode.RETURNING
        ? GHOST_RETURNING_SPEED
        : GHOST_SPEED;

    // Check if ghost is at a tile center (decision point)
    const centerX = Math.floor(ghost.position.x / TILE_SIZE) * TILE_SIZE + TILE_SIZE / 2;
    const centerY = Math.floor(ghost.position.y / TILE_SIZE) * TILE_SIZE + TILE_SIZE / 2;
    const atCenter = Math.abs(ghost.position.x - centerX) < speed && Math.abs(ghost.position.y - centerY) < speed;

    if (atCenter) {
      ghost.position.x = centerX;
      ghost.position.y = centerY;

      // Choose next direction
      const col = Math.floor(ghost.position.x / TILE_SIZE);
      const row = Math.floor(ghost.position.y / TILE_SIZE);

      // If returning and reached house entrance, go inside
      if (ghost.mode === GhostMode.RETURNING) {
        if (col === GHOST_HOUSE_ENTRANCE.col && row === GHOST_HOUSE_ENTRANCE.row) {
          // Move ghost back to home position
          const homePos = GHOST_START_POSITIONS[ghost.name];
          ghost.position.x = homePos.col * TILE_SIZE + TILE_SIZE / 2;
          ghost.position.y = homePos.row * TILE_SIZE + TILE_SIZE / 2;
          ghost.mode = GhostMode.LEAVING_HOUSE;
          return;
        }
      }

      const target = this.getGhostTarget(ghost);
      const newDir = this.chooseGhostDirection(ghost, col, row, target);
      ghost.direction = newDir;
    }

    this.moveEntity(ghost, speed);
    this.handleTunnel(ghost);
  }

  private getGhostTarget(ghost: GhostState): { col: number; row: number } {
    const pacman = this.gameData.pacman;
    const pacCol = Math.floor(pacman.position.x / TILE_SIZE);
    const pacRow = Math.floor(pacman.position.y / TILE_SIZE);

    if (ghost.mode === GhostMode.RETURNING) {
      return GHOST_HOUSE_ENTRANCE;
    }

    if (ghost.mode === GhostMode.FRIGHTENED) {
      // Random target
      return { col: Math.floor(Math.random() * COLS), row: Math.floor(Math.random() * ROWS) };
    }

    if (ghost.mode === GhostMode.SCATTER) {
      return GHOST_SCATTER_TARGETS[ghost.name];
    }

    // Chase mode - each ghost has different targeting
    switch (ghost.name) {
      case GhostName.BLINKY:
        // Directly targets PacMan
        return { col: pacCol, row: pacRow };

      case GhostName.PINKY:
        // Targets 4 tiles ahead of PacMan
        let targetCol = pacCol;
        let targetRow = pacRow;
        switch (pacman.direction) {
          case Direction.UP: targetRow -= 4; targetCol -= 4; break; // Original bug replicated
          case Direction.DOWN: targetRow += 4; break;
          case Direction.LEFT: targetCol -= 4; break;
          case Direction.RIGHT: targetCol += 4; break;
        }
        return { col: targetCol, row: targetRow };

      case GhostName.INKY: {
        // Complex: uses Blinky's position
        let aheadCol = pacCol;
        let aheadRow = pacRow;
        switch (pacman.direction) {
          case Direction.UP: aheadRow -= 2; break;
          case Direction.DOWN: aheadRow += 2; break;
          case Direction.LEFT: aheadCol -= 2; break;
          case Direction.RIGHT: aheadCol += 2; break;
        }
        const blinky = this.gameData.ghosts.find(g => g.name === GhostName.BLINKY)!;
        const blinkyCol = Math.floor(blinky.position.x / TILE_SIZE);
        const blinkyRow = Math.floor(blinky.position.y / TILE_SIZE);
        return {
          col: aheadCol + (aheadCol - blinkyCol),
          row: aheadRow + (aheadRow - blinkyRow),
        };
      }

      case GhostName.CLYDE: {
        // If far from PacMan, targets PacMan. If close, goes to scatter corner
        const dist = Math.sqrt(
          Math.pow(Math.floor(ghost.position.x / TILE_SIZE) - pacCol, 2) +
          Math.pow(Math.floor(ghost.position.y / TILE_SIZE) - pacRow, 2)
        );
        if (dist > 8) {
          return { col: pacCol, row: pacRow };
        }
        return GHOST_SCATTER_TARGETS[GhostName.CLYDE];
      }
    }
  }

  private chooseGhostDirection(
    ghost: GhostState,
    col: number,
    row: number,
    target: { col: number; row: number }
  ): Direction {
    const directions = [Direction.UP, Direction.LEFT, Direction.DOWN, Direction.RIGHT];

    let bestDir = ghost.direction;
    let bestDist = Infinity;

    for (const dir of directions) {
      // Cannot reverse
      if (dir === OPPOSITE_DIRECTION[ghost.direction]) continue;

      let nextCol = col;
      let nextRow = row;
      switch (dir) {
        case Direction.UP: nextRow--; break;
        case Direction.DOWN: nextRow++; break;
        case Direction.LEFT: nextCol--; break;
        case Direction.RIGHT: nextCol++; break;
      }

      if (!isWalkable(this.gameData.maze, nextCol, nextRow, true)) continue;

      // Ghosts can't go up at certain tiles (original game restriction simplified)
      const dist = Math.pow(nextCol - target.col, 2) + Math.pow(nextRow - target.row, 2);
      if (dist < bestDist) {
        bestDist = dist;
        bestDir = dir;
      }
    }

    return bestDir;
  }

  private canMoveInDirection(x: number, y: number, dir: Direction, isGhost: boolean): boolean {
    const margin = TILE_SIZE / 2 - 1;

    if (dir === Direction.NONE) return false;

    // Check if near center of perpendicular axis (snap to grid for turning)
    const col = Math.floor(x / TILE_SIZE);
    const row = Math.floor(y / TILE_SIZE);
    const centerX = col * TILE_SIZE + TILE_SIZE / 2;
    const centerY = row * TILE_SIZE + TILE_SIZE / 2;

    if (dir === Direction.UP || dir === Direction.DOWN) {
      if (Math.abs(x - centerX) > 3) return false;
    }
    if (dir === Direction.LEFT || dir === Direction.RIGHT) {
      if (Math.abs(y - centerY) > 3) return false;
    }

    // Test the tile we'd be moving into
    let nextCol = col;
    let nextRow = row;
    switch (dir) {
      case Direction.UP: nextRow = Math.floor((y - margin - 1) / TILE_SIZE); break;
      case Direction.DOWN: nextRow = Math.floor((y + margin + 1) / TILE_SIZE); break;
      case Direction.LEFT: nextCol = Math.floor((x - margin - 1) / TILE_SIZE); break;
      case Direction.RIGHT: nextCol = Math.floor((x + margin + 1) / TILE_SIZE); break;
    }

    return isWalkable(this.gameData.maze, nextCol, nextRow, isGhost);
  }

  private moveEntity(entity: { position: { x: number; y: number }; direction: Direction }, speed: number): void {
    // Snap to grid on perpendicular axis
    const col = Math.floor(entity.position.x / TILE_SIZE);
    const row = Math.floor(entity.position.y / TILE_SIZE);
    const centerX = col * TILE_SIZE + TILE_SIZE / 2;
    const centerY = row * TILE_SIZE + TILE_SIZE / 2;

    switch (entity.direction) {
      case Direction.UP:
        entity.position.y -= speed;
        entity.position.x += (centerX - entity.position.x) * 0.3;
        break;
      case Direction.DOWN:
        entity.position.y += speed;
        entity.position.x += (centerX - entity.position.x) * 0.3;
        break;
      case Direction.LEFT:
        entity.position.x -= speed;
        entity.position.y += (centerY - entity.position.y) * 0.3;
        break;
      case Direction.RIGHT:
        entity.position.x += speed;
        entity.position.y += (centerY - entity.position.y) * 0.3;
        break;
    }
  }

  private handleTunnel(entity: { position: { x: number; y: number } }): void {
    if (entity.position.x < -TILE_SIZE / 2) {
      entity.position.x = COLS * TILE_SIZE + TILE_SIZE / 2;
    } else if (entity.position.x > COLS * TILE_SIZE + TILE_SIZE / 2) {
      entity.position.x = -TILE_SIZE / 2;
    }
  }

  private checkCollisions(): void {
    const pacman = this.gameData.pacman;

    for (const ghost of this.gameData.ghosts) {
      if (ghost.mode === GhostMode.IN_HOUSE || ghost.mode === GhostMode.LEAVING_HOUSE) continue;

      const dist = Math.sqrt(
        Math.pow(pacman.position.x - ghost.position.x, 2) +
        Math.pow(pacman.position.y - ghost.position.y, 2)
      );

      if (dist < TILE_SIZE - 2) {
        if (ghost.mode === GhostMode.FRIGHTENED) {
          // Eat the ghost
          ghost.mode = GhostMode.RETURNING;
          this.gameData.ghostsEatenInFright++;
          const points = GHOST_SCORE_BASE * Math.pow(2, this.gameData.ghostsEatenInFright - 1);
          this.gameData.score += points;
          this.onScoreChange?.(this.gameData.score);
        } else if (ghost.mode !== GhostMode.RETURNING) {
          // PacMan dies
          this.gameData.pacman.dying = true;
          this.gameData.pacman.dyingFrame = 0;
          this.gameState = GameState.DYING;
          this.onGameStateChange?.(this.gameState);
          return;
        }
      }
    }
  }

  private startFrightened(): void {
    this.frightenedTimer = Math.floor(FRIGHTENED_DURATION / this.fixedStep);
    this.gameData.ghostsEatenInFright = 0;

    for (const ghost of this.gameData.ghosts) {
      if (ghost.mode === GhostMode.IN_HOUSE || ghost.mode === GhostMode.LEAVING_HOUSE || ghost.mode === GhostMode.RETURNING) continue;
      ghost.previousMode = ghost.mode;
      ghost.mode = GhostMode.FRIGHTENED;
      ghost.direction = OPPOSITE_DIRECTION[ghost.direction] || ghost.direction;
    }
  }

  private endFrightened(): void {
    for (const ghost of this.gameData.ghosts) {
      if (ghost.mode === GhostMode.FRIGHTENED) {
        ghost.mode = this.getCurrentGhostMode();
      }
    }
    this.frightenedTimer = 0;
  }

  private getCurrentGhostMode(): GhostMode {
    if (this.scatterChaseCycle < this.scatterChasePattern.length) {
      return this.scatterChasePattern[this.scatterChaseCycle].mode === 'SCATTER'
        ? GhostMode.SCATTER
        : GhostMode.CHASE;
    }
    return GhostMode.CHASE;
  }

  private updateScatterChase(): void {
    if (this.frightenedTimer > 0) return;

    this.scatterChaseTimer++;
    if (this.scatterChaseCycle < this.scatterChasePattern.length) {
      const currentPhase = this.scatterChasePattern[this.scatterChaseCycle];
      if (this.scatterChaseTimer >= currentPhase.duration) {
        this.scatterChaseTimer = 0;
        this.scatterChaseCycle++;

        const newMode = this.getCurrentGhostMode();
        for (const ghost of this.gameData.ghosts) {
          if (ghost.mode === GhostMode.SCATTER || ghost.mode === GhostMode.CHASE) {
            ghost.mode = newMode;
            ghost.direction = OPPOSITE_DIRECTION[ghost.direction] || ghost.direction;
          }
        }
      }
    }
  }

  private checkLevelComplete(): void {
    if (this.gameData.dotsRemaining <= 0) {
      this.gameState = GameState.LEVEL_COMPLETE;
      this.levelCompleteTimer = 120;
      this.onGameStateChange?.(this.gameState);
    }
  }

  private render(): void {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    if (this.gameState === GameState.START_SCREEN) {
      this.renderStartScreen();
      return;
    }

    if (this.gameState === GameState.GAME_OVER) {
      this.renderGameOver();
      return;
    }

    // Draw maze
    drawMaze(ctx, this.gameData.maze, this.frameCount);

    // Draw ghosts
    const frightenedTimeLeft = this.frightenedTimer * this.fixedStep;
    for (const ghost of this.gameData.ghosts) {
      drawGhost(ctx, ghost, this.frameCount, frightenedTimeLeft);
    }

    // Draw PacMan
    drawPacman(ctx, this.gameData.pacman);

    // UI
    drawScore(ctx, this.gameData.score, CANVAS_WIDTH);
    drawLives(ctx, this.gameData.lives, CANVAS_WIDTH, CANVAS_HEIGHT);
    drawLevel(ctx, this.gameData.level, CANVAS_WIDTH);

    if (this.gameState === GameState.READY) {
      drawReadyText(ctx, CANVAS_WIDTH, CANVAS_HEIGHT);
    }

    if (this.gameState === GameState.LEVEL_COMPLETE) {
      // Flash maze
      if (Math.floor(this.frameCount / 15) % 2 === 0) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      }
    }
  }

  private renderStartScreen(): void {
    const ctx = this.ctx;

    // Background matrix rain effect
    ctx.fillStyle = 'rgba(0, 255, 0, 0.03)';
    ctx.font = '10px monospace';
    for (let i = 0; i < 20; i++) {
      const x = (i * 28 + this.frameCount * 0.5) % CANVAS_WIDTH;
      const chars = '01{}()<>[];/\\#$@!?&|=+-*';
      for (let j = 0; j < 6; j++) {
        const y = ((j * 100 + this.frameCount + i * 37) % (CANVAS_HEIGHT + 100)) - 50;
        ctx.fillText(chars[Math.floor(Math.random() * chars.length)], x, y);
      }
    }

    // Title - KERNEL PANIC
    ctx.fillStyle = '#FF0000';
    ctx.font = 'bold 24px "Press Start 2P", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('KERNEL', CANVAS_WIDTH / 2, 100);
    ctx.fillStyle = '#00FF00';
    ctx.font = 'bold 30px "Press Start 2P", monospace';
    ctx.fillText('PANIC', CANVAS_WIDTH / 2, 140);

    // Subtitle
    ctx.fillStyle = '#00FF88';
    ctx.font = '8px "Press Start 2P", monospace';
    ctx.fillText('// DEBUG THE SYSTEM //', CANVAS_WIDTH / 2, 170);

    // Developer character (player)
    const ccx = CANVAS_WIDTH / 2;
    const ccy = 215;
    // Head
    ctx.fillStyle = '#FFD700';
    ctx.beginPath();
    ctx.arc(ccx, ccy, 20, 0, Math.PI * 2);
    ctx.fill();
    // Glasses
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.rect(ccx - 12, ccy - 6, 10, 8);
    ctx.rect(ccx + 2, ccy - 6, 10, 8);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(ccx - 2, ccy - 2);
    ctx.lineTo(ccx + 2, ccy - 2);
    ctx.stroke();
    // Blue lens glare
    ctx.fillStyle = 'rgba(0, 150, 255, 0.3)';
    ctx.fillRect(ccx - 11, ccy - 5, 9, 7);
    ctx.fillRect(ccx + 3, ccy - 5, 9, 7);
    // Pupils
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.arc(ccx - 7, ccy - 2, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(ccx + 7, ccy - 2, 2, 0, Math.PI * 2);
    ctx.fill();
    // Mouth
    ctx.beginPath();
    ctx.arc(ccx, ccy + 8, 4, 0, Math.PI);
    ctx.stroke();
    // Label
    ctx.fillStyle = '#FFD700';
    ctx.font = '8px "Press Start 2P", monospace';
    ctx.fillText('DEV', ccx, ccy + 35);

    // Bits trail
    const dotY = 275;
    ctx.font = '8px "Press Start 2P", monospace';
    ctx.fillStyle = '#00FF88';
    for (let i = 0; i < 10; i++) {
      const bit = i % 2 === 0 ? '0' : '1';
      ctx.fillText(bit, 80 + i * 35, dotY);
    }

    // Bug characters
    const labels = ['CRITICAL', 'CSS BUG', 'MEM LEAK', 'ERR 404'];
    const colors = ['#FF0000', '#FFB8FF', '#00FFFF', '#FFB852'];

    for (let i = 0; i < 4; i++) {
      const gx = 100 + i * 110;
      const gy = 340;

      // Bug body (oval)
      ctx.fillStyle = colors[i];
      ctx.beginPath();
      ctx.ellipse(gx, gy, 11, 13, 0, 0, Math.PI * 2);
      ctx.fill();

      // Antennae
      ctx.strokeStyle = colors[i];
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(gx - 3, gy - 12);
      ctx.quadraticCurveTo(gx - 8, gy - 20, gx - 10, gy - 17);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(gx + 3, gy - 12);
      ctx.quadraticCurveTo(gx + 8, gy - 20, gx + 10, gy - 17);
      ctx.stroke();

      // Legs
      ctx.lineWidth = 1;
      for (let j = 0; j < 3; j++) {
        const ly = gy - 4 + j * 5;
        ctx.beginPath();
        ctx.moveTo(gx - 10, ly);
        ctx.lineTo(gx - 15, ly + 3);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(gx + 10, ly);
        ctx.lineTo(gx + 15, ly + 3);
        ctx.stroke();
      }

      // Eyes
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.ellipse(gx - 4, gy - 4, 3, 4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(gx + 4, gy - 4, 3, 4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#000000';
      ctx.beginPath();
      ctx.arc(gx - 4, gy - 4, 1.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(gx + 4, gy - 4, 1.5, 0, Math.PI * 2);
      ctx.fill();

      // Label
      ctx.fillStyle = colors[i];
      ctx.font = '6px "Press Start 2P", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(labels[i], gx, gy + 25);
    }

    // Instructions
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '11px "Press Start 2P", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('PRESS ENTER TO DEBUG', CANVAS_WIDTH / 2, 430);

    ctx.fillStyle = '#888888';
    ctx.font = '8px "Press Start 2P", monospace';
    ctx.fillText('ARROW KEYS TO NAVIGATE', CANVAS_WIDTH / 2, 465);

    // Blinking effect
    if (Math.floor(this.frameCount / 30) % 2 === 0) {
      ctx.fillStyle = '#00FF00';
      ctx.font = '10px "Press Start 2P", monospace';
      ctx.fillText('> sudo ./start', CANVAS_WIDTH / 2, 520);
    }
  }

  private renderGameOver(): void {
    const ctx = this.ctx;

    // Draw final maze state
    drawMaze(ctx, this.gameData.maze, this.frameCount);
    drawScore(ctx, this.gameData.score, CANVAS_WIDTH);

    // Dark overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Game over text
    ctx.fillStyle = '#FF0000';
    ctx.font = 'bold 22px "Press Start 2P", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('SYSTEM CRASH', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 50);
    ctx.fillStyle = '#FF4444';
    ctx.font = '12px "Press Start 2P", monospace';
    ctx.fillText('KERNEL PANIC', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 25);

    ctx.fillStyle = '#00FF88';
    ctx.font = '10px "Press Start 2P", monospace';
    ctx.fillText(`LINES OF CODE:`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 10);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '14px "Press Start 2P", monospace';
    ctx.fillText(`${this.gameData.score}`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 30);

    ctx.fillStyle = '#00FF00';
    ctx.font = '9px "Press Start 2P", monospace';
    if (Math.floor(this.frameCount / 30) % 2 === 0) {
      ctx.fillText('> PRESS ENTER TO REBOOT', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 65);
    }
  }

  getGameState(): GameState {
    return this.gameState;
  }

  getScore(): number {
    return this.gameData.score;
  }
}
