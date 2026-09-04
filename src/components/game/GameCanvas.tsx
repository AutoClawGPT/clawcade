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
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    seedRef.current = Math.floor(Math.random() * 2147483647);

    const config: GameConfig = {
      canvas,
      width: w,
      height: h,
      dpr,
      seed: seedRef.current,
      onScoreChange: setScore,
      onStateChange: setState,
      onTimeChange: setTime,
    };

    const engine = new GameEngine(config);
    engineRef.current = engine;
    game.create(engine);
    // Do NOT auto-start: show the START overlay so the player clicks to begin.
  }, [game]);

  const handleStart = () => {
    const eng = engineRef.current;
    if (!eng) return;
    // Resume AudioContext on user gesture (browsers mute until then)
    eng.sound.resume();
    if (state === 'playing' || state === 'paused') {
      // Restart cleanly: stop (detach listeners) then rebuild to avoid duplicates
      eng.stop();
      initEngine();
      setTimeout(() => {
        engineRef.current?.sound.resume();
        engineRef.current?.start();
      }, 50);
    } else {
      eng.start();
    }
  };

  const handleRestart = () => {
    engineRef.current?.sound.resume();
    engineRef.current?.stop();
    initEngine();
    // Small delay so the new engine is ready before starting
    setTimeout(() => {
      engineRef.current?.sound.resume();
      engineRef.current?.start();
    }, 50);
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

  // Mobile touch controls: map on-screen buttons to engine key edges + held state.
  const keyDown = (keys: string[]) => (e: React.PointerEvent) => {
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    const eng = engineRef.current;
    if (!eng) return;
    keys.forEach((k) => eng.simulateKeyDown(k));
  };
  const keyUp = (keys: string[]) => (e: React.PointerEvent) => {
    e.preventDefault();
    const eng = engineRef.current;
    if (!eng) return;
    keys.forEach((k) => eng.simulateKeyUp(k));
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
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70">
            <button
              onClick={handleStart}
              className="px-8 py-4 bg-purple-600 hover:bg-purple-500 rounded-lg text-xl font-bold text-white transition-colors active:scale-95 cursor-pointer"
            >
              ▶ START GAME
            </button>
            <p className="text-xs text-gray-400 mt-3 max-w-sm text-center px-4">
              {onScoreSubmit ? "Sign in and play to submit your score. Rewards and leaderboard need a ClawCade account." : "Play — arrow keys / WASD to move. Score auto-verifies."}
            </p>
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
            className="px-5 py-2.5 bg-gray-700 hover:bg-gray-600 rounded text-sm text-white font-semibold cursor-pointer active:scale-95"
          >
            {state === 'paused' ? '▶ Resume' : '⏸ Pause'}
          </button>
        )}
        {state !== 'idle' && (
          <button
            onClick={handleRestart}
            className="px-5 py-2.5 bg-purple-600 hover:bg-purple-500 rounded text-sm text-white font-semibold cursor-pointer active:scale-95"
          >
            ↻ Restart
          </button>
        )}
      </div>

      {/* Controls hint */}
      <div className="mt-3 px-2 text-xs text-gray-500">
        <p><strong>Controls:</strong> {game.controls}</p>
        <p><strong>P:</strong> Pause | <strong>R:</strong> Restart</p>
      </div>

      {/* Mobile touch controls — full D-pad + A/B always (never strip buttons) */}
      {state === 'playing' && (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:hidden select-none touch-none">
          <div className="grid grid-cols-3 gap-2 justify-items-center">
            <div />
            <button type="button" aria-label="Up" onPointerDown={keyDown(['ArrowUp', 'w'])} onPointerUp={keyUp(['ArrowUp', 'w'])} onPointerCancel={keyUp(['ArrowUp', 'w'])} className="w-[4.25rem] h-[4.25rem] rounded-xl bg-white/10 border border-white/25 text-white text-2xl active:bg-white/30 touch-none">▲</button>
            <div />
            <button type="button" aria-label="Left" onPointerDown={keyDown(['ArrowLeft', 'a'])} onPointerUp={keyUp(['ArrowLeft', 'a'])} onPointerCancel={keyUp(['ArrowLeft', 'a'])} className="w-[4.25rem] h-[4.25rem] rounded-xl bg-white/10 border border-white/25 text-white text-2xl active:bg-white/30 touch-none">◀</button>
            <div className="w-[4.25rem] h-[4.25rem]" />
            <button type="button" aria-label="Right" onPointerDown={keyDown(['ArrowRight', 'd'])} onPointerUp={keyUp(['ArrowRight', 'd'])} onPointerCancel={keyUp(['ArrowRight', 'd'])} className="w-[4.25rem] h-[4.25rem] rounded-xl bg-white/10 border border-white/25 text-white text-2xl active:bg-white/30 touch-none">▶</button>
            <div />
            <button type="button" aria-label="Down" onPointerDown={keyDown(['ArrowDown', 's'])} onPointerUp={keyUp(['ArrowDown', 's'])} onPointerCancel={keyUp(['ArrowDown', 's'])} className="w-[4.25rem] h-[4.25rem] rounded-xl bg-white/10 border border-white/25 text-white text-2xl active:bg-white/30 touch-none">▼</button>
            <div />
          </div>
          <div className="flex flex-col items-center justify-center gap-3">
            <button type="button" aria-label="A boost" onPointerDown={keyDown(['z', ' '])} onPointerUp={keyUp(['z', ' '])} onPointerCancel={keyUp(['z', ' '])} className="w-20 h-16 rounded-xl bg-[#00FF88]/20 border border-[#00FF88]/40 text-[#00FF88] text-base font-bold active:bg-[#00FF88]/40 touch-none">A</button>
            <button type="button" aria-label="B brake" onPointerDown={keyDown(['x', 'Enter'])} onPointerUp={keyUp(['x', 'Enter'])} onPointerCancel={keyUp(['x', 'Enter'])} className="w-20 h-16 rounded-xl bg-[#A855F7]/20 border border-[#A855F7]/40 text-[#A855F7] text-base font-bold active:bg-[#A855F7]/40 touch-none">B</button>
          </div>
        </div>
      )}
    </div>
  );
}
