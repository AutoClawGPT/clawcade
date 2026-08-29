"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { Gamepad2, Play } from "lucide-react";

const GAMES = [
  {
    name: "Crypto Smash",
    slug: "crypto-smash",
    description: "Defeat rug-pull enemies in this fighter game",
    category: "Action",
    difficulty: "Medium",
    emoji: "\ud83e\udd4a",
  },
  {
    name: "Chomper",
    slug: "chomper",
    description: "Collect $CLAW tokens in a maze. Avoid the bears!",
    category: "Arcade",
    difficulty: "Easy",
    emoji: "\ud83d\udc31",
  },
  {
    name: "Swarm",
    slug: "swarm",
    description: "Survive endless waves of enemies",
    category: "Survival",
    difficulty: "Hard",
    emoji: "\ud83d\udc1d",
  },
  {
    name: "Cascade",
    slug: "cascade",
    description: "Match crypto symbols for massive combos",
    category: "Puzzle",
    difficulty: "Medium",
    emoji: "\ud83d\udc8e",
  },
  {
    name: "Rocket Ride",
    slug: "rocket-ride",
    description: "Ride the green candle to the moon!",
    category: "Runner",
    difficulty: "Medium",
    emoji: "\ud83d\ude80",
  },
];

export default function GamesPage() {
  const [filter, setFilter] = useState("all");
  const categories = ["all", "Action", "Arcade", "Survival", "Puzzle", "Runner"];
  const filtered = filter === "all" ? GAMES : GAMES.filter((g) => g.category === filter);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-2">Games</h1>
        <p className="text-gray-400">Play games, earn real tokens</p>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filter === cat
                ? "bg-[#00FF88] text-black"
                : "bg-[#1a1a1a] text-gray-400 hover:text-white"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map((game, i) => (
          <motion.div
            key={game.slug}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <Link href={"/dashboard/games/" + game.slug}>
              <div className="bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl p-6 hover:border-[#00FF88]/30 transition-all cursor-pointer group">
                <div className="text-4xl mb-4">{game.emoji}</div>
                <h3 className="text-lg font-semibold text-white mb-1 group-hover:text-[#00FF88] transition-colors">
                  {game.name}
                </h3>
                <p className="text-gray-400 text-sm mb-4">{game.description}</p>
                <div className="flex items-center justify-between">
                  <span className="text-xs px-2 py-1 rounded bg-[#1a1a1a] text-gray-400">
                    {game.category}
                  </span>
                  <span className="text-xs text-gray-500">{game.difficulty}</span>
                </div>
                <div className="mt-4 flex items-center gap-1 text-[#00FF88] opacity-0 group-hover:opacity-100 transition-opacity">
                  <Play size={14} />
                  <span className="text-sm font-medium">Play Now</span>
                </div>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
