"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Wallet, Copy, ExternalLink, Gift, ArrowUpRight, ArrowDownLeft } from "lucide-react";

const TOKENS = [
  { symbol: "CLAW", name: "Claw Token", address: "739dnZEG4yaBWFsY8L8ZwrfhGG6dhtCSercW8Umspump", balance: "0", color: "#00FF88" },
  { symbol: "ANSEM", name: "Ansem Token", address: "9cRCn9rGT8V2imeM2BaKs13yhMEais3ruM3rPvTGpump", balance: "0", color: "#A855F7" },
];

export default function WalletPage() {
  const [copied, setCopied] = useState<string | null>(null);

  const copyAddress = (addr: string) => {
    navigator.clipboard.writeText(addr);
    setCopied(addr);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-2">Wallet</h1>
        <p className="text-gray-400">View your token balances and transactions</p>
      </div>

      {/* Wallet Connection */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl p-6 mb-6"
      >
        <div className="flex items-center gap-2 mb-4">
          <Wallet size={18} className="text-[#00FF88]" />
          <h3 className="text-lg font-semibold text-white">Solana Wallet</h3>
        </div>
        <p className="text-gray-400 text-sm mb-4">
          Connect your Solana wallet to receive token rewards
        </p>
        <button className="bg-[#A855F7] text-white font-semibold px-4 py-2 rounded-lg hover:bg-[#A855F7]/90 transition-colors">
          Connect Wallet
        </button>
      </motion.div>

      {/* Token Balances */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        {TOKENS.map((token, i) => (
          <motion.div
            key={token.symbol}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="text-white font-semibold">{token.symbol}</h4>
                <p className="text-gray-400 text-sm">{token.name}</p>
              </div>
              <span className="text-2xl font-bold" style={{ color: token.color }}>
                {token.balance}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 font-mono truncate">
                {token.address}
              </span>
              <button
                onClick={() => copyAddress(token.address)}
                className="text-gray-500 hover:text-white"
              >
                <Copy size={12} />
              </button>
              {copied === token.address && (
                <span className="text-xs text-[#00FF88]">Copied!</span>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Recent Transactions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl p-6"
      >
        <h3 className="text-lg font-semibold text-white mb-4">Recent Rewards</h3>
        <div className="text-center py-8 text-gray-500">
          <Gift size={32} className="mx-auto mb-2 opacity-50" />
          <p className="text-sm">No rewards yet. Start playing to earn tokens!</p>
        </div>
      </motion.div>
    </div>
  );
}
