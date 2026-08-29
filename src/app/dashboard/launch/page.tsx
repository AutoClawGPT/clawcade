"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Rocket, Bot, Wallet, Loader2 } from "lucide-react";

interface ClawAgent {
  id: string;
  name: string;
  status: string;
  walletAddress: string;
  model: string;
  skills: string[];
}

export default function LaunchPage() {
  const [agents, setAgents] = useState<ClawAgent[]>([]);
  const [agentId, setAgentId] = useState("");
  const [hasKey, setHasKey] = useState(false);

  const [name, setName] = useState("");
  const [symbol, setSymbol] = useState("");
  const [description, setDescription] = useState("");
  const [payoutWallet, setPayoutWallet] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<unknown>(null);

  const loadAgents = useCallback(() => {
    const token = localStorage.getItem("authToken");
    if (!token) return;
    fetch("/api/user/settings", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((data) => {
        setHasKey(data.hasClawpumpKey || false);
        const list = data.clawpump?.agents || [];
        setAgents(list);
        if (list.length > 0) {
          setAgentId(list[0].id);
          if (!payoutWallet && list[0].walletAddress) setPayoutWallet(list[0].walletAddress);
        }
      })
      .catch(() => {});
  }, [payoutWallet]);

  useEffect(() => {
    loadAgents();
  }, [loadAgents]);

  async function launch(mode: "pons" | "gasless") {
    const token = localStorage.getItem("authToken");
    if (!token || !agentId) return;
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const body =
        mode === "pons"
          ? { mode: "pons", agentId, name, symbol, description, payoutWallet }
          : mode === "selffunded"
          ? { mode: "selffunded", agentId, name, symbol, description }
          : { mode: "gasless", agentId, symbol, description, name };

      const res = await fetch("/api/clawpump/launch", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Launch failed");
        return;
      }
      setResult(data.result || data);
    } catch {
      setError("Network error. Try again.");
    } finally {
      setLoading(false);
    }
  }

  if (!hasKey) {
    return (
      <div className="bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl p-8 text-center">
        <Rocket size={40} className="mx-auto mb-4 text-gray-500" />
        <h3 className="text-lg font-semibold text-white mb-2">Connect your ClawPump key</h3>
        <p className="text-gray-400 text-sm mb-4">
          Connect your own cpk_ key in Settings to launch tokens.
        </p>
        <a href="/dashboard/settings" className="inline-flex items-center gap-2 bg-[#00FF88] text-black font-semibold px-4 py-2 rounded-lg">
          Go to Settings
        </a>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-2">Launch Studio</h1>
        <p className="text-gray-400">Launch gasless or self-funded tokens (PONS, pump.fun) from your agents</p>
      </div>

      <div className="max-w-2xl space-y-6">
        {/* Agent selector */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Bot size={18} className="text-[#00FF88]" />
            <h3 className="text-lg font-semibold text-white">Launching Agent</h3>
          </div>
          <select
            value={agentId}
            onChange={(e) => {
              setAgentId(e.target.value);
              const ag = agents.find((a) => a.id === e.target.value);
              if (ag?.walletAddress) setPayoutWallet(ag.walletAddress);
            }}
            className="w-full bg-black border border-[#1f1f1f] rounded-lg px-3 py-2.5 text-white focus:border-[#00FF88] focus:outline-none"
          >
            {agents.length === 0 && <option value="">No agents found</option>}
            {agents.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} ({a.status})
              </option>
            ))}
          </select>
        </motion.div>

        {/* Form */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Token Details</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-2">Token Name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="My Token"
                className="w-full bg-black border border-[#1f1f1f] rounded-lg px-4 py-2.5 text-white focus:border-[#00FF88] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-2">Symbol</label>
              <input
                value={symbol}
                onChange={(e) => setSymbol(e.target.value)}
                placeholder="TICKER"
                maxLength={12}
                className="w-full bg-black border border-[#1f1f1f] rounded-lg px-4 py-2.5 text-white focus:border-[#00FF88] focus:outline-none uppercase"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-2">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe your token..."
                rows={4}
                className="w-full bg-black border border-[#1f1f1f] rounded-lg px-4 py-2.5 text-white focus:border-[#00FF88] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-2">Payout Wallet (PONS)</label>
              <div className="flex items-center gap-2">
                <Wallet size={16} className="text-gray-500" />
                <input
                  value={payoutWallet}
                  onChange={(e) => setPayoutWallet(e.target.value)}
                  placeholder="Solana wallet for rewards"
                  className="w-full bg-black border border-[#1f1f1f] rounded-lg px-4 py-2.5 text-white focus:border-[#00FF88] focus:outline-none font-mono text-sm"
                />
              </div>
            </div>
          </div>

          {error && <p className="text-red-400 text-sm mt-4 border border-red-500/30 bg-red-500/10 rounded-lg px-3 py-2">{error}</p>}

          {result && (
            <pre className="mt-4 bg-black border border-[#00FF88]/30 rounded-lg p-3 text-xs text-[#00FF88] overflow-auto max-h-40">
              {JSON.stringify(result, null, 2)}
            </pre>
          )}

          <div className="flex flex-col sm:flex-row gap-3 mt-6">
            <button
              onClick={() => launch("pons")}
              disabled={loading || !agentId || !name || !symbol || !payoutWallet}
              className="flex items-center justify-center gap-2 bg-[#A855F7] text-white font-semibold px-6 py-3 rounded-lg hover:bg-[#A855F7]/90 transition-colors disabled:opacity-50 text-sm flex-1"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Rocket size={16} />}
              Launch PONS (Robinhood Chain, gasless)
            </button>
            <button
              onClick={() => launch("gasless")}
              disabled={loading || !agentId || !symbol || !description}
              className="flex items-center justify-center gap-2 bg-[#00FF88] text-black font-semibold px-6 py-3 rounded-lg hover:bg-[#00FF88]/90 transition-colors disabled:opacity-50 text-sm flex-1"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Rocket size={16} />}
              Launch pump.fun (Gasless)
            </button>
            <button
              onClick={() => launch("selffunded")}
              disabled={loading || !agentId || !name || !symbol}
              className="flex items-center justify-center gap-2 bg-[#FFD700] text-black font-semibold px-6 py-3 rounded-lg hover:bg-[#FFD700]/90 transition-colors disabled:opacity-50 text-sm flex-1"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Wallet size={16} />}
              Launch Self-Funded
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
