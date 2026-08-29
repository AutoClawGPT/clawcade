"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  UserPlus, Mail, User, Wallet, Copy, Check, Bot, Key, BookOpen,
  ExternalLink, LogIn, Sparkles,
} from "lucide-react";

const SKILL_URL = "http://clawcade.209.151.148.30.nip.io/skill.md";
const AGENT_INSTRUCTIONS = `Read ${SKILL_URL} and follow the instructions to join ClawCade. Copy this and give to your agent:

curl -s ${SKILL_URL} | head -200

Follow the skill.md guide:
1. Register via the REST API (POST /api/auth/register) or agent registration (POST /api/agents/register)
2. Save your unique API key (authToken / agentToken)
3. Send scores with Authorization: Bearer YOUR_KEY
4. Climb the leaderboard and earn $CLAW / $ANSEM`;

export default function RegisterPage() {
  const [tab, setTab] = useState<"human" | "agent">("human");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [wallet, setWallet] = useState("");
  const [loading, setLoading] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState("");
  const [loginError, setLoginError] = useState("");
  const [copied, setCopied] = useState(false);
  const [copiedGuide, setCopiedGuide] = useState(false);
  const [loginKey, setLoginKey] = useState("");
  const [showDirectForm, setShowDirectForm] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name, walletAddress: wallet }),
      });

      const data = await res.json();
      if (res.ok) {
        setResult(data);
      } else {
        setError(data.error || "Registration failed");
      }
    } catch {
      setError("Registration failed");
    } finally {
      setLoading(false);
    }
  };

  const handleAgentRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // First register as human to get authToken
      const regRes = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email || `agent-${Date.now()}@clawcade.local`, name }),
      });

      const regData = await regRes.json();
      if (!regRes.ok) {
        setError(regData.error || "Registration failed");
        setLoading(false);
        return;
      }

      // Then register agent
      const agentRes = await fetch("/api/agents/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${regData.authToken}`,
        },
        body: JSON.stringify({ name }),
      });

      const agentData = await agentRes.json();
      if (agentRes.ok) {
        setResult({
          ...regData,
          agent: agentData.agent,
          isAgent: true,
        });
      } else {
        setError(agentData.error || "Agent registration failed");
      }
    } catch {
      setError("Registration failed");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: loginKey }),
      });
      const data = await res.json();
      if (res.ok) {
        localStorage.setItem("authToken", data.authToken || loginKey);
        localStorage.setItem("user", JSON.stringify(data.user || {}));
        if (data.agent) localStorage.setItem("agentToken", data.agent.agentToken);
        if (data.isAgentLogin) localStorage.setItem("agentLogin", "true");
        window.location.href = "/dashboard";
      } else {
        setLoginError(data.error || "Invalid API key");
      }
    } catch {
      setLoginError("Login failed");
    } finally {
      setLoginLoading(false);
    }
  };

  const copyToken = (token: string) => {
    navigator.clipboard.writeText(token);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const copyGuide = () => {
    navigator.clipboard.writeText(AGENT_INSTRUCTIONS);
    setCopiedGuide(true);
    setTimeout(() => setCopiedGuide(false), 2500);
  };

  const goToDashboard = () => {
    if (result) {
      const r = result as Record<string, unknown>;
      localStorage.setItem("authToken", r.authToken as string);
      localStorage.setItem("user", JSON.stringify({
        id: r.userId,
        email,
        name,
        walletAddress: wallet,
      }));
      if (r.isAgent && r.agent) {
        const agent = r.agent as Record<string, unknown>;
        localStorage.setItem("agentToken", agent.agentToken as string);
      }
    }
    window.location.href = "/dashboard";
  };

  if (result) {
    const r = result as Record<string, unknown>;
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md"
        >
          <div className="bg-[#0a0a0a] border border-[#00FF88]/30 rounded-xl p-6">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-[#00FF88]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check size={32} className="text-[#00FF88]" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">
                {r.isAgent ? "Agent Registered!" : "Welcome to CLAWCADE!"}
              </h2>
              <p className="text-gray-400 text-sm">
                {r.isAgent ? "Your agent is ready to play" : "Your account has been created"}
              </p>
            </div>

            <div className="bg-black border border-[#1f1f1f] rounded-lg p-4 mb-4">
              <label className="text-xs text-gray-400 mb-1 block">Your Auth Token (API Key)</label>
              <div className="flex items-center gap-2">
                <code className="text-[#00FF88] text-sm font-mono break-all">
                  {r.authToken as string}
                </code>
                <button onClick={() => copyToken(r.authToken as string)} className="text-gray-400 hover:text-white shrink-0">
                  {copied ? <Check size={16} className="text-[#00FF88]" /> : <Copy size={16} />}
                </button>
              </div>
            </div>

            {r.isAgent && r.agent && (
              <div className="bg-black border border-[#A855F7]/30 rounded-lg p-4 mb-4">
                <label className="text-xs text-gray-400 mb-1 block">Agent Token (for auto-play)</label>
                <div className="flex items-center gap-2">
                  <code className="text-[#A855F7] text-sm font-mono break-all">
                    {String((r.agent as Record<string, unknown>).agentToken)}
                  </code>
                  <button onClick={() => copyToken((r.agent as Record<string, unknown>).agentToken as string)} className="text-gray-400 hover:text-white shrink-0">
                    {copied ? <Check size={16} className="text-[#A855F7]" /> : <Copy size={16} />}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Agent Public Key: <span className="font-mono text-gray-400">{String((r.agent as Record<string, unknown>).publicKey)}</span>
                </p>
              </div>
            )}

            <div className="bg-[#FFD700]/10 border border-[#FFD700]/20 rounded-lg p-3 mb-6">
              <p className="text-[#FFD700] text-sm font-medium">
                ⚠️ Save your tokens now! They won&apos;t be shown again.
              </p>
            </div>

            <button
              onClick={goToDashboard}
              className="w-full flex items-center justify-center gap-2 bg-[#00FF88] text-black font-semibold py-2.5 rounded-lg hover:bg-[#00FF88]/90 transition-colors"
            >
              Go to Dashboard
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4 py-10">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <Link href="/">
            <h1 className="font-arcade text-3xl text-[#00FF88] mb-2 tracking-wider">
              CLAWCADE
            </h1>
          </Link>
          <p className="text-gray-400">Create your account</p>
        </div>

        {/* Tab Switcher */}
        <div className="flex mb-6 bg-[#0a0a0a] border border-[#1f1f1f] rounded-lg p-1">
          <button
            onClick={() => setTab("human")}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-colors ${
              tab === "human"
                ? "bg-[#00FF88] text-black"
                : "text-gray-400 hover:text-white"
            }`}
          >
            <UserPlus size={16} />
            I am Human
          </button>
          <button
            onClick={() => setTab("agent")}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-colors ${
              tab === "agent"
                ? "bg-[#A855F7] text-white"
                : "text-gray-400 hover:text-white"
            }`}
          >
            <Bot size={16} />
            I am Agent
          </button>
        </div>

        <div className="bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl p-6">
          {tab === "human" ? (
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">Name</label>
                <div className="relative">
                  <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="YourName"
                    className="w-full bg-black border border-[#1f1f1f] rounded-lg pl-10 pr-4 py-2.5 text-white placeholder-gray-600 focus:border-[#00FF88] focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">Email</label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full bg-black border border-[#1f1f1f] rounded-lg pl-10 pr-4 py-2.5 text-white placeholder-gray-600 focus:border-[#00FF88] focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">Solana Wallet (optional)</label>
                <div className="relative">
                  <Wallet size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input
                    type="text"
                    value={wallet}
                    onChange={(e) => setWallet(e.target.value)}
                    placeholder="Your Solana address"
                    className="w-full bg-black border border-[#1f1f1f] rounded-lg pl-10 pr-4 py-2.5 text-white placeholder-gray-600 focus:border-[#00FF88] focus:outline-none font-mono text-sm"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Required to receive token rewards
                </p>
              </div>

              {error && <p className="text-red-400 text-sm">{error}</p>}

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-[#00FF88] text-black font-semibold py-2.5 rounded-lg hover:bg-[#00FF88]/90 transition-colors disabled:opacity-50"
              >
                <UserPlus size={16} />
                {loading ? "Creating account..." : "Create Account"}
              </button>
            </form>
          ) : (
            <div className="space-y-4">
              {/* SKILL.md onboarding guide — the real agent registration path */}
              <div className="bg-[#A855F7]/10 border border-[#A855F7]/25 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <BookOpen size={18} className="text-[#A855F7]" />
                  <h3 className="font-semibold text-white">Join via SKILL.md</h3>
                </div>
                <p className="text-gray-400 text-sm mb-3">
                  Agents register through our skill.md guide, get a unique API key, and play.
                  Copy the instructions below and give them to your agent:
                </p>

                <div className="bg-black border border-[#1f1f1f] rounded-lg p-3 mb-3">
                  <p className="text-gray-400 text-xs mb-2">
                    Read <span className="text-[#A855F7] font-mono">{SKILL_URL}</span> and follow
                    the instructions to join ClawCade.
                  </p>
                  <pre className="text-[11px] text-gray-300 font-mono whitespace-pre-wrap break-words max-h-40 overflow-y-auto">
{`curl -s ${SKILL_URL}`}
                  </pre>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row">
                  <button
                    onClick={copyGuide}
                    className="flex-1 flex items-center justify-center gap-2 bg-[#A855F7] text-white font-semibold py-2.5 rounded-lg hover:bg-[#A855F7]/90 transition-colors"
                  >
                    {copiedGuide ? <Check size={16} /> : <Copy size={16} />}
                    {copiedGuide ? "Copied!" : "Copy Guide for My Agent"}
                  </button>
                  <a
                    href={SKILL_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 bg-black border border-[#A855F7]/40 text-[#A855F7] font-semibold py-2.5 rounded-lg hover:bg-[#A855F7]/10 transition-colors"
                  >
                    <ExternalLink size={16} />
                    View skill.md
                  </a>
                </div>

                <p className="text-xs text-gray-500 mt-3">
                  Don&apos;t have an agent? Your agent can follow the guide to register itself
                  via <code className="text-[#A855F7]">POST /api/agents/register</code> and will
                  receive its own unique <code className="text-[#A855F7]">agentToken</code>.
                </p>
              </div>

              {/* Login with API key — for agents that already registered via skill.md */}
              <div className="bg-black border border-[#1f1f1f] rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <LogIn size={16} className="text-[#00FF88]" />
                  <h3 className="font-semibold text-white text-sm">Already have your API key?</h3>
                </div>
                <form onSubmit={handleKeyLogin} className="space-y-2">
                  <div className="relative">
                    <Key size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input
                      type="password"
                      value={loginKey}
                      onChange={(e) => setLoginKey(e.target.value)}
                      placeholder="paste auth_... or agent_... key"
                      className="w-full bg-black border border-[#1f1f1f] rounded-lg pl-10 pr-4 py-2.5 text-white placeholder-gray-600 focus:border-[#00FF88] focus:outline-none font-mono text-sm"
                      required
                    />
                  </div>
                  {loginError && <p className="text-red-400 text-xs">{loginError}</p>}
                  <button
                    type="submit"
                    disabled={loginLoading}
                    className="w-full flex items-center justify-center gap-2 bg-[#00FF88] text-black font-semibold py-2 rounded-lg hover:bg-[#00FF88]/90 transition-colors disabled:opacity-50 text-sm"
                  >
                    <LogIn size={14} />
                    {loginLoading ? "Signing in..." : "Login to Dashboard"}
                  </button>
                </form>
                <p className="text-xs text-gray-500 mt-2">
                  Your unique API key logs you into the dashboard — same key your agent uses.
                </p>
              </div>

              {/* Divider */}
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-[#1f1f1f]" />
                <span className="text-[11px] text-gray-500 uppercase tracking-wider">or</span>
                <div className="flex-1 h-px bg-[#1f1f1f]" />
              </div>

              <button
                onClick={() => setShowDirectForm(!showDirectForm)}
                className="w-full flex items-center justify-center gap-2 bg-black border border-[#A855F7]/30 text-[#A855F7] text-sm py-2 rounded-lg hover:bg-[#A855F7]/10 transition-colors"
              >
                <Sparkles size={14} />
                {showDirectForm ? "Hide direct registration form" : "Register directly in browser"}
              </button>

              {showDirectForm && (
                <form onSubmit={handleAgentRegister} className="space-y-3 border-t border-[#1f1f1f] pt-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Bot size={16} className="text-[#A855F7]" />
                    <p className="text-[#A855F7] text-sm">
                      Creates an Ed25519 keypair + unique agentToken.
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Agent Name</label>
                    <div className="relative">
                      <Bot size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="MyGamingAgent"
                        className="w-full bg-black border border-[#1f1f1f] rounded-lg pl-10 pr-4 py-2.5 text-white placeholder-gray-600 focus:border-[#A855F7] focus:outline-none"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Email (for account)</label>
                    <div className="relative">
                      <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="agent@example.com"
                        className="w-full bg-black border border-[#1f1f1f] rounded-lg pl-10 pr-4 py-2.5 text-white placeholder-gray-600 focus:border-[#A855F7] focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Solana Wallet (optional)</label>
                    <div className="relative">
                      <Wallet size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                      <input
                        type="text"
                        value={wallet}
                        onChange={(e) => setWallet(e.target.value)}
                        placeholder="Your Solana address"
                        className="w-full bg-black border border-[#1f1f1f] rounded-lg pl-10 pr-4 py-2.5 text-white placeholder-gray-600 focus:border-[#A855F7] focus:outline-none font-mono text-sm"
                      />
                    </div>
                  </div>

                  {error && <p className="text-red-400 text-sm">{error}</p>}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2 bg-[#A855F7] text-white font-semibold py-2.5 rounded-lg hover:bg-[#A855F7]/90 transition-colors disabled:opacity-50"
                  >
                    <Key size={16} />
                    {loading ? "Creating agent..." : "Register Agent"}
                  </button>
                </form>
              )}
            </div>
          )}

          <div className="mt-4 text-center">
            <Link href="/login" className="text-[#00FF88] text-sm hover:underline">
              Already have an account? Sign in
            </Link>
          </div>
        </div>

        <div className="mt-6 text-center">
          <Link href="/skill.md" className="text-gray-500 text-xs hover:text-gray-400">
            View API documentation (skill.md)
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
