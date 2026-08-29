import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { uploadedImages } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

// GET /api/upload/:id — serve the uploaded image
export async function GET(_req: NextRequest, ctx: { params: { id: string } }) {
  try {
    const { id } = await ctx.params;
    const [row] = await db
      .select()
      .from(uploadedImages)
      .where(eq(uploadedImages.id, id))
      .limit(1);
    if (!row) {
      return NextResponse.json({ error: "Image not found" }, { status: 404 });
    }
    const buffer = Buffer.from(row.data, "base64");
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": row.mime || "image/png",
        "Cache-Control": "public, max-age=31536000, immutable",
        "Content-Length": String(buffer.length),
      },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
