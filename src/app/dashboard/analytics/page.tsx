"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { TrendingUp, Gamepad2, Trophy, Gift, Coins, Bot } from "lucide-react";
import { useAuth } from "@/lib/use-auth";

interface ProfileData {
  user: {
    totalScore: number;
    totalGames: number;
    tokensEarned: number;
  };
  agents: Array<{ id: string }>;
}

function StatCard({
  icon: Icon,
  iconColor,
  label,
  value,
  delay,
}: {
  icon: React.ElementType;
  iconColor: string;
  label: string;
  value: string | number;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl p-6"
    >
      <div className="flex items-center gap-2 mb-4">
        <Icon size={18} className={iconColor} />
        <h3 className="text-lg font-semibold text-white">{label}</h3>
      </div>
      <div className="text-4xl font-bold text-white mb-1">
        {typeof value === "number" ? value.toLocaleString() : value}
      </div>
    </motion.div>
  );
}

export default function AnalyticsPage() {
  const { authToken, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ch, setCh] = useState<{ perGame: Array<{ game_slug: string; events: string; total_score: string; players: string }>; totals: Record<string, string>; recent: Array<Record<string, unknown>> } | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!authToken) {
      setError("Please log in to view analytics");
      setLoading(false);
      return;
    }

    fetch("/api/user/profile", {
      headers: { Authorization: `Bearer ${authToken}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load profile");
        return res.json();
      })
      .then((data) => {
        setProfile(data);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));

    fetch("/api/analytics", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setCh(data))
      .catch(() => setCh(null));
  }, [authToken, authLoading]);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-2">Analytics</h1>
        <p className="text-gray-400">Track your performance and earnings</p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl p-6 animate-pulse"
            >
              <div className="h-4 w-24 bg-[#1f1f1f] rounded mb-4" />
              <div className="h-10 w-32 bg-[#1f1f1f] rounded" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl p-8 text-center">
          <p className="text-gray-400">{error}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <StatCard
            icon={TrendingUp}
            iconColor="text-[#00FF88]"
            label="Total Score"
            value={profile?.user.totalScore ?? 0}
            delay={0}
          />
          <StatCard
            icon={Gamepad2}
            iconColor="text-[#A855F7]"
            label="Games Played"
            value={profile?.user.totalGames ?? 0}
            delay={0.1}
          />
          <StatCard
            icon={Coins}
            iconColor="text-[#FFD700]"
            label="Tokens Earned"
            value={profile?.user.tokensEarned ?? 0}
            delay={0.2}
          />
          <StatCard
            icon={Bot}
            iconColor="text-[#00FF88]"
            label="Active Agents"
            value={profile?.agents?.length ?? 0}
            delay={0.3}
          />
          <StatCard
            icon={Trophy}
            iconColor="text-[#A855F7]"
            label="Avg Score / Game"
            value={
              profile?.user.totalGames
                ? Math.round(
                    (profile.user.totalScore ?? 0) / profile.user.totalGames
                  )
                : 0
            }
            delay={0.4}
          />
        </div>
      )}

      <div className="mt-8">
        <div className="mb-4">
          <h2 className="text-xl font-bold text-white">Live Platform Analytics</h2>
          <p className="text-gray-400 text-sm">Real-time game activity streamed to ClickHouse Cloud</p>
        </div>
        {!ch ? (
          <div className="bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl p-8 text-center">
            <p className="text-gray-500 text-sm">Analytics backend warming up — data appears as agents play.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Per-Game Activity</h3>
              {ch.perGame.length === 0 ? (
                <p className="text-gray-500 text-sm">No game events yet.</p>
              ) : (
                <div className="space-y-3">
                  {ch.perGame.map((g) => (
                    <div key={g.game_slug} className="flex items-center justify-between border-b border-[#1f1f1f] pb-2">
                      <span className="text-white font-mono text-sm">{g.game_slug}</span>
                      <span className="text-gray-400 text-sm">
                        {Number(g.events || 0).toLocaleString()} plays · {Number(g.players || 0)} players · {Number(g.total_score || 0).toLocaleString()} pts
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Totals</h3>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-3xl font-bold text-[#00FF88]">{Number(ch.totals.total_events || 0).toLocaleString()}</div>
                  <div className="text-gray-500 text-xs mt-1">Events</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-[#A855F7]">{Number(ch.totals.total_players || 0).toLocaleString()}</div>
                  <div className="text-gray-500 text-xs mt-1">Players</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-[#FFD700]">{Number(ch.totals.total_score || 0).toLocaleString()}</div>
                  <div className="text-gray-500 text-xs mt-1">Score</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
