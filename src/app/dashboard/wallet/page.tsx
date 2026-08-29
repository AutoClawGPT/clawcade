"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Wallet, Copy, ExternalLink, Gift } from "lucide-react";

const TOKENS = [
  { symbol: "CLAW", name: "Claw Token", address: "739dnZEG4yaBWFsY8L8ZwrfhGG6dhtCSercW8Umspump", color: "#00FF88" },
  { symbol: "ANSEM", name: "Ansem Token", address: "9cRCn9rGT8V2imeM2BaKs13yhMEais3ruM3rPvTGpump", color: "#A855F7" },
];

interface Reward {
  id: string;
  type: string;
  amount: number;
  token: string;
  status: string;
  createdAt: string;
}

export default function WalletPage() {
  const [copied, setCopied] = useState<string | null>(null);
  const [walletAddress, setWalletAddress] = useState<string>("");
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("authToken");
    if (!token) { setLoading(false); return; }

    fetch("/api/user/profile", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.user?.walletAddress) setWalletAddress(data.user.walletAddress);
        if (data.recentRewards) setRewards(data.recentRewards);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

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

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl p-6 mb-6"
      >
        <div className="flex items-center gap-2 mb-4">
          <Wallet size={18} className="text-[#00FF88]" />
          <h3 className="text-lg font-semibold text-white">Your Solana Wallet</h3>
        </div>
        {walletAddress ? (
          <div className="flex items-center gap-2">
            <code className="text-[#00FF88] font-mono text-sm">{walletAddress}</code>
            <button onClick={() => copyAddress(walletAddress)} className="text-gray-400 hover:text-white">
              <Copy size={14} />
            </button>
            {copied === walletAddress && <span className="text-xs text-[#00FF88]">Copied!</span>}
          </div>
        ) : (
          <p className="text-gray-400 text-sm">No wallet connected. Add one in Settings.</p>
        )}
      </motion.div>

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
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 font-mono truncate">
                {token.address}
              </span>
              <button onClick={() => copyAddress(token.address)} className="text-gray-500 hover:text-white">
                <Copy size={12} />
              </button>
              {copied === token.address && <span className="text-xs text-[#00FF88]">Copied!</span>}
            </div>
          </motion.div>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl p-6"
      >
        <h3 className="text-lg font-semibold text-white mb-4">Recent Rewards</h3>
        {loading ? (
          <p className="text-gray-500 text-sm text-center py-8">Loading...</p>
        ) : rewards.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Gift size={32} className="mx-auto mb-2 opacity-50" />
            <p className="text-sm">No rewards yet. Start playing to earn tokens!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {rewards.map((r) => (
              <div key={r.id} className="flex items-center justify-between py-2 border-b border-[#1f1f1f] last:border-0">
                <div>
                  <p className="text-white text-sm">{r.type} reward</p>
                  <p className="text-gray-500 text-xs">{new Date(r.createdAt).toLocaleDateString()}</p>
                </div>
                <p className="text-[#00FF88] font-mono text-sm">+{r.amount} ${r.token}</p>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}
