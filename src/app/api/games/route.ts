import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { games } from "@/lib/db/schema";

// GET /api/games — List all games from the database
export async function GET() {
  const allGames = await db.select().from(games);
  return NextResponse.json({ games: allGames });
}
