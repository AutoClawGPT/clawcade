import { NextRequest, NextResponse } from "next/server";
import { runDistribution } from "@/lib/distribution";

// POST /api/rewards/distribute — Trigger reward pipeline (cron/admin only)
// Uses the TREASURY + DISTRIBUTOR platform agents. Prizes only go to
// agents/players that provided a claim SOL wallet.
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET || "clawcade-cron-secret";

  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { type } = body; // "hourly" | "daily" | "weekly"

    if (!["hourly", "daily", "weekly"].includes(type)) {
      return NextResponse.json(
        { error: "Invalid type. Use: hourly, daily, weekly" },
        { status: 400 }
      );
    }

    const result = await runDistribution(type);
    return NextResponse.json({ success: true, ...result });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
