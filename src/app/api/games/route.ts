import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { games } from "@/lib/db/schema";

const GAMES_DATA = [
  {
    id: "11111111-1111-1111-1111-111111111111",
    name: "Crypto Smash",
    slug: "crypto-smash",
    description: "Defeat rug-pull enemies in this action fighter game",
    category: "Action",
    difficulty: "Medium",
    maxScore: 100000,
    isActive: true,
  },
  {
    id: "22222222-2222-2222-2222-222222222222",
    name: "Chomper",
    slug: "chomper",
    description: "Collect $CLAW tokens in a maze. Avoid the bears!",
    category: "Arcade",
    difficulty: "Easy",
    maxScore: 50000,
    isActive: true,
  },
  {
    id: "33333333-3333-3333-3333-333333333333",
    name: "Swarm",
    slug: "swarm",
    description: "Survive endless waves of enemies",
    category: "Survival",
    difficulty: "Hard",
    maxScore: 200000,
    isActive: true,
  },
  {
    id: "44444444-4444-4444-4444-444444444444",
    name: "Cascade",
    slug: "cascade",
    description: "Match crypto symbols for massive combos",
    category: "Puzzle",
    difficulty: "Medium",
    maxScore: 150000,
    isActive: true,
  },
  {
    id: "55555555-5555-5555-5555-555555555555",
    name: "Rocket Ride",
    slug: "rocket-ride",
    description: "Ride the green candle to the moon!",
    category: "Runner",
    difficulty: "Medium",
    maxScore: 100000,
    isActive: true,
  },
];

export async function GET() {
  return NextResponse.json({ games: GAMES_DATA });
}
