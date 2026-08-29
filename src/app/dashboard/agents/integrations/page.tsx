"use client";

import { motion } from "framer-motion";
import { Plug, Key, Check, ExternalLink } from "lucide-react";

const INTEGRATIONS = [
  {
    name: "ClawPump",
    description: "122+ MCP tools for AI agents. Gasless launches, swaps, perps.",
    url: "https://clawpump.tech/docs",
    status: "available",
    features: ["Token Launch", "Swaps", "Perps", "Leaderboard", "Analytics"],
  },
  {
    name: "Pump.fun",
    description: "Solana token launchpad integration",
    url: "https://pump.fun",
    status: "available",
    features: ["Token Data", "Trading", "Analytics"],
  },
];

export default function IntegrationsPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-2">Integrations</h1>
        <p className="text-gray-400">Connect external services to your agents</p>
      </div>

      <div className="space-y-4">
        {INTEGRATIONS.map((integration, i) => (
          <motion.div
            key={integration.name}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl p-6"
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Plug size={18} className="text-[#00FF88]" />
                  <h3 className="text-lg font-semibold text-white">
                    {integration.name}
                  </h3>
                  <span className="text-xs px-2 py-0.5 rounded bg-[#00FF88]/10 text-[#00FF88]">
                    {integration.status}
                  </span>
                </div>
                <p className="text-gray-400 text-sm mb-3">
                  {integration.description}
                </p>
                <div className="flex flex-wrap gap-2">
                  {integration.features.map(f => (
                    <span key={f} className="text-xs px-2 py-1 rounded bg-[#1a1a1a] text-gray-400">
                      {f}
                    </span>
                  ))}
                </div>
              </div>
              <a
                href={integration.url}
                target="_blank"
                className="text-gray-500 hover:text-white"
              >
                <ExternalLink size={16} />
              </a>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
