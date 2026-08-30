"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Activity, Clock, Calendar, Star, Wallet, ExternalLink, RefreshCw, Hash } from "lucide-react";

interface Distribution {
  id: string;
  period: string;
  token: string;
  actorType: string;
  actorName: string;
  score: number;
  points: number;
  amount: number;
  wallet: string;
  txSignature: string;
  txStatus: string;
  distributedAt: string;
}

interface ScheduleInfo {
  hourly: { token: string; live: boolean; note: string };
  daily: { token: string; live: boolean; note: string };
  weekly: { token: string; live: boolean; note: string };
}

interface DistInfo {
  schedule: ScheduleInfo;
  conversion: {
    rule: string;
    scoreToPoints: string;
    pointsToTokens: string;
    caps: Record<string, number>;
  };
  treasuryWallet: string | null;
  platformTokenMint: string | null;
}

const STATUS_STYLES: Record<string, string> = {
  confirmed: "bg-[#00FF88]/10 text-[#00FF88] border-[#00FF88]/30",
  paid: "bg-[#00FF88]/10 text-[#00FF88] border-[#00FF88]/30",
  pending_sign: "bg-[#FFD700]/10 text-[#FFD700] border-[#FFD700]/30",
  pending_payout: "bg-[#FFD700]/10 text-[#FFD700] border-[#FFD700]/30",
  scheduled: "bg-[#1DA1F2]/10 text-[#1DA1F2] border-[#1DA1F2]/30",
};

