import { Direction, GhostMode, GhostName, TILE_SIZE, FRIGHTENED_BLINK_START, GHOST_COLORS } from './constants';
import { PacmanState, GhostState } from './types';

export function drawPacman(ctx: CanvasRenderingContext2D, pacman: PacmanState): void {
  const { position, direction, mouthAngle, dying, dyingFrame } = pacman;
  const cx = position.x;
  const cy = position.y;
  const radius = TILE_SIZE / 2 - 1;

  if (dying) {
    // Death animation - character glitches and dissolves
    const progress = dyingFrame / 60;
    if (progress >= 1) return;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.globalAlpha = 1 - progress;

    // Glitch effect - random offset
    const glitchX = (Math.random() - 0.5) * progress * 10;
    const glitchY = (Math.random() - 0.5) * progress * 10;
    ctx.translate(glitchX, glitchY);

    // Draw shrinking developer
    const s = radius * (1 - progress);
    // Head
    ctx.fillStyle = '#FFD700';
    ctx.beginPath();
    ctx.arc(0, -1, s, 0, Math.PI * 2);
    ctx.fill();
    // Glasses
    if (s > 3) {
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.rect(-s * 0.6, -s * 0.4, s * 0.5, s * 0.4);
      ctx.rect(s * 0.1, -s * 0.4, s * 0.5, s * 0.4);
      ctx.stroke();
    }

    ctx.restore();
    return;
  }

  ctx.save();
  ctx.translate(cx, cy);

  // Terminal cursor developer character
  // Head (round, yellow-ish skin tone)
  ctx.fillStyle = '#FFD700';
  ctx.beginPath();
  ctx.arc(0, -1, radius, 0, Math.PI * 2);
  ctx.fill();

  // Glasses frame
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 1.5;
  // Left lens
  ctx.beginPath();
  ctx.rect(-6, -4, 5, 4);
  ctx.stroke();
  // Right lens
  ctx.beginPath();
  ctx.rect(1, -4, 5, 4);
  ctx.stroke();
  // Bridge
  ctx.beginPath();
  ctx.moveTo(-1, -2);
  ctx.lineTo(1, -2);
  ctx.stroke();

  // Lens glare (blue tint - coder screens)
  ctx.fillStyle = 'rgba(0, 150, 255, 0.3)';
  ctx.fillRect(-5.5, -3.5, 4, 3);
  ctx.fillRect(1.5, -3.5, 4, 3);

  // Pupils that look in movement direction
  let pupilOffX = 0;
  let pupilOffY = 0;
  switch (direction) {
    case Direction.UP: pupilOffY = -1; break;
    case Direction.DOWN: pupilOffY = 1; break;
    case Direction.LEFT: pupilOffX = -1; break;
    case Direction.RIGHT: pupilOffX = 1; break;
  }
  ctx.fillStyle = '#000000';
  ctx.beginPath();
  ctx.arc(-3.5 + pupilOffX, -2 + pupilOffY, 1, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(3.5 + pupilOffX, -2 + pupilOffY, 1, 0, Math.PI * 2);
  ctx.fill();

  // Mouth that opens/closes (like talking/debugging)
  const mouthOpen = mouthAngle * 6;
  ctx.fillStyle = '#000000';
  ctx.beginPath();
  ctx.ellipse(0, 4, 3, mouthOpen, 0, 0, Math.PI * 2);
  ctx.fill();

  // Terminal cursor on forehead (blinking)
  if (Math.floor(Date.now() / 500) % 2 === 0) {
    ctx.fillStyle = '#00FF00';
    ctx.fillRect(-2, -radius + 1, 4, 2);
  }

  ctx.restore();
}

function drawBugBody(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
  color: string,
  frameCount: number
): void {
  ctx.fillStyle = color;

  // Bug body - more insect-like oval
  ctx.beginPath();
  ctx.ellipse(cx, cy, size * 0.9, size, 0, 0, Math.PI * 2);
  ctx.fill();

  // Antennae
  const antennaWave = Math.sin(frameCount * 0.15) * 2;
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(cx - 3, cy - size + 2);
  ctx.quadraticCurveTo(cx - 6 + antennaWave, cy - size - 6, cx - 8, cy - size - 4);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx + 3, cy - size + 2);
  ctx.quadraticCurveTo(cx + 6 - antennaWave, cy - size - 6, cx + 8, cy - size - 4);
  ctx.stroke();

  // Legs (3 on each side)
  ctx.lineWidth = 1;
  const legWave = Math.sin(frameCount * 0.2) * 1.5;
  for (let i = 0; i < 3; i++) {
    const ly = cy - 3 + i * 4;
    // Left legs
    ctx.beginPath();
    ctx.moveTo(cx - size * 0.8, ly);
    ctx.lineTo(cx - size - 3, ly + legWave + (i % 2 === 0 ? 2 : -2));
    ctx.stroke();
    // Right legs
    ctx.beginPath();
    ctx.moveTo(cx + size * 0.8, ly);
    ctx.lineTo(cx + size + 3, ly - legWave + (i % 2 === 0 ? 2 : -2));
    ctx.stroke();
  }
}

