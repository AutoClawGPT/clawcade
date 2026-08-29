'use client';

import Link from 'next/link';
import { GAMES } from '@/lib/game';

const categories = ['all', 'action', 'maze', 'survival', 'puzzle', 'runner'];

export default function GamesPage() {
  return (
    <div className="min-h-screen bg-[#0a0a1a] text-white">
      <div className="max-w-6xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-black mb-4">
            <span className="text-purple-400">CLAW</span>
            <span className="text-yellow-400">CADE</span>
            <span className="text-green-400 ml-3">GAMES</span>
          </h1>
          <p className="text-gray-400 text-lg">
            Play. Earn $CLAW. Climb the leaderboard. 🐱
          </p>
        </div>

        {/* Category filters */}
        <div className="flex flex-wrap justify-center gap-2 mb-10">
          {categories.map((cat) => (
            <button
              key={cat}
              className="px-4 py-2 rounded-full text-sm font-medium border border-purple-500/30 bg-purple-500/10 hover:bg-purple-500/25 text-purple-300 transition-colors capitalize"
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Games grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {GAMES.map((game) => (
            <Link
              key={game.id}
              href={`/games/${game.id}`}
              className="group block bg-gradient-to-br from-purple-900/40 to-indigo-900/40 border border-purple-500/20 rounded-xl overflow-hidden hover:border-purple-400/50 hover:shadow-lg hover:shadow-purple-500/10 transition-all"
            >
              {/* Game preview placeholder */}
              <div className="h-48 bg-gradient-to-br from-purple-800/30 to-indigo-800/30 flex items-center justify-center relative overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(168,85,247,0.1),transparent_70%)]" />
                <span className="text-6xl group-hover:scale-110 transition-transform">
                  {game.category === 'action' && '🥊'}
                  {game.category === 'maze' && '🧀'}
                  {game.category === 'survival' && '⚔️'}
                  {game.category === 'puzzle' && '🧩'}
                  {game.category === 'runner' && '🚀'}
                </span>
              </div>

              <div className="p-5">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-xl font-bold text-white group-hover:text-purple-300 transition-colors">
                    {game.name}
                  </h3>
                </div>
                <span className="inline-block px-2 py-0.5 text-xs rounded-full bg-purple-500/20 text-purple-300 capitalize mb-3">
                  {game.category}
                </span>
                <p className="text-gray-400 text-sm line-clamp-2">{game.description}</p>

                <div className="mt-4 flex items-center justify-end">
                  <span className="text-purple-400 text-sm font-medium group-hover:translate-x-1 transition-transform inline-block">
                    Play →
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
