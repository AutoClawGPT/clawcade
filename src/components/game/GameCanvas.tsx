'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { GameEngine, GameState, GameConfig } from '@/lib/game/engine';
import { generateProof, getFingerprint } from '@/lib/game/anti-cheat';

export interface GameFactory {
  id: string;
  name: string;
  category: string;
  description: string;
  controls: string;
  create: (engine: GameEngine) => void;
}

interface GameCanvasProps {
  game: GameFactory;
  onScoreSubmit?: (data: {
    gameId: string;
    score: number;
    timeMs: number;
    seed: number;
    proof: string;
    fingerprint: string;
  }) => void;
}

export default function GameCanvas({ game, onScoreSubmit }: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const [state, setState] = useState<GameState>('idle');
  const [score, setScore] = useState(0);
  const [time, setTime] = useState(0);
  const seedRef = useRef(0);

  const formatTime = (ms: number) => {
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    return `${m}:${(s % 60).toString().padStart(2, '0')}`;
  };

  const initEngine = useCallback(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const parent = canvas.parentElement;
    const w = Math.min(parent?.clientWidth || 800, 800);
    const h = Math.min(600, Math.floor(w * 0.75));

    seedRef.current = Math.floor(Math.random() * 2147483647);

    const config: GameConfig = {
      canvas,
      width: w,
      height: h,
      seed: seedRef.current,
      onScoreChange: setScore,
      onStateChange: setState,
      onTimeChange: setTime,
    };

    const engine = new GameEngine(config);
    engineRef.current = engine;
    game.create(engine);
    engine.start();
  }, [game]);

  const handleRestart = () => {
    engineRef.current?.stop();
    initEngine();
  };

  const handlePause = () => {
    if (state === 'playing') engineRef.current?.pause();
    else if (state === 'paused') engineRef.current?.resume();
  };

  const handleSubmit = async () => {
    const engine = engineRef.current;
    if (!engine) return;
    const proof = await generateProof(seedRef.current, engine.moves);
    onScoreSubmit?.({
      gameId: game.id,
      score,
      timeMs: time,
      seed: seedRef.current,
      proof,
      fingerprint: getFingerprint(),
    });
  };

  useEffect(() => {
    initEngine();
    return () => engineRef.current?.stop();
  }, [initEngine]);

  return (
    <div className="relative w-full max-w-[800px] mx-auto">
      {/* HUD */}
      <div className="flex justify-between items-center mb-2 px-2 text-sm">
        <div className="font-mono text-green-400">SCORE: {score.toLocaleString()}</div>
        <div className="font-mono text-yellow-400">{game.name}</div>
        <div className="font-mono text-blue-400">TIME: {formatTime(time)}</div>
      </div>

      {/* Canvas */}
      <div className="relative bg-black rounded-lg overflow-hidden border border-purple-500/30">
        <canvas ref={canvasRef} className="w-full block" style={{ imageRendering: 'pixelated' }} />

        {/* Overlay states */}
        {state === 'idle' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/70">
            <button
              onClick={initEngine}
              className="px-8 py-4 bg-purple-600 hover:bg-purple-500 rounded-lg text-xl font-bold text-white transition-colors"
            >
              START GAME
            </button>
          </div>
        )}

        {state === 'paused' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60">
            <div className="text-center">
              <p className="text-3xl font-bold text-yellow-400 mb-4">PAUSED</p>
              <button
                onClick={handlePause}
                className="px-6 py-3 bg-green-600 hover:bg-green-500 rounded-lg text-lg font-bold text-white"
              >
                RESUME
              </button>
            </div>
          </div>
        )}

        {state === 'gameover' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/70">
            <div className="text-center">
              <p className="text-4xl font-bold text-red-500 mb-2">GAME OVER</p>
              <p className="text-2xl text-white mb-1">Score: {score.toLocaleString()}</p>
              <p className="text-lg text-gray-400 mb-6">Time: {formatTime(time)}</p>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={handleRestart}
                  className="px-6 py-3 bg-purple-600 hover:bg-purple-500 rounded-lg font-bold text-white"
                >
                  PLAY AGAIN
                </button>
                {onScoreSubmit && (
                  <button
                    onClick={handleSubmit}
                    className="px-6 py-3 bg-green-600 hover:bg-green-500 rounded-lg font-bold text-white"
                  >
                    SUBMIT SCORE
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Controls bar */}
      <div className="flex gap-2 mt-2 px-2">
        {(state === 'playing' || state === 'paused') && (
          <button
            onClick={handlePause}
            className="px-4 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-sm text-white"
          >
            {state === 'paused' ? '▶ Resume' : '⏸ Pause'}
          </button>
        )}
        {state !== 'idle' && (
          <button
            onClick={handleRestart}
            className="px-4 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-sm text-white"
          >
            ↺ Restart
          </button>
        )}
      </div>

      {/* Controls hint */}
      <div className="mt-3 px-2 text-xs text-gray-500">
        <p><strong>Controls:</strong> {game.controls}</p>
        <p><strong>P:</strong> Pause | <strong>R:</strong> Restart</p>
      </div>
    </div>
  );
}
