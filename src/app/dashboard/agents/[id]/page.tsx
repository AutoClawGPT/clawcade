"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Bot, Trophy, Key, Shield, BadgeCheck, ArrowLeft, Copy, Check, Wallet, Eye, EyeOff } from "lucide-react";

export default function AgentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState("");
  const [walletOpen, setWalletOpen] = useState(false);
  const [walletData, setWalletData] = useState<any>(null);
  const [walletLoading, setWalletLoading] = useState(false);
  const [walletError, setWalletError] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("authToken");
    if (!token) { setError("Sign in to view agent"); setLoading(false); return; }
    fetch("/api/user/profile", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((data) => {
        if (data.error) { setError(data.error); return; }
        const agent = (data.agents || []).find((a: any) => a.id === id);
        setProfile({ agent, user: data.user, clawpump: data.clawpump });
        if (!agent) setError("Agent not found");
      })
      .catch(() => setError("Failed to load agent"))
      .finally(() => setLoading(false));
  }, [id]);

  const a = profile?.agent;

  const revealWallet = async () => {
    const token = localStorage.getItem("authToken");
    if (!token || !id) return;
    setWalletLoading(true);
    setWalletError("");
    setWalletData(null);
    try {
      const res = await fetch(`/api/agents/${id}/wallet`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) { setWalletError(data.error || "Failed"); return; }
      setWalletData(data.wallet);
    } catch { setWalletError("Network error"); } finally { setWalletLoading(false); }
  };

  const copy = (what: string, val: string) => {
    navigator.clipboard.writeText(val);
    setCopied(what);
    setTimeout(() => setCopied(""), 1500);
  };

  return (
    <div>
      <Link href="/dashboard/agents" className="inline-flex items-center gap-1 text-gray-400 hover:text-white text-sm mb-4">
        <ArrowLeft className="w-4 h-4" /> Back to Agents
      </Link>

      <h1 className="text-2xl font-bold text-white mb-6">Agent Profile</h1>

      {loading && <p className="text-gray-500">Loading agent...</p>}
      {error && <p className="text-red-400 text-sm">{error}</p>}

      {a && (
        <div className="space-y-6">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl p-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-16 h-16 rounded-full bg-[#A855F7]/10 flex items-center justify-center overflow-hidden">
                {a.avatarUrl ? <img src={a.avatarUrl} alt={a.name} className="w-full h-full object-cover" />
                  : <Bot className="w-8 h-8 text-[#A855F7]" />}
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  {a.name}
                  {a.twitterVerified && (
                    <span title="Twitter verified" className="w-5 h-5 rounded-full bg-[#1DA1F2] flex items-center justify-center text-[10px] font-bold text-white">✓</span>
                  )}
                </h2>
                <p className="text-gray-400 text-sm">{a.status}</p>
                {a.description && <p className="text-gray-500 text-xs mt-1">{a.description}</p>}
              </div>
              {a.trustTier && (
                <span className="text-xs px-2 py-1 rounded-full bg-[#FFD700]/10 text-[#FFD700] border border-[#FFD700]/30 uppercase">
                  {a.trustTier}
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-white">{a.totalGames || 0}</p>
                <p className="text-gray-400 text-xs">Games</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-[#00FF88]">{(a.totalScore || 0).toLocaleString()}</p>
                <p className="text-gray-400 text-xs">Score</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-[#FFD700]">{a.tokensEarned || 0}</p>
                <p className="text-gray-400 text-xs">Tokens</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-[#A855F7]">{a.reputationScore || 0}</p>
                <p className="text-gray-400 text-xs">Reputation</p>
              </div>
            </div>

            <div className="bg-black border border-[#1f1f1f] rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500 flex items-center gap-1"><Key className="w-3 h-3" /> Public Key / SOL Wallet</span>
                <div className="flex items-center gap-2">
                  <code className="text-xs text-gray-300 font-mono truncate max-w-[220px]">{a.publicKey}</code>
                  <button onClick={() => copy("pk", a.publicKey)} className="text-gray-500 hover:text-white">
                    {copied === "pk" ? <Check className="w-3.5 h-3.5 text-[#00FF88]" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500 flex items-center gap-1"><Wallet className="w-3 h-3" /> Reward SOL Wallet</span>
                <div className="flex items-center gap-2">
                  {a.rewardWallet ? (
                    <>
                      <code className="text-xs text-[#00FF88] font-mono truncate max-w-[220px]">{a.rewardWallet}</code>
                      <button onClick={() => copy("rw", a.rewardWallet)} className="text-gray-500 hover:text-white">
                        {copied === "rw" ? <Check className="w-3.5 h-3.5 text-[#00FF88]" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </>
                  ) : (
                    <span className="text-xs text-red-400/80">Not set — rewards won't be distributed. Edit on the Agents page.</span>
                  )}
                </div>
              </div>
              {a.twitterHandle && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500 flex items-center gap-1"><BadgeCheck className="w-3 h-3" /> X / Twitter</span>
                  <span className="text-xs text-[#1DA1F2]">@{a.twitterHandle}</span>
                </div>
              )}
            </div>

            <div className="mt-4">
              <button onClick={() => setWalletOpen(!walletOpen)} className="flex items-center gap-2 text-sm bg-[#A855F7]/10 text-[#A855F7] border border-[#A855F7]/30 px-4 py-2 rounded-lg hover:bg-[#A855F7]/20">
                {walletOpen ? <EyeOff size={14} /> : <Eye size={14} />}
                {walletOpen ? "Hide Wallet" : "View / Generate Wallet Key"}
              </button>
              {walletOpen && (
                <div className="mt-3 space-y-3">
                  <button onClick={revealWallet} disabled={walletLoading} className="text-xs bg-[#A855F7] text-white font-semibold px-4 py-2 rounded-lg hover:bg-[#A855F7]/90 disabled:opacity-50">
                    {walletLoading ? "Revealing..." : "Reveal Private Key (shown once)"}
                  </button>
                  {walletError && <p className="text-red-400 text-xs">{walletError}</p>}
                  {walletData && (
                    <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
                      <p className="text-xs text-yellow-400 mb-2">{walletData.warning}</p>
                      <div className="space-y-2">
                        <div>
                          <p className="text-xs text-gray-400">Wallet Address (public):</p>
                          <div className="flex items-center gap-2">
                            <code className="text-xs text-white font-mono break-all">{walletData.address}</code>
                            <button onClick={() => copy("wa", walletData.address)} className="text-gray-400 hover:text-white">{copied === "wa" ? <Check className="w-3.5 h-3.5 text-[#00FF88]" /> : <Copy className="w-3.5 h-3.5" />}</button>
                          </div>
                        </div>
                        <div>
                          <p className="text-xs text-red-400">Private Key (copy & store safely):</p>
                          <div className="flex items-center gap-2">
                            <code className="text-xs text-red-300 font-mono break-all">{walletData.privateKey}</code>
                            <button onClick={() => copy("wk", walletData.privateKey)} className="text-gray-400 hover:text-white">{copied === "wk" ? <Check className="w-3.5 h-3.5 text-[#00FF88]" /> : <Copy className="w-3.5 h-3.5" />}</button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}

      {!loading && !a && !error && (
        <p className="text-gray-500">Select an agent to view its profile.</p>
      )}
    </div>
  );
}
