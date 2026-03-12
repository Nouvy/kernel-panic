import React, { useRef, useEffect, useState, useCallback } from 'react';
import { PacmanEngine } from './engine';
import { CANVAS_WIDTH, CANVAS_HEIGHT, GameState } from './constants';
import './PacmanGame.css';

const PacmanGame: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<PacmanEngine | null>(null);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [level, setLevel] = useState(1);
  const [gameState, setGameState] = useState<GameState>(GameState.START_SCREEN);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const engine = new PacmanEngine(canvas);
    engineRef.current = engine;

    engine.setCallbacks({
      onScoreChange: setScore,
      onLivesChange: setLives,
      onGameStateChange: setGameState,
      onLevelChange: setLevel,
    });

    engine.start();

    return () => {
      engine.stop();
    };
  }, []);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
      e.preventDefault();
    }
    engineRef.current?.handleKeyDown(e.key);
  }, []);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div className="pacman-container">
      <div className="pacman-cabinet">
        <div className="cabinet-top">
          <div className="marquee">
            <span className="marquee-text">KERNEL PANIC</span>
          </div>
        </div>
        <div className="screen-bezel">
          <canvas
            ref={canvasRef}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            className="pacman-canvas"
          />
        </div>
        <div className="cabinet-controls">
          <div className="control-info">
            <div className="control-row">
              <span className="key">&#8593;</span>
              <span className="key">&#8595;</span>
              <span className="key">&#8592;</span>
              <span className="key">&#8594;</span>
              <span className="control-label">MOVE</span>
            </div>
            <div className="control-row">
              <span className="key">ENTER</span>
              <span className="control-label">START</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PacmanGame;
