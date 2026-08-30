import { NextRequest, NextResponse } from "next/server";
import { chInsert } from "@/lib/clickhouse";
import { newId } from "@/lib/db/clickhouse-store";

export const dynamic = "force-dynamic";

const MAX_BYTES = 2 * 1024 * 1024; // 2MB (kept under ClickHouse query limits)
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

// POST /api/upload — upload an image (base64 or data URL), returns URL for launch
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const raw = typeof body.image === "string" ? body.image.trim() : "";
    if (!raw) {
      return NextResponse.json({ error: 'image is required — send { image: "<base64 or data URL>" }' }, { status: 400 });
    }

    let b64 = raw;
    let mime = "image/png";
    if (raw.startsWith("data:")) {
      const match = raw.match(/^data:([^;]+);base64,([\s\S]+)$/);
      if (!match) return NextResponse.json({ error: "Invalid data URL" }, { status: 400 });
      mime = match[1];
      b64 = match[2];
    }
    if (!ALLOWED.has(mime)) {
      return NextResponse.json({ error: "Only PNG, JPEG, WebP, or GIF images are allowed" }, { status: 400 });
    }

    const buffer = Buffer.from(b64, "base64");
    if (!buffer.length) return NextResponse.json({ error: "Empty image data" }, { status: 400 });
    if (buffer.length > MAX_BYTES) {
      return NextResponse.json({ error: "Image too large — max 2MB" }, { status: 400 });
    }

    // Magic-byte validation
    const isPng = buffer[0] === 0x89 && buffer[1] === 0x50;
    const isJpeg = buffer[0] === 0xff && buffer[1] === 0xd8;
    const isWebp = buffer.toString("ascii", 0, 4) === "RIFF";
    const isGif = buffer.toString("ascii", 0, 4) === "GIF8";
    if (!isPng && !isJpeg && !isWebp && !isGif) {
      return NextResponse.json({ error: "Uploaded data is not a valid PNG/JPEG/WebP/GIF image" }, { status: 400 });
    }

    const id = newId();
    const now = new Date().toISOString().slice(0, 19).replace("T", " ");
    await chInsert("clawcade.uploaded_images", [{
      id, user_id: "", path: "", url: "", size: buffer.length,
      content_type: mime, data: buffer.toString("base64"), created_at: now,
    }]);

    const publicBase =
      (process.env.NEXTAUTH_URL && process.env.NEXTAUTH_URL.trim()) ||
      (process.env.APP_URL && process.env.APP_URL.trim()) ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "") ||
      req.nextUrl.origin;
    const url = `${publicBase}/api/upload/${id}`;
    return NextResponse.json({ id, url, mime, size: buffer.length, message: "Image uploaded — use the returned URL in your launch." }, { status: 201 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
