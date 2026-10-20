import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getReadState,
  isReadStatus,
  mergeReadState,
  normalizeTagsInput,
  normalizeUrl,
  parseMetadata,
  parseTags,
  serializeTags,
  toBookmarkDTO,
  type ReadStatus,
} from "@/lib/bookmarks";
import { fetchOgp } from "@/lib/ogp";

type SortKey = "new" | "updated" | "title";

function parseSort(v: string | null): SortKey {
  return v === "updated" || v === "title" ? v : "new";
}

export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const room = await prisma.room.findUnique({ where: { slug } });
  if (!room) return NextResponse.json({ error: "Roomが見つかりません" }, { status: 404 });

  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") ?? "").trim();
  const tag = (searchParams.get("tag") ?? "").trim();
  const category = (searchParams.get("category") ?? "").trim();
  const favoriteOnly = searchParams.get("favorite") === "true";
  const readStatusParam = searchParams.get("readStatus");
  const readStatusFilter = isReadStatus(readStatusParam) ? readStatusParam : null;
  const rereadOnly = searchParams.get("reread") === "true";
  const sort = parseSort(searchParams.get("sort"));

  let categoryId: string | undefined;
  if (category) {
    const cat = await prisma.category.findUnique({
      where: { roomId_slug: { roomId: room.id, slug: category } },
    });
    if (!cat) return NextResponse.json({ bookmarks: [], tags: [] });
    categoryId = cat.id;
  }

  const orderBy =
    sort === "title" ? { title: "asc" as const } : sort === "updated" ? { updatedAt: "desc" as const } : { createdAt: "desc" as const };

  const rows = await prisma.bookmark.findMany({
    where: {
      roomId: room.id,
      ...(categoryId ? { categoryId } : {}),
      ...(favoriteOnly ? { favorite: true } : {}),
      ...(q
        ? { OR: [{ title: { contains: q } }, { url: { contains: q } }, { memo: { contains: q } }] }
        : {}),
    },
    include: { category: { select: { name: true, slug: true } } },
    orderBy,
    take: 1000,
  });

  const filtered = rows.filter((r) => {
    if (tag && !parseTags(r.tagsJson).includes(tag)) return false;
    if (!readStatusFilter && !rereadOnly) return true;
    const state = getReadState(parseMetadata(r.metadata));
    if (readStatusFilter && state.readStatus !== readStatusFilter) return false;
    return !rereadOnly || state.reread;
  });

  const tagCounts = new Map<string, number>();
  for (const r of rows) {
    for (const t of parseTags(r.tagsJson)) tagCounts.set(t, (tagCounts.get(t) ?? 0) + 1);
  }

  return NextResponse.json({
    bookmarks: filtered.map(toBookmarkDTO),
    tags: [...tagCounts.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "ja")),
  });
}

export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const room = await prisma.room.findUnique({
    where: { slug },
    include: { categories: true },
  });
  if (!room) return NextResponse.json({ error: "Roomが見つかりません" }, { status: 404 });

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "リクエストボディが不正です" }, { status: 400 });
  }

  const url = normalizeUrl(typeof body.url === "string" ? body.url : "");
  if (!url) return NextResponse.json({ error: "有効なURLを入力してください" }, { status: 400 });

  let categoryId: string | null = null;
  if (typeof body.categorySlug === "string" && body.categorySlug) {
    const cat = room.categories.find((c) => c.slug === body.categorySlug);
    if (!cat) return NextResponse.json({ error: "Categoryが見つかりません" }, { status: 400 });
    categoryId = cat.id;
  } else if (room.categories.length > 0) {
    return NextResponse.json({ error: "カテゴリを選択してください" }, { status: 400 });
  }

  let readStatus: ReadStatus | undefined;
  if ("readStatus" in body) {
    if (!isReadStatus(body.readStatus)) {
      return NextResponse.json({ error: "読書状態が不正です" }, { status: 400 });
    }
    readStatus = body.readStatus;
  }
  const reread = "reread" in body ? body.reread === true : undefined;
  const metadata =
    readStatus !== undefined || reread !== undefined
      ? mergeReadState(null, { readStatus, reread })
      : undefined;

  let title = typeof body.title === "string" ? body.title.trim() : "";
  let description = typeof body.description === "string" ? body.description.trim() || null : null;
  let ogImage = typeof body.ogImage === "string" ? body.ogImage.trim() || null : null;
  if (!title || !description || !ogImage) {
    try {
      const ogp = await fetchOgp(url);
      if (!title) title = ogp.title ?? "";
      if (!description) description = ogp.description;
      if (!ogImage) ogImage = ogp.ogImage;
    } catch {
      // Why not fail here: OGP取得の失敗で登録自体を止めない（URL貼付→保存を優先し後から追記できる設計のため）
    }
  }
  if (!title) title = url;

  const created = await prisma.bookmark.create({
    data: {
      roomId: room.id,
      categoryId,
      url,
      title,
      description,
      ogImage,
      memo: typeof body.memo === "string" ? body.memo.trim() || null : null,
      tagsJson: serializeTags(normalizeTagsInput(body.tags)),
      favorite: body.favorite === true,
      ...(metadata !== undefined ? { metadata } : {}),
    },
    include: { category: { select: { name: true, slug: true } } },
  });

  return NextResponse.json(toBookmarkDTO(created), { status: 201 });
}
