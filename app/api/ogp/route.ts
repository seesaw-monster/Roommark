import { NextResponse } from "next/server";
import { normalizeUrl } from "@/lib/bookmarks";
import { fetchOgp } from "@/lib/ogp";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const raw = searchParams.get("url") ?? "";
  const url = normalizeUrl(raw);
  if (!url) return NextResponse.json({ error: "有効なURLを指定してください" }, { status: 400 });
  try {
    const ogp = await fetchOgp(url);
    return NextResponse.json({ url, ...ogp });
  } catch {
    return NextResponse.json({ url, title: null, description: null, ogImage: null, siteName: null });
  }
}
