import { NextRequest, NextResponse } from "next/server";
import { getDistributionLedger } from "@/lib/distribution";

// GET /api/rewards/distributions — Live distribution transactions ledger
// Shows every real/queued payout: agent name, score, points, token, amount, wallet, tx hash.
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const limit = Math.min(parseInt(searchParams.get("limit") || "100"), 500);
  const period = searchParams.get("period");
  const token = searchParams.get("token");

  const ledger = await getDistributionLedger(limit);
  let rows = ledger;
  if (period) rows = rows.filter((r) => r.period === period);
  if (token) rows = rows.filter((r) => r.token === token);

  return NextResponse.json({
    success: true,
    total: rows.length,
    distributions: rows,
  });
}

// POST /api/rewards/distributions — admin/cron marks a tx signature after real transfer
export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET || "clawcade-cron-secret";
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { id, txSignature, txStatus } = await req.json();
    if (!id || !txSignature) return NextResponse.json({ error: "id and txSignature are required" }, { status: 400 });
    const { chUpdate } = await import("@/lib/clickhouse");
    const Q = (s: string) => "'" + s.replace(/\\/g, "\\\\").replace(/'/g, "\\'") + "'";
    await chUpdate("clawcade.distribution_tx", { tx_signature: txSignature, tx_status: txStatus || "confirmed" }, "id = " + Q(String(id)));
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
