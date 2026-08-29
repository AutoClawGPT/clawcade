import { create } from "zustand";

interface User {
  id: string;
  email: string;
  name: string;
  image?: string;
  walletAddress?: string;
  authToken?: string;
  role: string;
  level: number;
  xp: number;
  totalScore: number;
  totalGames: number;
  tokensEarned: number;
}

interface AppState {
  user: User | null;
  setUser: (user: User | null) => void;
  isAuthenticated: boolean;
}

export const useAppStore = create<AppState>((set) => ({
  user: null,
  setUser: (user) => set({ user, isAuthenticated: !!user }),
  isAuthenticated: false,
}));
