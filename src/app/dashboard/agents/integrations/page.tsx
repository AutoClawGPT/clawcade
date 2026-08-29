"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Plug, Key, Check, ExternalLink, Copy, Shield, Bot } from "lucide-react";

interface ConnectedKey {
  name: string;
  connected: boolean;
  masked: string;
}

export default function IntegrationsPage() {
  const [keys, setKeys] = useState<ConnectedKey[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("authToken");
    if (!token) { setLoading(false); return; }
    
    fetch("/api/user/profile", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.user) {
          const connected = data.user.encryptedKeys || {};
          setKeys([
            {
              name: "ClawPump API Key",
              connected: !!connected.clawpumpApiKey,
              masked: connected.clawpumpApiKey ? "cpk_****" + connected.clawpumpApiKey.slice(-4) : "Not connected",
            },
          ]);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const integrations = [
    {
      name: "ClawPump MCP",
      description: "122+ MCP tools for AI agents on Solana. Gasless pump.fun launches, swaps, perps, analytics.",
      url: "https://clawpump.tech/docs",
      status: "available",
      features: ["Token Launch", "Swaps", "Perps", "Leaderboard", "Analytics", "Agent Email"],
      install: "npx @clawpump/agents --claude",
      keyFormat: "cpk_...",
    },
    {
      name: "Pump.fun",
      description: "Solana token launchpad. Launch and trade tokens.",
      url: "https://pump.fun",
      status: "available",
      features: ["Token Data", "Trading", "Analytics"],
      install: null,
      keyFormat: null,
    },
    {
      name: "Solana Wallet",
      description: "Connect your Solana wallet (Phantom, Solflare, Backpack) for token rewards.",
      url: "https://phantom.app",
      status: "available",
      features: ["Wallet Connect", "Token Receive", "SOL Transfer"],
      install: null,
      keyFormat: null,
    },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-2">Integrations</h1>
        <p className="text-gray-400">Connect external services to your agents</p>
      </div>

      {/* Connected Keys */}
      {!loading && keys.length > 0 && (
        <div className="bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl p-6 mb-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Key size={18} className="text-[#00FF88]" />
            Your Connected Keys
          </h2>
          <div className="space-y-3">
            {keys.map((key) => (
              <div key={key.name} className="flex items-center justify-between p-3 bg-[#1a1a1a] rounded-lg">
                <div className="flex items-center gap-3">
                  {key.connected ? (
                    <Check size={16} className="text-[#00FF88]" />
                  ) : (
                    <Key size={16} className="text-gray-500" />
                  )}
                  <div>
                    <p className="text-sm font-medium text-white">{key.name}</p>
                    <p className="text-xs text-gray-500 font-mono">{key.masked}</p>
                  </div>
                </div>
                <span className={`text-xs px-2 py-1 rounded ${key.connected ? "bg-[#00FF88]/10 text-[#00FF88]" : "bg-gray-800 text-gray-500"}`}>
                  {key.connected ? "Connected" : "Not Connected"}
                </span>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-3">
            Manage your keys in <a href="/dashboard/settings" className="text-[#00FF88] hover:underline">Settings</a>
          </p>
        </div>
      )}

      {/* Available Integrations */}
      <div className="space-y-4">
        {integrations.map((integration, i) => (
          <motion.div
            key={integration.name}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl p-6"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Plug size={18} className="text-[#00FF88]" />
                  <h3 className="text-lg font-semibold text-white">{integration.name}</h3>
                  <span className="text-xs px-2 py-0.5 rounded bg-[#00FF88]/10 text-[#00FF88]">
                    {integration.status}
                  </span>
                </div>
                <p className="text-gray-400 text-sm mb-3">{integration.description}</p>
                <div className="flex flex-wrap gap-2 mb-3">
                  {integration.features.map((f) => (
                    <span key={f} className="text-xs px-2 py-1 rounded bg-[#1a1a1a] text-gray-400">
                      {f}
                    </span>
                  ))}
                </div>
                {integration.install && (
                  <div className="flex items-center gap-2 p-2 bg-black rounded-lg border border-[#1f1f1f]">
                    <code className="text-xs text-[#00FF88] font-mono flex-1">{integration.install}</code>
                    <button
                      onClick={() => navigator.clipboard.writeText(integration.install!)}
                      className="text-gray-500 hover:text-white"
                    >
                      <Copy size={14} />
                    </button>
                  </div>
                )}
                {integration.keyFormat && (
                  <p className="text-xs text-gray-500 mt-2">
                    API Key format: <code className="text-[#A855F7]">{integration.keyFormat}</code>
                  </p>
                )}
              </div>
              <a
                href={integration.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-500 hover:text-white ml-4"
              >
                <ExternalLink size={16} />
              </a>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Agent MCP Info */}
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
