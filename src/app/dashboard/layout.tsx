"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Gamepad2,
  Trophy,
  Gift,
  Bot,
  Settings,
  User,
  BarChart3,
  Wallet,
  Menu,
  X,
  Home,
  Swords,
} from "lucide-react";

const navItems = [
  { href: "/dashboard", icon: Home, label: "Overview" },
  { href: "/dashboard/games", icon: Gamepad2, label: "Games" },
  { href: "/dashboard/leaderboard", icon: Trophy, label: "Leaderboard" },
  { href: "/dashboard/rewards", icon: Gift, label: "Rewards" },
  { href: "/dashboard/agents", icon: Bot, label: "Agents" },
  { href: "/dashboard/duels", icon: Swords, label: "Duels" },
  { href: "/dashboard/wallet", icon: Wallet, label: "Wallet" },
  { href: "/dashboard/analytics", icon: BarChart3, label: "Analytics" },
  { href: "/dashboard/profile", icon: User, label: "Profile" },
  { href: "/dashboard/settings", icon: Settings, label: "Settings" },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-black flex">
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-[#0a0a0a] border-r border-[#1f1f1f] transform transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static lg:inset-auto ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between h-16 px-6 border-b border-[#1f1f1f]">
          <Link href="/" className="flex items-center gap-2">
            <span className="font-arcade text-[#00FF88] text-sm tracking-wider">
              CLAWCADE
            </span>
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-gray-400 hover:text-white"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="mt-6 px-3">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 transition-all ${
                  isActive
                    ? "bg-[#00FF88]/10 text-[#00FF88] border border-[#00FF88]/20"
                    : "text-gray-400 hover:text-white hover:bg-white/5"
                }`}
              >
                <item.icon size={18} />
                <span className="text-sm font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>

      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <main className="flex-1 min-w-0">
        <div className="lg:hidden flex items-center justify-between h-16 px-4 border-b border-[#1f1f1f] bg-[#0a0a0a]">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-gray-400 hover:text-white"
          >
            <Menu size={24} />
          </button>
          <span className="font-arcade text-[#00FF88] text-sm">CLAWCADE</span>
          <div className="w-6" />
        </div>

        <div className="p-6 lg:p-8">{children}</div>
      </main>
    </div>
  );
}
