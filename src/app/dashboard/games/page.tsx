"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { Play } from "lucide-react";

interface Game {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  category: string | null;
  difficulty: string | null;
  maxScore: number;
  isActive: boolean;
}

export default function GamesPage() {
  const [games, setGames] = useState<Game[]>([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/games")
      .then((r) => r.json())
      .then((data) => {
        if (data.games) setGames(data.games);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const categories = ["all", ...Array.from(new Set(games.map((g) => g.category || "")))];
  const filtered = filter === "all" ? games : games.filter((g) => g.category === filter);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-2">Games</h1>
        <p className="text-gray-400">Play games, earn real tokens</p>
      </div>

      <div className="flex gap-2 mb-6 flex-wrap">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
              filter === cat
                ? "bg-[#00FF88]/10 text-[#00FF88] border-[#00FF88]/30"
                : "text-gray-400 border-[#1f1f1f] hover:text-white"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-gray-500">Loading games...</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((game, i) => (
            <motion.div
              key={game.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl p-5 hover:border-[#00FF88]/40 transition-colors"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-gray-500 text-xs uppercase tracking-wide">
                  {game.category || "Arcade"}
                </span>
                <span className="text-gray-600 text-xs">{game.difficulty || "Medium"}</span>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">{game.name}</h3>
              <p className="text-gray-400 text-sm mb-4">{game.description}</p>
              <Link
                href={`/dashboard/games/${game.slug}`}
                className="inline-flex items-center gap-2 bg-[#00FF88] text-black font-semibold px-4 py-2 rounded-lg hover:bg-[#00FF88]/90 transition-colors text-sm"
              >
                <Play size={14} />
                Play
              </Link>
            </motion.div>
          ))}
          {filtered.length === 0 && (
            <p className="text-gray-500">No games in this category.</p>
          )}
        </div>
      )}
    </div>
  );
}
