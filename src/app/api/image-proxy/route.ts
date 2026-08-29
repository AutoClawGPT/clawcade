import { NextRequest, NextResponse } from "next/server";

// GET /api/image-proxy?u=<base64url(https url)> — proxy external images through
// our own domain so ClawPump's image validation accepts them.
export async function GET(req: NextRequest) {
  const enc = req.nextUrl.searchParams.get("u") || req.nextUrl.searchParams.get("url");
  if (!enc) {
    return NextResponse.json({ error: "Missing u parameter" }, { status: 400 });
  }

  let url: string;
  try {
    url = Buffer.from(enc, "base64url").toString("utf-8");
  } catch {
    try {
      url = decodeURIComponent(enc);
    } catch {
      return NextResponse.json({ error: "Invalid encoded URL" }, { status: 400 });
    }
  }

  if (!/^https?:\/\//i.test(url)) {
    return NextResponse.json({ error: "Only http(s) URLs are allowed" }, { status: 400 });
  }

  try {
    const upstream = await fetch(url, {
      headers: { "User-Agent": "ClawCade-ImageProxy/1.0" },
      cache: "no-store",
    });
    if (!upstream.ok) {
      return NextResponse.json({ error: `Upstream ${upstream.status}` }, { status: upstream.status });
    }
    const buf = Buffer.from(await upstream.arrayBuffer());
    const contentType =
      upstream.headers.get("content-type") || "image/png";
    return new NextResponse(new Uint8Array(buf), {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch {
    return NextResponse.json({ error: "Image fetch failed" }, { status: 502 });
  }
}
