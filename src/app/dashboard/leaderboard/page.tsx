"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Trophy, Crown, Medal, Award } from "lucide-react";

interface LeaderboardEntry {
  rank: number;
  userId: string;
  name: string;
  totalScore: number;
  gamesPlayed: number;
  bestScore: number;
}

export default function LeaderboardPage() {
  const [period, setPeriod] = useState("daily");
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const periods = [
    { key: "hourly", label: "Hourly" },
    { key: "daily", label: "Daily" },
    { key: "weekly", label: "Weekly" },
    { key: "alltime", label: "All Time" },
  ];

  useEffect(() => {
    setLoading(true);
    fetch(`/api/games/scores/leaderboard?period=${period}&limit=50`)
      .then((r) => r.json())
      .then((data) => {
        setEntries(data.leaderboard || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [period]);

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Crown size={18} className="text-yellow-400" />;
    if (rank === 2) return <Medal size={18} className="text-gray-300" />;
    if (rank === 3) return <Award size={18} className="text-orange-400" />;
    return <span className="text-gray-500 font-mono text-sm w-[18px] text-center">{rank}</span>;
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-2">Leaderboard</h1>
        <p className="text-gray-400">Top players earn real token rewards</p>
      </div>

      <div className="flex gap-2 mb-6">
        {periods.map((p) => (
          <button
            key={p.key}
            onClick={() => setPeriod(p.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              period === p.key
                ? "bg-[#00FF88] text-black"
                : "bg-[#1a1a1a] text-gray-400 hover:text-white"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="bg-[#0a0a0a] border border-[#FFD700]/20 rounded-xl p-4 mb-6">
        <div className="flex items-center gap-2 text-[#FFD700]">
          <Trophy size={16} />
          <span className="text-sm font-medium">
            {period === "hourly" && "Hourly: Top 3 win $CLAW (1000/500/250)"}
            {period === "daily" && "Daily: Top 10 win $CLAW (5000 to 250)"}
            {period === "weekly" && "Weekly: ALL active players get $ANSEM"}
            {period === "alltime" && "All Time: Hall of Fame"}
          </span>
        </div>
      </div>

      <div className="bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl overflow-hidden">
        <div className="grid grid-cols-12 gap-4 px-6 py-3 border-b border-[#1f1f1f] text-gray-400 text-sm">
          <div className="col-span-1">Rank</div>
          <div className="col-span-5">Player</div>
          <div className="col-span-3 text-right">Score</div>
          <div className="col-span-3 text-right">Games</div>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-500">
            <p>Loading...</p>
          </div>
        ) : entries.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Trophy size={48} className="mx-auto mb-4 opacity-30" />
            <p>No scores yet. Be the first to play!</p>
          </div>
        ) : (
          entries.map((entry, i) => (
            <motion.div
              key={entry.userId}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.03 }}
              className={`grid grid-cols-12 gap-4 px-6 py-3 border-b border-[#1f1f1f] items-center ${
                entry.rank <= 3 ? "bg-[#FFD700]/5" : ""
              }`}
            >
              <div className="col-span-1">{getRankIcon(entry.rank)}</div>
              <div className="col-span-5">
                <p className="text-white text-sm font-medium">{entry.name || "Anonymous"}</p>
              </div>
              <div className="col-span-3 text-right">
                <p className="text-[#00FF88] font-mono text-sm">{entry.totalScore.toLocaleString()}</p>
              </div>
              <div className="col-span-3 text-right">
                <p className="text-gray-400 font-mono text-sm">{entry.gamesPlayed}</p>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
