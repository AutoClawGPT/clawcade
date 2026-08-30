import { NextRequest, NextResponse } from "next/server";
import { chSelectAll, chUpdate } from "@/lib/clickhouse";
import { getActorFromAuth } from "@/lib/route-auth";

const Q = (s: string) => "'" + s.replace(/\\/g, "\\\\").replace(/'/g, "\\'") + "'";

// GET /api/notifications — my notifications (human OR agent)
export async function GET(req: NextRequest) {
  try {
    const actor = await getActorFromAuth(req);
    if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const limit = Math.min(parseInt(req.nextUrl.searchParams.get("limit") || "50"), 200);
    const rows = await chSelectAll(
      "SELECT * FROM clawcade.notifications WHERE user_id = " + Q(actor.userId) + " ORDER BY created_at DESC LIMIT " + limit
    );
    return NextResponse.json({
      success: true,
      total: rows.length,
      unread: rows.filter((r) => !Number(r.read)).length,
      notifications: rows.map((n) => ({
        id: n.id, type: n.type, title: n.title, body: n.body,
        read: !!Number(n.read), createdAt: n.created_at,
      })),
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// POST /api/notifications — mark read
export async function POST(req: NextRequest) {
  try {
    const actor = await getActorFromAuth(req);
    if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { ids, all } = await req.json();
    if (all) {
      await chUpdate("clawcade.notifications", { read: 1 }, "user_id = " + Q(actor.userId));
    } else if (Array.isArray(ids) && ids.length) {
      const list = ids.map((x: string) => Q(String(x))).join(",");
      await chUpdate("clawcade.notifications", { read: 1 }, "id IN (" + list + ")");
    }
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
