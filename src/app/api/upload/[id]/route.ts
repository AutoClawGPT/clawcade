import { NextRequest, NextResponse } from "next/server";
import { chSelectAll } from "@/lib/clickhouse";

export const dynamic = "force-dynamic";

const Q = (s: string) => "'" + s.replace(/\\/g, "\\\\").replace(/'/g, "\\'") + "'";

// GET /api/upload/:id — serve the uploaded image
export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const rows = await chSelectAll("SELECT data, content_type FROM clawcade.uploaded_images WHERE id = " + Q(id) + " LIMIT 1");
    if (!rows.length || !rows[0].data) return NextResponse.json({ error: "Image not found" }, { status: 404 });
    const buffer = Buffer.from(String(rows[0].data), "base64");
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": String(rows[0].content_type || "image/png"),
        "Cache-Control": "public, max-age=31536000, immutable",
        "Content-Length": String(buffer.length),
      },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
