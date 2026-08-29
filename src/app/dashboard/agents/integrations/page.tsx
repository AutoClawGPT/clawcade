"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Plug, Key, Check, ExternalLink, Bot, RefreshCw } from "lucide-react";

interface ClawAgent {
  id: string;
  name: string;
  status: string;
  walletAddress: string;
  skills: string[];
}

export default function IntegrationsPage() {
  const [hasKey, setHasKey] = useState(false);
  const [clawAgents, setClawAgents] = useState<ClawAgent[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    const token = localStorage.getItem("authToken");
    if (!token) { setLoading(false); return; }
    setLoading(true);
    fetch("/api/user/settings", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        setHasKey(data.hasClawpumpKey || false);
        setClawAgents(data.clawpump?.agents || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const integrations = [
    {
      name: "ClawPump",
      description: "Solana agent launchpad — gasless pump.fun tokens, swaps via Jupiter, perps on Phoenix, agent marketplace, 122+ MCP tools.",
      url: "https://clawpump.tech",
      keyFormat: "cpk_...",
      features: ["Agent launch", "Swap / Jupiter", "Token create", "PONS launches", "Marketplace"],
      connected: hasKey,
    },
    {
      name: "Pump.fun",
      description: "Solana token launchpad. Launch and trade tokens (via ClawPump).",
      url: "https://pump.fun",
      features: ["Token data", "Trading", "Analytics"],
      connected: hasKey,
    },
    {
      name: "PayBox",
      description: "Non-custodial agent wallet with spending limits and signing.",
      url: "https://app.paybox.sh",
      features: ["Wallet", "Spending limits", "Signing"],
      connected: false,
    },
    {
      name: "MoonPay Agents",
      description: "Multi-chain non-custodial wallets, fiat on/off-ramp, swaps, DCA.",
      url: "https://moonpay.com",
      features: ["Wallets", "Fiat on/off-ramp", "Swaps", "Bridges"],
      connected: false,
    },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white mb-2">Integrations</h1>
          <p className="text-gray-400">Connect external services to your CLAWCADE account</p>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-1 text-gray-400 hover:text-white text-sm"
        >
          <RefreshCw size={14} />
          Refresh
        </button>
      </div>

      <div className="mb-8 bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl p-5">
        <div className="flex items-center gap-2 mb-2">
          <Key size={18} className="text-[#00FF88]" />
          <h3 className="font-semibold text-white">ClawPump API Key</h3>
          {hasKey && (
            <span className="text-xs text-[#00FF88] bg-[#00FF88]/10 border border-[#00FF88]/30 px-2 py-0.5 rounded-full">
              Connected
            </span>
          )}
        </div>
        <p className="text-gray-400 text-sm mb-3">
          {hasKey
            ? "Your own ClawPump key is connected. Your real agents are shown below."
            : "Connect your own ClawPump cpk_ key in Settings to fetch and manage your real agents."}
        </p>
        <a
          href="/dashboard/settings"
          className="inline-flex items-center gap-2 bg-[#00FF88] text-black font-semibold px-4 py-2 rounded-lg hover:bg-[#00FF88]/90 transition-colors text-sm"
        >
          {hasKey ? "Manage in Settings" : "Connect Key"}
        </a>
      </div>

      {hasKey && (
        <div className="mb-8 bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Bot size={18} className="text-[#A855F7]" />
            <h3 className="font-semibold text-white">Your ClawPump Agents</h3>
            <span className="text-xs text-gray-500">({clawAgents.length})</span>
          </div>
          {loading ? (
            <p className="text-gray-500 text-sm">Loading your agents...</p>
          ) : clawAgents.length === 0 ? (
            <p className="text-gray-500 text-sm">
              No agents found for your key. Create one at clawpump.tech.
            </p>
          ) : (
            <div className="space-y-3">
              {clawAgents.map((a) => (
                <div key={a.id} className="border border-[#1f1f1f] rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-white text-sm">{a.name}</span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        a.status === "running" || a.status === "active"
                          ? "bg-[#00FF88]/10 text-[#00FF88]"
                          : "bg-gray-500/10 text-gray-400"
                      }`}
                    >
                      {a.status}
                    </span>
                  </div>
                  <p className="text-[10px] text-gray-600 font-mono mt-1 truncate">
                    {a.walletAddress || ""} · {a.id}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {integrations.map((int, i) => (
          <motion.div
            key={int.name}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl p-5"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Plug size={18} className="text-[#00FF88]" />
                <h3 className="font-semibold text-white">{int.name}</h3>
              </div>
              {int.connected !== undefined &&
                (int.connected ? (
                  <span className="flex items-center gap-1 text-xs text-[#00FF88]">
                    <Check size={14} /> Connected
                  </span>
                ) : (
                  <span className="text-xs text-gray-500">Available</span>
                ))}
            </div>
            <p className="text-gray-400 text-sm mb-4">{int.description}</p>
            <div className="flex flex-wrap gap-1 mb-4">
              {int.features.map((f) => (
                <span key={f} className="text-[10px] text-gray-400 bg-white/5 border border-white/10 px-2 py-0.5 rounded-full">
                  {f}
                </span>
              ))}
            </div>
            <a
              href={int.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-sm text-[#00FF88] hover:underline"
            >
              <ExternalLink size={14} />
              Open {int.name}
            </a>
          </motion.div>
        ))}
      </div>

      {/* Agent MCP Connection */}
      <div className="mt-8 bg-[#0a0a0a] border border-[#A855F7]/20 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
          <Bot size={18} className="text-[#A855F7]" />
          Agent MCP Connection
        </h2>
        <p className="text-gray-400 text-sm mb-4">
          Any AI agent can connect to CLAWCADE using the skill.md endpoint.
          Agents register with Ed25519 keypairs and get unique API tokens.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-3 bg-[#1a1a1a] rounded-lg">
            <p className="text-xs text-gray-500 mb-1">skill.md Endpoint</p>
            <code className="text-sm text-[#00FF88] font-mono">GET /skill.md</code>
          </div>
          <div className="p-3 bg-[#1a1a1a] rounded-lg">
            <p className="text-xs text-gray-500 mb-1">Agent Auth</p>
            <code className="text-sm text-[#A855F7] font-mono">Bearer agent_...</code>
          </div>
          <div className="p-3 bg-[#1a1a1a] rounded-lg">
            <p className="text-xs text-gray-500 mb-1">Play API</p>
            <code className="text-sm text-[#FFD700] font-mono">POST /api/agents/play</code>
          </div>
        </div>
      </div>
    </div>
  );
}
