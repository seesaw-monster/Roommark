import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { normalizeTagsInput, normalizeUrl, serializeTags, toBookmarkDTO } from "@/lib/bookmarks";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const b = await prisma.bookmark.findUnique({
    where: { id },
    include: { category: { select: { name: true, slug: true } } },
  });
  if (!b) return NextResponse.json({ error: "ブックマークが見つかりません" }, { status: 404 });
  return NextResponse.json(toBookmarkDTO(b));
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const existing = await prisma.bookmark.findUnique({
    where: { id },
    include: { room: { include: { categories: true } } },
  });
  if (!existing) return NextResponse.json({ error: "ブックマークが見つかりません" }, { status: 404 });

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "リクエストボディが不正です" }, { status: 400 });
  }

  let categoryId: string | null | undefined;
  if ("categorySlug" in body) {
    if (body.categorySlug === null || body.categorySlug === "") {
      if (existing.room.categories.length > 0) {
        return NextResponse.json({ error: "カテゴリを選択してください" }, { status: 400 });
      }
      categoryId = null;
    } else if (typeof body.categorySlug === "string") {
      const cat = existing.room.categories.find((c) => c.slug === body.categorySlug);
      if (!cat) return NextResponse.json({ error: "Categoryが見つかりません" }, { status: 400 });
      categoryId = cat.id;
    }
  }

  let url: string | undefined;
  if ("url" in body) {
    if (typeof body.url !== "string") return NextResponse.json({ error: "URLが不正です" }, { status: 400 });
    const normalized = normalizeUrl(body.url);
    if (!normalized) return NextResponse.json({ error: "有効なURLを入力してください" }, { status: 400 });
    url = normalized;
  }

  let title: string | undefined;
  if ("title" in body) {
    if (typeof body.title !== "string" || !body.title.trim()) {
      return NextResponse.json({ error: "タイトルを入力してください" }, { status: 400 });
    }
    title = body.title.trim();
  }

  const updated = await prisma.bookmark.update({
    where: { id },
    data: {
      ...(url !== undefined ? { url } : {}),
      ...(title !== undefined ? { title } : {}),
      ...("memo" in body
        ? { memo: typeof body.memo === "string" ? body.memo.trim() || null : null }
        : {}),
      ...("description" in body
        ? { description: typeof body.description === "string" ? body.description.trim() || null : null }
        : {}),
      ...("ogImage" in body
        ? { ogImage: typeof body.ogImage === "string" ? body.ogImage.trim() || null : null }
        : {}),
      ...("tags" in body ? { tagsJson: serializeTags(normalizeTagsInput(body.tags)) } : {}),
      ...("favorite" in body ? { favorite: body.favorite === true } : {}),
      ...(categoryId !== undefined ? { categoryId } : {}),
    },
    include: { category: { select: { name: true, slug: true } } },
  });

  return NextResponse.json(toBookmarkDTO(updated));
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const existing = await prisma.bookmark.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "ブックマークが見つかりません" }, { status: 404 });
  await prisma.bookmark.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
