"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Rocket, Bot, Wallet, Loader2, Image as ImageIcon, Upload, ExternalLink,
  Copy, CheckCircle2, Flame, BadgeCheck, Loader,
} from "lucide-react";

interface ClawAgent {
  id: string;
  name: string;
  status: string;
  walletAddress: string;
  model: string;
  skills: string[];
}

type LaunchStatus = "reserved" | "submitted" | "soft_confirmed" | "confirmed" | "finalized" | "failed" | "error";

const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  reserved: { label: "Reserved", cls: "bg-amber-500/15 text-amber-400 border-amber-500/30" },
  submitted: { label: "Submitted", cls: "bg-blue-500/15 text-blue-400 border-blue-500/30" },
  soft_confirmed: { label: "Soft Confirmed", cls: "bg-green-500/15 text-green-400 border-green-500/30" },
  confirmed: { label: "Confirmed", cls: "bg-green-500/15 text-green-400 border-green-500/30" },
  finalized: { label: "Finalized", cls: "bg-green-500/15 text-green-400 border-green-500/30" },
  failed: { label: "Failed", cls: "bg-red-500/15 text-red-400 border-red-500/30" },
  error: { label: "Error", cls: "bg-red-500/15 text-red-400 border-red-500/30" },
};

function shortAddr(addr?: string | null, len = 6) {
  if (!addr) return "—";
  return addr.length > len * 2 + 3 ? `${addr.slice(0, len)}...${addr.slice(-len)}` : addr;
}

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_LABEL[status] || { label: status, cls: "bg-gray-500/10 text-gray-400 border-gray-500/30" };
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${s.cls}`}>
      {status === "failed" || status === "error" ? "✕" : status === "finalized" || status === "confirmed" ? <BadgeCheck className="w-3 h-3" /> : <Loader className="w-3 h-3" />}
      {s.label}
    </span>
  );
}

function AgentSelect({
  agents, loading, value, onChange,
}: { agents: ClawAgent[]; loading: boolean; value: string; onChange: (v: string) => void }) {
  if (loading) {
    return <div className="flex items-center gap-2 text-sm text-gray-500"><Loader2 className="w-4 h-4 animate-spin" /> Loading your agents...</div>;
  }
  if (agents.length === 0) {
    return (
      <p className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/30 rounded-lg px-3 py-2">
        No agents found for your connected key. Create one in{" "}
        <a href="/dashboard/settings" className="underline">Settings → ClawPump Agents</a> first, then refresh.
      </p>
    );
  }
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full bg-black border border-[#1f1f1f] rounded-lg px-3 py-2.5 text-white text-sm focus:border-[#00FF88] focus:outline-none"
    >
      {agents.map((a) => (
        <option key={a.id} value={a.id}>{a.name} — {shortAddr(a.id, 4)} ({a.status})</option>
      ))}
    </select>
  );
}

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div>
      <label className="block text-sm text-gray-400 mb-2">{label}</label>
      {children}
      {hint && <p className="text-xs text-gray-500 mt-1">{hint}</p>}
    </div>
  );
}

// ──────────────────────────────────────────────
// PONS TAB — Gasless Token Launch (Robinhood Chain)
// ──────────────────────────────────────────────
function PonsTab({ agents, agentsLoading, hasKey }: { agents: ClawAgent[]; agentsLoading: boolean; hasKey: boolean }) {
  const [agentId, setAgentId] = useState("");
  const [name, setName] = useState("");
  const [symbol, setSymbol] = useState("");
  const [description, setDescription] = useState("");
  const [payoutWallet, setPayoutWallet] = useState("");
  const [logoUrl, setLogoUrl] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<any>(null);
  const [launches, setLaunches] = useState<any[]>([]);
  const [launchesLoading, setLaunchesLoading] = useState(false);

  const fetchLaunches = useCallback(async (id: string) => {
    if (!id) return;
    const token = localStorage.getItem("authToken");
    setLaunchesLoading(true);
    try {
      const res = await fetch(`/api/clawpump/launch?agentId=${id}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        setLaunches(data.launches || []);
      }
    } catch {}
    setLaunchesLoading(false);
  }, []);

  useEffect(() => {
    if (agents.length > 0 && !agentId) {
      setAgentId(agents[0].id);
      if (agents[0].walletAddress) setPayoutWallet(agents[0].walletAddress);
    }
  }, [agents, agentId]);

  useEffect(() => {
    if (!agentId) return;
    fetchLaunches(agentId);
    const timer = setInterval(() => fetchLaunches(agentId), 8000);
    return () => clearInterval(timer);
  }, [agentId, fetchLaunches]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const token = localStorage.getItem("authToken");
    if (!token || !agentId) return;
    setLoading(true); setError(""); setResult(null);
    try {
      const res = await fetch("/api/clawpump/launch", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ mode: "pons", agentId, name, symbol, description, payoutWallet, imageUrl: logoUrl }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "PONS launch failed"); return; }
      setResult(data.result || data);
      if (data.result?.launch?.tokenAddress || data.result?.launch?.predictedTokenAddress) {
        setTimeout(() => fetchLaunches(agentId), 3000);
      }
    } catch {
      setError("Network error. Try again.");
    } finally {
      setLoading(false);
    }
  }

  const launch = result?.launch || result;

  return (
    <div className="bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl p-6">
      <div className="flex items-center gap-2 mb-1">
        <Rocket className="w-5 h-5 text-[#A855F7]" />
        <h3 className="text-lg font-semibold text-white">Gasless Token Launch (Robinhood Chain)</h3>
      </div>
      <p className="text-gray-400 text-sm mb-6">
        Launch a token on Robinhood Chain — ClawPump fronts gas & fees. Creator fees route to your payout wallet.
        Requires a sponsored PONS allowance on the agent (contact ClawPump). If ClawPump is temporarily unavailable,
        the API returns 503 and the launch should be retried later.
      </p>

      <form onSubmit={submit} className="space-y-4">
        <Field label="ClawPump Agent">
          <AgentSelect agents={agents} loading={agentsLoading} value={agentId} onChange={(v) => {
            setAgentId(v);
            const ag = agents.find((a) => a.id === v);
            if (ag?.walletAddress) setPayoutWallet(ag.walletAddress);
          }} />
          <p className="text-xs text-gray-500 mt-2">Launches only work with agents owned by your connected ClawPump key</p>
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Token Name">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="My Token"
              className="w-full bg-black border border-[#1f1f1f] rounded-lg px-4 py-2.5 text-white focus:border-[#A855F7] focus:outline-none" required />
          </Field>
          <Field label="Ticker (max 12)">
            <input value={symbol} onChange={(e) => setSymbol(e.target.value.toUpperCase())} placeholder="CLAW" maxLength={12}
              className="w-full bg-black border border-[#1f1f1f] rounded-lg px-4 py-2.5 text-white focus:border-[#A855F7] focus:outline-none uppercase" required />
          </Field>
        </div>

        <Field label="Description (optional)">
          <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Token description"
            className="w-full bg-black border border-[#1f1f1f] rounded-lg px-4 py-2.5 text-white focus:border-[#A855F7] focus:outline-none" />
        </Field>

        <Field label="Payout Address (0x... EVM)" hint="Your Robinhood Chain payout address — where ETH/WETH creator fees land">
          <input value={payoutWallet} onChange={(e) => setPayoutWallet(e.target.value)} placeholder="0x... where creator fees land"
            className="w-full bg-black border border-[#1f1f1f] rounded-lg px-4 py-2.5 text-white focus:border-[#A855F7] focus:outline-none font-mono text-sm" required />
        </Field>

        <Field label="Logo URL (optional, https)">
          <input value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} placeholder="https://..."
            className="w-full bg-black border border-[#1f1f1f] rounded-lg px-4 py-2.5 text-white focus:border-[#A855F7] focus:outline-none text-sm" />
        </Field>

        {error && <p className="text-red-400 text-sm border border-red-500/30 bg-red-500/10 rounded-lg px-3 py-2">{error}</p>}

        <button type="submit" disabled={loading || !agentId || !name || !symbol || !payoutWallet}
          className="w-full flex items-center justify-center gap-2 bg-[#A855F7] text-white font-semibold py-3 rounded-lg hover:bg-[#A855F7]/90 transition-colors disabled:opacity-50">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Rocket className="w-4 h-4" /> Launch Gasless Token</>}
        </button>
      </form>

      {result && (
        <div className="mt-5 rounded-xl border border-[#A855F7]/30 bg-black p-5">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div>
              <p className="text-lg font-bold text-white">{launch?.name || name}</p>
              <p className="text-sm text-gray-400">{launch?.symbol || symbol} · Robinhood Chain (4663)</p>
            </div>
            <StatusBadge status={launch?.status || "submitted"} />
          </div>
          <div className="space-y-1 rounded-md bg-[#0a0a0a] border border-[#1f1f1f] p-3 text-xs">
            <div className="flex justify-between"><span className="text-gray-500">Launch ID</span><span className="font-mono text-gray-300">{shortAddr(launch?.id, 10)}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Token Address</span>
              {launch?.tokenAddress || launch?.predictedTokenAddress ? (
                <a href={`https://clawpump.tech/tokens/${launch?.tokenAddress || launch?.predictedTokenAddress}`} target="_blank" rel="noopener noreferrer" className="font-mono text-[#A855F7] underline">{shortAddr(launch?.tokenAddress || launch?.predictedTokenAddress, 8)}</a>
              ) : <span className="text-gray-400 italic">Minting… check back shortly</span>}
            </div>
          </div>
          {(launch?.status === "reserved" || launch?.status === "submitted") && (
            <p className="mt-3 rounded-md border border-amber-600/40 bg-amber-900/20 p-2 text-xs text-amber-300">
              Token is being minted on Robinhood Chain — do NOT re-submit or you will mint a second token. Status updates automatically below.
            </p>
          )}
        </div>
      )}

      {/* PONS Launch history */}
      <div className="mt-6">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-medium text-white">Your PONS Launches</p>
          {launchesLoading && <Loader2 className="w-3 h-3 animate-spin text-gray-500" />}
        </div>
        {launches.length === 0 ? (
          <p className="text-xs text-gray-600">
            {agentId ? "No launches yet for this agent. Submit the form above to launch your first token." : "Select an agent to see its launch history."}
          </p>
        ) : (
          <div className="space-y-2">
            {launches.map((l, i) => (
              <div key={l.id || i} className="rounded-md border border-[#1f1f1f] bg-black p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white">{l.symbol || l.name || "Untitled"} <span className="ml-2 text-xs font-mono text-gray-500">{shortAddr(l.id, 8)}</span></p>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                      {l.txHash && <a href={`https://robinhoodchain.blockscout.com/tx/${l.txHash}`} target="_blank" rel="noopener noreferrer" className="font-mono text-gray-400 underline hover:text-[#A855F7]">tx {shortAddr(l.txHash, 6)}</a>}
                      {l.tokenAddress ? (
                        <a href={`https://clawpump.tech/tokens/${l.tokenAddress}`} target="_blank" rel="noopener noreferrer" className="font-mono text-[#A855F7] underline">token {shortAddr(l.tokenAddress, 6)}</a>
                      ) : <span className="text-gray-600">token pending</span>}
                      {l.createdAt && <span className="text-gray-600">{new Date(l.createdAt).toLocaleString()}</span>}
                    </div>
                  </div>
                  <StatusBadge status={l.status} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────
// CLAW LAUNCH TAB — Solana gasless / self-funded
// ──────────────────────────────────────────────
function ClawLaunchTab({ agents, agentsLoading, hasKey }: { agents: ClawAgent[]; agentsLoading: boolean; hasKey: boolean }) {
  const [mode, setMode] = useState<"gasless" | "self-funded">("gasless");
  const [agentId, setAgentId] = useState("");
  const [form, setForm] = useState({ name: "", symbol: "", description: "", imageUrl: "", twitter: "", website: "", devBuy: "" });
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<any>(null);
  const [funding, setFunding] = useState<any>(null);
  const [agreed, setAgreed] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (agents.length > 0 && !agentId) setAgentId(agents[0].id);
  }, [agents, agentId]);

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true); setError("");
    try {
      const dataUrl: string = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error("Could not read file"));
        reader.readAsDataURL(file);
      });
      const res = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: dataUrl }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
      setForm((f) => ({ ...f, imageUrl: data.url }));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const token = localStorage.getItem("authToken");
    if (!token || !agentId) return;
    setLoading(true); setError(""); setResult(null); setFunding(null);
    try {
      const res = await fetch("/api/clawpump/launch", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ mode: mode === "gasless" ? "gasless" : "selffunded", agentId, ...form }),
      });
      const data = await res.json();
      if (!res.ok) {
        const isFunding = !!data?.selfFunded || data?.code === "MAX_GASLESS_LAUNCHES_PER_USER_EXCEEDED" || data?.status === "needs_funding" || data?.nextStep === "self_funded";
        if (isFunding) setFunding(data);
        else setError(data.error || "Launch failed");
        return;
      }
      setResult(data.result || data);
    } catch (err: any) {
      setError(err.message || "Launch failed");
    } finally {
      setLoading(false);
    }
  }

  async function copyAddr(addr: string) {
    try { await navigator.clipboard.writeText(addr); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch {}
  }

  const selectedAgent = agents.find((a) => a.id === agentId);
  const launch = result?.launch || result;

  return (
    <div className="bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl p-6">
      <div className="flex items-center gap-2 mb-1">
        <Flame className="w-5 h-5 text-[#FFD700]" />
        <h3 className="text-lg font-semibold text-white">ClawLaunch — Tokenize an Agent on Solana</h3>
      </div>
      <p className="text-gray-400 text-sm mb-6">
        Tokenize one of your ClawPump agents on Solana — gasless (sponsored) or self-funded, via your connected ClawPump key.
      </p>

      <div className="flex gap-3 mb-6">
        <button type="button" onClick={() => setMode("gasless")}
          className={`flex-1 rounded-lg border p-3 text-left transition-colors ${mode === "gasless" ? "border-[#FFD700] bg-[#FFD700]/10" : "border-[#1f1f1f] bg-black hover:border-gray-600"}`}>
          <p className="text-sm font-medium text-white flex items-center gap-2"><Rocket className="w-4 h-4 text-[#FFD700]" /> Gasless Launch</p>
          <p className="text-xs text-gray-500 mt-1">Tokenizes the selected agent once using gasless sponsorship — no bonding-curve buy.</p>
        </button>
        <button type="button" onClick={() => setMode("self-funded")}
          className={`flex-1 rounded-lg border p-3 text-left transition-colors ${mode === "self-funded" ? "border-[#FFD700] bg-[#FFD700]/10" : "border-[#1f1f1f] bg-black hover:border-gray-600"}`}>
          <p className="text-sm font-medium text-white flex items-center gap-2"><Wallet className="w-4 h-4 text-[#FFD700]" /> Self-Funded</p>
          <p className="text-xs text-gray-500 mt-1">Agent wallet pays creation (+ optional dev buy); tokens from the buy go to the agent wallet.</p>
        </button>
      </div>

      <form onSubmit={submit} className="space-y-4">
        <Field label="ClawPump Agent">
          <AgentSelect agents={agents} loading={agentsLoading} value={agentId} onChange={setAgentId} />
          <p className="text-xs text-gray-500 mt-2">Launches only work with agents owned by your connected ClawPump key</p>
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Token Name">
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="My Token"
              className="w-full bg-black border border-[#1f1f1f] rounded-lg px-4 py-2.5 text-white focus:border-[#FFD700] focus:outline-none" />
          </Field>
          <Field label="Ticker (max 12)">
            <input value={form.symbol} onChange={(e) => setForm({ ...form, symbol: e.target.value.toUpperCase() })} placeholder="CLAW" maxLength={12}
              className="w-full bg-black border border-[#1f1f1f] rounded-lg px-4 py-2.5 text-white focus:border-[#FFD700] focus:outline-none uppercase" />
          </Field>
        </div>

        <Field label="Description">
          <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder={mode === "self-funded" ? "Token description (min 20 characters)" : "Token description"}
            className="w-full bg-black border border-[#1f1f1f] rounded-lg px-4 py-2.5 text-white focus:border-[#FFD700] focus:outline-none" />
        </Field>

        <Field label="Image URL (optional, https)">
          <div className="flex gap-2">
            <input value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} placeholder="https://... or upload an image"
              className="flex-1 bg-black border border-[#1f1f1f] rounded-lg px-4 py-2.5 text-white focus:border-[#FFD700] focus:outline-none text-sm" />
            <input id="claw-image-file" type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="hidden" onChange={handleImageUpload} />
            <button type="button" onClick={() => document.getElementById("claw-image-file")?.click()} disabled={uploading}
              className="shrink-0 flex items-center gap-2 bg-black border border-[#FFD700]/40 text-[#FFD700] px-4 rounded-lg hover:bg-[#FFD700]/10 disabled:opacity-50 text-sm">
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              {uploading ? "Uploading" : "Upload"}
            </button>
          </div>
          {form.imageUrl && <p className="text-[11px] text-gray-500 break-all mt-1">Image URL: <span className="font-mono">{form.imageUrl}</span></p>}
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="X / Twitter URL (optional)">
            <input value={form.twitter} onChange={(e) => setForm({ ...form, twitter: e.target.value })} placeholder="https://x.com/..."
              className="w-full bg-black border border-[#1f1f1f] rounded-lg px-4 py-2.5 text-white focus:border-[#FFD700] focus:outline-none text-sm" />
          </Field>
          <Field label="Website URL (optional)">
            <input value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} placeholder="https://..."
              className="w-full bg-black border border-[#1f1f1f] rounded-lg px-4 py-2.5 text-white focus:border-[#FFD700] focus:outline-none text-sm" />
          </Field>
        </div>

        {mode === "self-funded" && (
          <Field label="Dev Buy (optional SOL)" hint="Optional initial buy from the agent wallet. Leave empty for no dev buy.">
            <input value={form.devBuy} onChange={(e) => setForm({ ...form, devBuy: e.target.value })} placeholder="0.1"
              className="w-full bg-black border border-[#1f1f1f] rounded-lg px-4 py-2.5 text-white focus:border-[#FFD700] focus:outline-none text-sm" />
          </Field>
        )}

        {mode === "self-funded" && selectedAgent && !selectedAgent.walletAddress && (
          <p className="text-xs text-amber-400">This agent has no wallet address — self-funded launches need the agent wallet to pay.</p>
        )}

        {mode === "self-funded" && (
          <div className="rounded-lg border border-[#1f1f1f] bg-black p-4 space-y-3">
            <p className="text-sm font-medium text-white">Cost Breakdown</p>
            <div className="space-y-1 text-xs text-gray-400">
              <div className="flex justify-between"><span>~0.0350 SOL from agent wallet</span></div>
              <div className="flex justify-between"><span>~0.0250 SOL mint and network fees</span></div>
              <div className="flex justify-between"><span>ClawPump mints on your behalf — you keep 65% of creator fees</span></div>
            </div>
            <div className="border-t border-[#1f1f1f] pt-3 space-y-2">
              <p className="text-xs text-gray-500">I agree to the Terms and understand what happens next:</p>
              <ul className="text-[11px] text-gray-500 space-y-1 list-disc list-inside">
                <li>The mint is permanent — cannot be renamed, edited or undone once live.</li>
                <li>Trading opens immediately on the bonding curve. Price is set by the market.</li>
                <li>You keep 65% of creator fees, ClawPump takes 35%. Fees pay into the agent wallet.</li>
                <li>ClawPump never custodies your funds. Every transaction is signed by the agent wallet.</li>
              </ul>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="rounded border-gray-600 bg-black" />
                <span className="text-xs text-gray-300">I understand and agree</span>
              </label>
            </div>
          </div>
        )}

        {error && <p className="text-red-400 text-sm border border-red-500/30 bg-red-500/10 rounded-lg px-3 py-2">{error}</p>}

        <button type="submit" disabled={loading || (mode === "self-funded" && !agreed) || !agentId}
          className="w-full flex items-center justify-center gap-2 bg-[#FFD700] text-black font-semibold py-3 rounded-lg hover:bg-[#FFD700]/90 transition-colors disabled:opacity-50">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Flame className="w-4 h-4" /> {mode === "gasless" ? "Launch Gasless Token" : "Launch Self-Funded Token"}</>}
        </button>
      </form>

      {funding && (
        <div className="mt-5 rounded-xl border border-amber-600/40 bg-black p-5 space-y-3">
          <p className="text-sm font-medium text-white flex items-center gap-2"><Wallet className="w-4 h-4 text-amber-400" /> Gasless quota used — fund your agent wallet</p>
          <p className="text-xs text-gray-400">
            {funding.selfFunded?.requiredSol
              ? `Fund the agent wallet with ~${funding.selfFunded.requiredSol} SOL, then retry as Self-Funded. ClawPump still mints on your behalf — you keep 65% of creator fees.`
              : funding.message || funding.error || "The agent wallet needs SOL to cover the launch."}
          </p>
          {funding.selfFunded?.fundWallet && (
            <div className="flex items-center justify-between rounded-md border border-[#1f1f1f] bg-[#0a0a0a] p-3">
              <div className="min-w-0">
                <p className="text-[11px] uppercase text-gray-500">Fund wallet</p>
                <p className="text-sm font-mono text-gray-300 break-all">{funding.selfFunded.fundWallet}</p>
              </div>
              <button type="button" onClick={() => copyAddr(funding.selfFunded.fundWallet)} className="ml-3 shrink-0 text-gray-400 hover:text-white">
                {copied ? <CheckCircle2 className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          )}
          <button type="button" onClick={() => { setMode("self-funded"); setFunding(null); }}
            className="w-full flex items-center justify-center gap-2 bg-[#FFD700] text-black font-semibold py-2.5 rounded-lg hover:bg-[#FFD700]/90 transition-colors text-sm">
            Retry as Self-Funded <Wallet className="w-4 h-4 ml-1" />
          </button>
        </div>
      )}

      {result && (
        <div className="mt-5 rounded-xl border border-[#FFD700]/30 bg-black p-5 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-white flex items-center gap-2"><Rocket className="w-4 h-4 text-[#FFD700]" /> Launch Result</p>
            <StatusBadge status={launch?.status || "submitted"} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            {[["Launch ID", launch?.id || launch?.launchId], ["Token Symbol", form.symbol || launch?.symbol], ["Status", launch?.status], ["Created", launch?.createdAt]].map(([k, v]) => v ? (
              <div key={String(k)}><p className="text-gray-500">{k}</p><p className="font-mono text-gray-300 break-all">{String(v)}</p></div>
            ) : null)}
          </div>
          {(launch?.mintAddress || launch?.tokenAddress || launch?.predictedTokenAddress) && (
            <div className="flex flex-wrap gap-2 text-xs">
              <a href={`https://pump.fun/${launch?.mintAddress || launch?.tokenAddress || launch?.predictedTokenAddress}`} target="_blank" rel="noopener noreferrer" className="text-[#FFD700] underline">View on pump.fun <ExternalLink className="w-3 h-3 inline" /></a>
              <a href={`https://solscan.io/token/${launch?.mintAddress || launch?.tokenAddress || launch?.predictedTokenAddress}`} target="_blank" rel="noopener noreferrer" className="text-[#FFD700] underline">View on Solscan <ExternalLink className="w-3 h-3 inline" /></a>
            </div>
          )}
          <details className="mt-2">
            <summary className="cursor-pointer text-xs text-gray-500">Full response</summary>
            <pre className="mt-2 max-h-64 overflow-auto rounded-md bg-[#0a0a0a] p-3 text-[11px] text-gray-400">{JSON.stringify(result, null, 2)}</pre>
          </details>
        </div>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────
// PAGE
// ──────────────────────────────────────────────
export default function LaunchPage() {
  const [tab, setTab] = useState<"pons" | "claw">("pons");
  const [agents, setAgents] = useState<ClawAgent[]>([]);
  const [agentsLoading, setAgentsLoading] = useState(true);
  const [hasKey, setHasKey] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("authToken");
    if (!token) { setAgentsLoading(false); return; }
    fetch("/api/user/settings", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((data) => {
        setHasKey(data.hasClawpumpKey || false);
        setAgents(data.clawpump?.agents || []);
      })
      .catch(() => {})
      .finally(() => setAgentsLoading(false));
  }, []);

  if (!hasKey) {
    return (
      <div className="bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl p-8 text-center">
        <Rocket className="w-10 h-10 mx-auto mb-4 text-gray-500" />
        <h3 className="text-lg font-semibold text-white mb-2">Connect your ClawPump key</h3>
        <p className="text-gray-400 text-sm mb-4">Connect your own cpk_ key in Settings to launch tokens.</p>
        <a href="/dashboard/settings" className="inline-flex items-center gap-2 bg-[#00FF88] text-black font-semibold px-4 py-2 rounded-lg">Go to Settings</a>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-2">Launch Studio</h1>
        <p className="text-gray-400">Launch gasless or self-funded tokens (PONS, pump.fun) from your agents</p>
      </div>

      <div className="flex mb-6 bg-[#0a0a0a] border border-[#1f1f1f] rounded-lg p-1 w-full max-w-md">
        <button onClick={() => setTab("pons")}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-colors ${tab === "pons" ? "bg-[#A855F7] text-white" : "text-gray-400 hover:text-white"}`}>
          <Rocket className="w-4 h-4" /> PONS (Robinhood Chain)
        </button>
        <button onClick={() => setTab("claw")}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-colors ${tab === "claw" ? "bg-[#FFD700] text-black" : "text-gray-400 hover:text-white"}`}>
          <Flame className="w-4 h-4" /> ClawLaunch (Solana)
        </button>
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl">
        {tab === "pons" ? (
          <PonsTab agents={agents} agentsLoading={agentsLoading} hasKey={hasKey} />
        ) : (
          <ClawLaunchTab agents={agents} agentsLoading={agentsLoading} hasKey={hasKey} />
        )}
      </motion.div>
    </div>
  );
}