export function drawGhost(
  ctx: CanvasRenderingContext2D,
  ghost: GhostState,
  frameCount: number,
  frightenedTimeLeft: number
): void {
  const { position, mode, name } = ghost;
  const cx = position.x;
  const cy = position.y;
  const size = TILE_SIZE / 2 - 1;

  if (mode === GhostMode.RETURNING) {
    // Draw just the eyes when returning (bug "soul" returning)
    drawGhostEyes(ctx, cx, cy, ghost.direction, size);
    // Small code fragment
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font = '6px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('{}', cx, cy + 3);
    return;
  }

  // Determine color
  let bodyColor: string;
  let isPatched = false;
  if (mode === GhostMode.FRIGHTENED) {
    isPatched = true;
    if (frightenedTimeLeft < FRIGHTENED_BLINK_START) {
      bodyColor = Math.floor(frameCount / 10) % 2 === 0 ? '#00AA44' : '#FFFFFF';
    } else {
      bodyColor = '#00AA44';
    }
  } else {
    bodyColor = GHOST_COLORS[name];
  }

  if (isPatched) {
    // Patched/debugged bug - looks tamed, with a checkmark
    drawBugBody(ctx, cx, cy, size, bodyColor, frameCount);

    // "Patched" eyes - X eyes
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 1.5;
    // Left X
    ctx.beginPath();
    ctx.moveTo(cx - 6, cy - 5);
    ctx.lineTo(cx - 2, cy - 1);
    ctx.moveTo(cx - 2, cy - 5);
    ctx.lineTo(cx - 6, cy - 1);
    ctx.stroke();
    // Right X
    ctx.beginPath();
    ctx.moveTo(cx + 2, cy - 5);
    ctx.lineTo(cx + 6, cy - 1);
    ctx.moveTo(cx + 6, cy - 5);
    ctx.lineTo(cx + 2, cy - 1);
    ctx.stroke();

    // Checkmark
    ctx.strokeStyle = '#00FF00';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx - 3, cy + 3);
    ctx.lineTo(cx, cy + 6);
    ctx.lineTo(cx + 5, cy);
    ctx.stroke();
    return;
  }

  // Draw specific bug type based on ghost name
  switch (name) {
    case GhostName.BLINKY:
      drawCriticalBug(ctx, cx, cy, size, bodyColor, frameCount);
      break;
    case GhostName.PINKY:
      drawCSSBug(ctx, cx, cy, size, bodyColor, frameCount);
      break;
    case GhostName.INKY:
      drawMemoryBug(ctx, cx, cy, size, bodyColor, frameCount);
      break;
    case GhostName.CLYDE:
      draw404Bug(ctx, cx, cy, size, bodyColor, frameCount);
      break;
  }
}

// BLINKY = Critical Bug (skull icon)
function drawCriticalBug(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number, size: number,
  color: string, frameCount: number
): void {
  drawBugBody(ctx, cx, cy, size, color, frameCount);

  // Skull face
  ctx.fillStyle = '#000000';
  // Eye sockets
  ctx.beginPath();
  ctx.arc(cx - 3, cy - 2, 2.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx + 3, cy - 2, 2.5, 0, Math.PI * 2);
  ctx.fill();
  // Nose
  ctx.beginPath();
  ctx.moveTo(cx, cy + 1);
  ctx.lineTo(cx - 1, cy + 3);
  ctx.lineTo(cx + 1, cy + 3);
  ctx.closePath();
  ctx.fill();
  // Teeth
  ctx.fillStyle = '#FFFFFF';
  for (let i = -3; i <= 3; i += 2) {
    ctx.fillRect(cx + i - 0.5, cy + 4, 1.5, 2);
  }

  // Red glow for critical
  ctx.strokeStyle = 'rgba(255, 0, 0, 0.4)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(cx, cy, size + 2, 0, Math.PI * 2);
  ctx.stroke();
}

