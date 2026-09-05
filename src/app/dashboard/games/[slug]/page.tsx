'use client';

import { useParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { GAMES, getGameBySlug } from '@/lib/game';
import { submitPlayScore } from '@/lib/game/submit-score';
import GameCanvas from '@/components/game/GameCanvas';

interface LeaderboardEntry {
  rank: number;
  name: string;
  totalScore: number;
}

export default function DashboardGamePage() {
  const params = useParams();
  const slug = params.slug as string;
  const game = getGameBySlug(slug);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);

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
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Game Not Found</h1>
          <Link href="/dashboard/games" className="text-[#00FF88] hover:underline">
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

  const rankColors = ['text-yellow-400', 'text-gray-300', 'text-orange-400', 'text-gray-500', 'text-gray-500'];

  return (
    <div>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
        <Link href="/dashboard/games" className="hover:text-[#00FF88]">Games</Link>
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
          <div className="bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl p-5">
            <h2 className="text-xl font-bold text-white mb-2">{game.name}</h2>
            <span className="inline-block px-2 py-0.5 text-xs rounded bg-[#00FF88]/10 text-[#00FF88] capitalize mb-3">
              {game.category}
            </span>
            <p className="text-gray-400 text-sm mb-4">{game.description}</p>
            <div className="text-xs text-gray-500">
              <p className="font-medium text-gray-400 mb-1">Controls:</p>
              <p>{game.controls}</p>
            </div>
          </div>

          {/* Leaderboard */}
          <div className="bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl p-5">
            <h3 className="text-lg font-bold text-white mb-3">🏆 Leaderboard</h3>
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => {
                const entry = leaderboard[i - 1];
                return (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className={`font-bold ${rankColors[i - 1]}`}>
                        #{i}
                      </span>
                      <span className="text-gray-400">
                        {entry ? entry.name : '---'}
                      </span>
                    </div>
                    <span className="text-gray-500">
                      {entry ? entry.totalScore.toLocaleString() : '--'}
                    </span>
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-gray-600 mt-3">Hourly leaderboard</p>
          </div>

          {/* Related games */}
          <div className="bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl p-5">
            <h3 className="text-lg font-bold text-white mb-3">More Games</h3>
            <div className="space-y-2">
              {relatedGames.map((rg) => (
                <Link
                  key={rg.id}
                  href={`/dashboard/games/${rg.id}`}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors"
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
  );
}