export default function DistributionsPage() {
  const [distributions, setDistributions] = useState<Distribution[]>([]);
  const [info, setInfo] = useState<DistInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const [ledgerRes, infoRes] = await Promise.all([
        fetch("/api/rewards/distributions?limit=100"),
        fetch("/api/rewards"),
      ]);
      const ledger = await ledgerRes.json();
      const info = await infoRes.json();
      setDistributions(ledger.distributions || []);
      setInfo({ schedule: info.schedule, conversion: info.conversion, treasuryWallet: info.platformToken?.address || null, platformTokenMint: info.platformToken?.address || null });
    } catch {
      setError("Failed to load distribution data");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const caps = info?.conversion?.caps || {};

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white mb-2">Live Distributions</h1>
          <p className="text-gray-400">Real-time token payouts — score is converted to points, points to tokens. Never mixed.</p>
        </div>
        <button onClick={load} className="flex items-center gap-2 text-sm bg-white/5 border border-white/10 px-4 py-2 rounded-lg hover:bg-white/10 text-white">
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* Conversion rule banner */}
      <div className="bg-[#0a0a0a] border border-[#A855F7]/30 rounded-xl p-5 mb-6">
        <div className="flex items-center gap-2 mb-2">
          <Activity className="w-5 h-5 text-[#A855F7]" />
          <h3 className="text-lg font-semibold text-white">Score → Points → Tokens</h3>
        </div>
        <p className="text-gray-300 text-sm mb-2">{info?.conversion?.rule || "100,000 score = 10,000 points; 10,000 points = 100 CLAW / 10 ANSEM / 1,000 PLATFORM"}</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
          <div className="bg-black border border-white/10 rounded-lg p-3">
            <p className="text-gray-500 text-xs mb-1">Score → Points</p>
            <p className="text-white font-mono">{info?.conversion?.scoreToPoints || "score ÷ 10"}</p>
          </div>
          <div className="bg-black border border-white/10 rounded-lg p-3">
            <p className="text-gray-500 text-xs mb-1">Points → Tokens</p>
            <p className="text-white font-mono">{info?.conversion?.pointsToTokens || "CLAW ÷100 · ANSEM ÷1000 · PLATFORM ×0.1"}</p>
          </div>
          <div className="bg-black border border-white/10 rounded-lg p-3">
            <p className="text-gray-500 text-xs mb-1">Caps</p>
            <p className="text-white font-mono">CLAW {caps.CLAW || 100} · ANSEM {caps.ANSEM || 100} · PLATFORM {caps.PLATFORM || 1000}</p>
          </div>
        </div>
      </div>

      {/* Schedule */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {[
          { key: "hourly", icon: Clock, token: info?.schedule?.hourly?.token || "PLATFORM", note: info?.schedule?.hourly?.note || "Top players each hour", live: !!info?.schedule?.hourly?.live, color: "#00FF88" },
          { key: "daily", icon: Calendar, token: info?.schedule?.daily?.token || "CLAW", note: info?.schedule?.daily?.note || "1x per day", live: true, color: "#A855F7" },
          { key: "weekly", icon: Star, token: info?.schedule?.weekly?.token || "ANSEM", note: info?.schedule?.weekly?.note || "1x per week", live: true, color: "#FFD700" },
        ].map((s, i) => (
          <motion.div key={s.key} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
            className="bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl p-5" style={{ borderColor: s.color + "30" }}>
            <div className="flex items-center gap-2 mb-2">
              <s.icon size={18} style={{ color: s.color }} />
              <h3 className="font-semibold text-white capitalize">{s.key}</h3>
              {s.live
                ? <span className="text-[10px] text-[#00FF88] bg-[#00FF88]/10 border border-[#00FF88]/30 px-2 py-0.5 rounded-full uppercase">Live</span>
                : <span className="text-[10px] text-[#1DA1F2] bg-[#1DA1F2]/10 border border-[#1DA1F2]/30 px-2 py-0.5 rounded-full uppercase">Scheduled</span>}
            </div>
            <p className="text-2xl font-bold mb-1" style={{ color: s.color }}>{s.token}</p>
            <p className="text-gray-500 text-xs">{s.note}</p>
          </motion.div>
        ))}
      </div>

      {/* Live ledger */}
      <div className="bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-[#1f1f1f]">
          <Hash className="w-5 h-5 text-[#A855F7]" />
          <h3 className="text-lg font-semibold text-white">Distribution Transactions</h3>
          <span className="text-xs text-gray-500 ml-auto">{distributions.length} records</span>
        </div>
        {loading ? (
          <p className="text-gray-500 text-sm p-6">Loading live ledger...</p>
        ) : error ? (
          <p className="text-red-400 text-sm p-6">{error}</p>
        ) : distributions.length === 0 ? (
          <div className="p-6 text-center">
            <p className="text-gray-500 text-sm mb-1">No distributions yet</p>
            <p className="text-gray-600 text-xs">Play games with a reward SOL wallet set — hourly/daily/weekly drops will appear here with live tx hashes.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 text-xs border-b border-[#1f1f1f]">
                  <th className="px-5 py-3">Agent / Player</th>
                  <th className="px-4 py-3">Period</th>
                  <th className="px-4 py-3">Token</th>
                  <th className="px-4 py-3 text-right">Score</th>
                  <th className="px-4 py-3 text-right">Points</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                  <th className="px-4 py-3">Wallet</th>
                  <th className="px-4 py-3">Tx Hash</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {distributions.map((d) => (
                  <tr key={d.id} className="border-b border-[#111] hover:bg-white/5">
                    <td className="px-5 py-3 text-white">{d.actorName}</td>
                    <td className="px-4 py-3 text-gray-400">{d.period}</td>
                    <td className="px-4 py-3 font-mono">${d.token}</td>
                    <td className="px-4 py-3 text-right text-gray-300">{d.score.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right text-[#A855F7]">{d.points.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right text-[#00FF88] font-semibold">{d.amount}</td>
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-1 text-gray-400 font-mono text-xs truncate max-w-[160px]">
                        <Wallet className="w-3 h-3 shrink-0" /> {d.wallet ? d.wallet.slice(0, 10) + "..." : "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {d.txSignature ? (
                        <a href={`https://solscan.io/tx/${d.txSignature}`} target="_blank" rel="noreferrer"
                          className="flex items-center gap-1 text-[#1DA1F2] hover:underline font-mono text-xs">
                          {d.txSignature.slice(0, 10)}... <ExternalLink className="w-3 h-3" />
                        </a>
                      ) : (
                        <span className="text-gray-600 font-mono text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] px-2 py-1 rounded-full border uppercase ${STATUS_STYLES[d.txStatus] || STATUS_STYLES.scheduled}`}>
                        {d.txStatus}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
