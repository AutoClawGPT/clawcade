import { NextRequest, NextResponse } from "next/server";
import { distributeHourlyRewards, distributeDailyRewards, distributeWeeklyRewards } from "@/lib/rewards";
import { db } from "@/lib/db";
import { platformConfig } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

// POST /api/rewards/distribute — Trigger reward distribution (admin/cron only)
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET || "clawcade-cron-secret";

  // Allow cron secret or admin token
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const body = await req.json();
  const { type } = body; // "hourly" | "daily" | "weekly"

  let results;
  switch (type) {
    case "hourly":
      results = await distributeHourlyRewards();
      break;
    case "daily":
      results = await distributeDailyRewards();
      break;
    case "weekly":
      results = await distributeWeeklyRewards();
      break;
    default:
      return NextResponse.json(
        { error: "Invalid type. Use: hourly, daily, weekly" },
        { status: 400 }
      );
  }

  return NextResponse.json({
    success: true,
    type,
    distributed: results.length,
    results,
  });
}
