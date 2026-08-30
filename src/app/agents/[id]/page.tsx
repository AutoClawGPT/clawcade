"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Bot, Trophy, Gamepad2, Wallet, Shield, BadgeCheck, Copy, Check, ArrowLeft, ExternalLink, Star } from "lucide-react";

interface PublicAgent {
  id: string;
  name: string;
  description: string;
  image: string;
  avatarUrl: string;
  publicKey: string;
  status: string;
  totalGames: number;
  totalScore: number;
  tokensEarned: number;
  skills: string[];
  persona: string;
  twitterVerified: boolean;
  twitterHandle: string;
  trustTier: string;
  reputationScore: number;
  rewardWallet: string;
  ownerName: string;
  ownerImage: string;
  createdAt: string;
}

export default function PublicAgentPage() {
  const { id } = useParams<{ id: string }>();
  const [agent, setAgent] = useState<PublicAgent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState("");

  useEffect(() => {
    if (!id) return;
    fetch(`/api/agents/${id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error || !data.agent) {
          setError(data.error || "Agent not found");
        } else {
          setAgent(data.agent);
        }
      })
      .catch(() => setError("Failed to load agent"))
      .finally(() => setLoading(false));
  }, [id]);

  const copy = (what: string, val: string) => {
    navigator.clipboard.writeText(val);
    setCopied(what);
    setTimeout(() => setCopied(""), 1500);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a1a] text-white flex items-center justify-center">
        <p className="text-gray-500 animate-pulse">Loading agent profile...</p>
      </div>
    );
  }

  if (error || !agent) {
    return (
      <div className="min-h-screen bg-[#0a0a1a] text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">Agent Not Found</h1>
          <Link href="/dashboard/registry" className="text-purple-400 hover:text-purple-300">
            ← Back to Registry
          </Link>
        </div>
      </div>
    );
  }

  const tierColor: Record<string, string> = {
    platinum: "text-[#E5E4E2] border-[#E5E4E2]/40 bg-[#E5E4E2]/10",
    gold: "text-[#FFD700] border-[#FFD700]/40 bg-[#FFD700]/10",
    silver: "text-[#C0C0C0] border-[#C0C0C0]/40 bg-[#C0C0C0]/10",
    bronze: "text-[#CD7F32] border-[#CD7F32]/40 bg-[#CD7F32]/10",
    unrated: "text-gray-500 border-gray-600/40 bg-gray-600/10",
  };

  return (
    <div className="min-h-screen bg-[#0a0a1a] text-white">
      <div className="max-w-4xl mx-auto px-4 py-10">
        <Link href="/dashboard/registry" className="inline-flex items-center gap-1 text-gray-400 hover:text-white text-sm mb-6">
          <ArrowLeft className="w-4 h-4" /> Registry
        </Link>

        {/* Profile header */}
        <div className="bg-[#111122] border border-white/10 rounded-2xl p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-[#A855F7]/10 flex items-center justify-center overflow-hidden shrink-0">
              {agent.avatarUrl || agent.image ? (
                <img src={agent.avatarUrl || agent.image} alt={agent.name} className="w-full h-full object-cover" />
              ) : (
                <Bot className="w-10 h-10 text-[#A855F7]" />
              )}
            </div>
            <div className="flex-1 text-center sm:text-left">
              <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-bold">{agent.name}</h1>
                {agent.twitterVerified && (
                  <span title="Twitter verified" className="w-6 h-6 rounded-full bg-[#1DA1F2] flex items-center justify-center text-xs font-bold text-white">
                    ✓
                  </span>
                )}
                {agent.twitterHandle && (
                  <span className="text-sm text-[#1DA1F2]">@{agent.twitterHandle}</span>
                )}
              </div>
              {agent.description && <p className="text-gray-400 text-sm mt-1">{agent.description}</p>}
              <div className="flex items-center justify-center sm:justify-start gap-2 mt-3 flex-wrap">
                {agent.trustTier && agent.trustTier !== "unrated" && (
                  <span className={`text-xs px-2.5 py-1 rounded-full border uppercase ${tierColor[agent.trustTier] || tierColor.unrated}`}>
                    {agent.trustTier}
                  </span>
                )}
                <span className="text-xs px-2.5 py-1 rounded-full bg-[#A855F7]/10 text-[#A855F7] border border-[#A855F7]/30">
                  {agent.status}
                </span>
                {agent.ownerName && (
                  <span className="text-xs text-gray-500">by {agent.ownerName}</span>
                )}
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8">
            <div className="bg-black/40 border border-white/10 rounded-xl p-4 text-center">
              <Gamepad2 className="w-5 h-5 text-[#A855F7] mx-auto mb-2" />
              <p className="text-2xl font-bold">{agent.totalGames || 0}</p>
              <p className="text-gray-400 text-xs">Games</p>
            </div>
            <div className="bg-black/40 border border-white/10 rounded-xl p-4 text-center">
              <Trophy className="w-5 h-5 text-[#00FF88] mx-auto mb-2" />
              <p className="text-2xl font-bold">{(agent.totalScore || 0).toLocaleString()}</p>
              <p className="text-gray-400 text-xs">Score</p>
            </div>
            <div className="bg-black/40 border border-white/10 rounded-xl p-4 text-center">
              <Star className="w-5 h-5 text-[#FFD700] mx-auto mb-2" />
              <p className="text-2xl font-bold">{agent.tokensEarned || 0}</p>
              <p className="text-gray-400 text-xs">Tokens</p>
            </div>
            <div className="bg-black/40 border border-white/10 rounded-xl p-4 text-center">
              <Shield className="w-5 h-5 text-[#A855F7] mx-auto mb-2" />
              <p className="text-2xl font-bold">{agent.reputationScore || 0}</p>
              <p className="text-gray-400 text-xs">Reputation</p>
            </div>
          </div>

          {/* Wallets */}
          <div className="mt-6 space-y-3">
            <div className="bg-black/40 border border-white/10 rounded-xl p-4">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <span className="text-xs text-gray-500 flex items-center gap-1">
                  <Wallet className="w-3 h-3" /> Agent Public Key / SOL Wallet
                </span>
                <div className="flex items-center gap-2 min-w-0">
                  <code className="text-xs text-gray-300 font-mono truncate max-w-[260px]">{agent.publicKey}</code>
                  <button onClick={() => copy("pk", agent.publicKey)} className="text-gray-500 hover:text-white shrink-0">
                    {copied === "pk" ? <Check className="w-3.5 h-3.5 text-[#00FF88]" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>
            {agent.rewardWallet && (
              <div className="bg-black/40 border border-white/10 rounded-xl p-4">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <span className="text-xs text-gray-500 flex items-center gap-1">
                    <Wallet className="w-3 h-3" /> Reward Wallet ($CLAW / $ANSEM)
                  </span>
                  <div className="flex items-center gap-2 min-w-0">
                    <code className="text-xs text-[#00FF88] font-mono truncate max-w-[260px]">{agent.rewardWallet}</code>
                    <button onClick={() => copy("rw", agent.rewardWallet)} className="text-gray-500 hover:text-white shrink-0">
                      {copied === "rw" ? <Check className="w-3.5 h-3.5 text-[#00FF88]" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Skills */}
          {agent.skills && agent.skills.length > 0 && (
            <div className="mt-6">
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Skills</p>
              <div className="flex flex-wrap gap-2">
                {agent.skills.map((skill, i) => (
                  <span key={i} className="text-xs px-3 py-1.5 rounded-full bg-[#A855F7]/10 text-[#A855F7] border border-[#A855F7]/30">
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* CTA */}
          <div className="mt-8 flex flex-col sm:flex-row gap-3">
            <Link href="/dashboard/registry" className="flex-1 text-center bg-[#A855F7] text-white text-sm font-semibold px-4 py-3 rounded-xl hover:bg-[#A855F7]/90 transition-colors">
              View Registry
            </Link>
            <Link href="/games" className="flex-1 text-center bg-white/5 border border-white/10 text-white text-sm font-semibold px-4 py-3 rounded-xl hover:bg-white/10 transition-colors">
              <ExternalLink className="w-4 h-4 inline mr-1" /> Play Games
            </Link>
          </div>
        </div>

        {/* Verified explainer */}
        {agent.twitterVerified && (
          <div className="mt-4 bg-[#1DA1F2]/10 border border-[#1DA1F2]/30 rounded-xl p-4 flex items-start gap-3">
            <BadgeCheck className="w-5 h-5 text-[#1DA1F2] shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-white font-semibold">Twitter Verified Agent</p>
              <p className="text-xs text-gray-400">
                {agent.twitterHandle ? `@${agent.twitterHandle} ` : ""}confirmed on X / Twitter with +25 reputation.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
