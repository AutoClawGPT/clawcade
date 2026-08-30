import { NextResponse } from "next/server";
import { listGameRows } from "@/lib/db/clickhouse-store";

export async function GET() {
  const allGames = await listGameRows();
  return NextResponse.json({ games: allGames });
}