// PINKY = CSS Bug (with paint/brush theme)
function drawCSSBug(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number, size: number,
  color: string, frameCount: number
): void {
  drawBugBody(ctx, cx, cy, size, color, frameCount);

  // Eyes
  drawGhostEyes(ctx, cx, cy, Direction.NONE, size);

  // Paintbrush on head
  ctx.fillStyle = '#FF69B4';
  ctx.fillRect(cx - 1, cy - size - 2, 2, 5);
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(cx - 2, cy - size - 4, 4, 3);

  // CSS brackets
  ctx.fillStyle = '#FF69B4';
  ctx.font = 'bold 6px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('{ }', cx, cy + 6);
}

// INKY = Memory Leak Bug (dripping icon)
function drawMemoryBug(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number, size: number,
  color: string, frameCount: number
): void {
  drawBugBody(ctx, cx, cy, size, color, frameCount);

  // Eyes
  drawGhostEyes(ctx, cx, cy, Direction.NONE, size);

  // Memory leak drips
  const dripOffset = (frameCount % 30) / 30;
  ctx.fillStyle = '#00FFFF';
  for (let i = -1; i <= 1; i++) {
    const dx = cx + i * 4;
    const dy = cy + size + dripOffset * 6;
    ctx.beginPath();
    ctx.moveTo(dx, dy - 2);
    ctx.quadraticCurveTo(dx + 2, dy + 1, dx, dy + 3);
    ctx.quadraticCurveTo(dx - 2, dy + 1, dx, dy - 2);
    ctx.fill();
  }

  // "RAM" label
  ctx.fillStyle = '#00FFFF';
  ctx.font = '5px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('RAM', cx, cy + 2);
}

// CLYDE = 404 Bug
function draw404Bug(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number, size: number,
  color: string, frameCount: number
): void {
  drawBugBody(ctx, cx, cy, size, color, frameCount);

  // Eyes - confused look
  drawGhostEyes(ctx, cx, cy, Direction.NONE, size);

  // "404" text on body
  ctx.fillStyle = '#000000';
  ctx.font = 'bold 6px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('404', cx, cy + 5);

  // Question mark above
  ctx.fillStyle = '#FFB852';
  ctx.font = 'bold 7px monospace';
  ctx.fillText('?', cx, cy - size - 1);
}

function drawGhostEyes(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  direction: Direction,
  size: number
): void {
  // Eye whites
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.ellipse(cx - 4, cy - 3, 4, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(cx + 4, cy - 3, 4, 5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Pupils - direction dependent
  let pupilOffsetX = 0;
  let pupilOffsetY = 0;
  switch (direction) {
    case Direction.UP: pupilOffsetY = -2; break;
    case Direction.DOWN: pupilOffsetY = 2; break;
    case Direction.LEFT: pupilOffsetX = -2; break;
    case Direction.RIGHT: pupilOffsetX = 2; break;
  }

  ctx.fillStyle = '#2121DE';
  ctx.beginPath();
  ctx.arc(cx - 4 + pupilOffsetX, cy - 3 + pupilOffsetY, 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx + 4 + pupilOffsetX, cy - 3 + pupilOffsetY, 2, 0, Math.PI * 2);
  ctx.fill();
}

export function drawScore(ctx: CanvasRenderingContext2D, score: number, canvasWidth: number): void {
  ctx.fillStyle = '#00FF88';
  ctx.font = '10px "Press Start 2P", monospace';
  ctx.textAlign = 'left';
  ctx.fillText('LINES OF CODE', 10, 14);
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText(score.toString().padStart(8, '0'), 10, 30);
}

export function drawLives(ctx: CanvasRenderingContext2D, lives: number, canvasWidth: number, canvasHeight: number): void {
  for (let i = 0; i < lives - 1; i++) {
    const x = 20 + i * 25;
    const y = canvasHeight - 15;
    // Draw mini developer head for lives
    ctx.fillStyle = '#FFD700';
    ctx.beginPath();
    ctx.arc(x, y, 7, 0, Math.PI * 2);
    ctx.fill();
    // Mini glasses
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.rect(x - 5, y - 3, 4, 3);
    ctx.rect(x + 1, y - 3, 4, 3);
    ctx.stroke();
  }
}

export function drawLevel(ctx: CanvasRenderingContext2D, level: number, canvasWidth: number): void {
  ctx.fillStyle = '#00FF88';
  ctx.font = '10px "Press Start 2P", monospace';
  ctx.textAlign = 'right';
  ctx.fillText(`SPRINT ${level}`, canvasWidth - 10, 14);
}

export function drawReadyText(ctx: CanvasRenderingContext2D, canvasWidth: number, canvasHeight: number): void {
  ctx.fillStyle = '#00FF00';
  ctx.font = '14px "Press Start 2P", monospace';
  ctx.textAlign = 'center';
  ctx.fillText('COMPILING...', canvasWidth / 2, canvasHeight / 2 + 20);
}
