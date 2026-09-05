'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { GAMES, getGameBySlug } from '@/lib/game';
import { submitPlayScore } from '@/lib/game/submit-score';
import GameCanvas from '@/components/game/GameCanvas';

interface LeaderboardEntry {
  rank: number;
  name: string;
  totalScore: number;
}

export default function GamePage() {
  const params = useParams();
  const slug = params.slug as string;
  const game = getGameBySlug(slug);
  const [leaderboard, setLeaderboard] = useState([]);

  useEffect(() => {
    fetch(`/api/games/scores/leaderboard?period=hourly&limit=5&gameSlug=${slug}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success && Array.isArray(data.leaderboard)) {
          setLeaderboard(data.leaderboard);
        }
      })
      .catch(() => {});
  }, [slug]);

  if (!game) {
    return (
      <div className="min-h-screen bg-[#0a0a1a] text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">Game Not Found</h1>
          <Link href="/games" className="text-purple-400 hover:text-purple-300">
            ← Back to Games
          </Link>
        </div>
      </div>
    );
  }

  const relatedGames = GAMES.filter((g) => g.id !== game.id).slice(0, 3);

  const handleScoreSubmit = async (data: {
    gameId: string;
    score: number;
    timeMs: number;
    seed: number;
    proof: string;
    fingerprint: string;
  }) => {
    try {
      const result = await submitPlayScore(data);
      if (result.ok) {
        alert(`${result.message} (+${result.xpEarned} XP via ${result.path})`);
      } else {
        alert(`Score rejected: ${result.error}`);
      }
    } catch {
      alert('Failed to submit score');
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a1a] text-white">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
          <Link href="/games" className="hover:text-purple-400">Games</Link>
          <span>/</span>
          <span className="text-gray-300">{game.name}</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Game area */}
          <div className="lg:col-span-3">
            <GameCanvas game={game} onScoreSubmit={handleScoreSubmit} />
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Game info */}
            <div className="bg-purple-900/20 border border-purple-500/20 rounded-xl p-5">
              <h2 className="text-xl font-bold mb-2">{game.name}</h2>
              <span className="inline-block px-2 py-0.5 text-xs rounded-full bg-purple-500/20 text-purple-300 capitalize mb-3">
                {game.category}
              </span>
              <p className="text-gray-400 text-sm mb-4">{game.description}</p>
              <div className="text-xs text-gray-500">
                <p className="font-medium text-gray-400 mb-1">Controls:</p>
                <p>{game.controls}</p>
              </div>
            </div>

            {/* Leaderboard */}
            <div className="bg-purple-900/20 border border-purple-500/20 rounded-xl p-5">
              <h3 className="text-lg font-bold mb-3">🏆 Leaderboard</h3>
              <div className="space-y-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className={`font-bold ${i === 1 ? 'text-yellow-400' : i === 2 ? 'text-gray-300' : i === 3 ? 'text-orange-400' : 'text-gray-500'}`}>
                        #{i}
                      </span>
                      <span className="text-gray-400">{leaderboard[i - 1] ? (leaderboard[i - 1] as LeaderboardEntry).name : '---'}</span>
                    </div>
                    <span className="text-gray-500">{leaderboard[i - 1] ? (leaderboard[i - 1] as LeaderboardEntry).totalScore.toLocaleString() : '--'}</span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-600 mt-3">Hourly leaderboard</p>
            </div>

            {/* Related games */}
            <div className="bg-purple-900/20 border border-purple-500/20 rounded-xl p-5">
              <h3 className="text-lg font-bold mb-3">More Games</h3>
              <div className="space-y-2">
                {relatedGames.map((rg) => (
                  <Link
                    key={rg.id}
                    href={`/games/${rg.id}`}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-purple-500/10 transition-colors"
                  >
                    <span className="text-2xl">
                      {rg.category === 'action' && '🥊'}
                      {rg.category === 'maze' && '🧀'}
                      {rg.category === 'survival' && '⚔️'}
                      {rg.category === 'puzzle' && '🧩'}
                      {rg.category === 'runner' && '🚀'}
                    </span>
                    <div>
                      <p className="text-sm font-medium text-white">{rg.name}</p>
                      <p className="text-xs text-gray-500 capitalize">{rg.category}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
