import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { parseTags, serializeTags } from "@/lib/bookmarks";
import { toPersonDTO, validatePersonInput } from "@/lib/people";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { id } = await params;
  const person = await prisma.person.findUnique({ where: { id } });
  if (!person) return NextResponse.json({ error: "人物が見つかりません" }, { status: 404 });
  return NextResponse.json(toPersonDTO(person));
}

export async function PATCH(req: Request, { params }: Params) {
  const { id } = await params;
  const existing = await prisma.person.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "人物が見つかりません" }, { status: 404 });

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "リクエストボディが不正です" }, { status: 400 });
  }
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    return NextResponse.json({ error: "リクエストボディが不正です" }, { status: 400 });
  }
  const body = raw as Record<string, unknown>;

  const result = validatePersonInput({
    name: "name" in body ? body.name : existing.name,
    subGenres: "subGenres" in body ? body.subGenres : parseTags(existing.subGenresJson),
    memo: "memo" in body ? body.memo : existing.memo,
    url: "url" in body ? body.url : existing.url,
  });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  const data: Prisma.PersonUpdateInput = {};
  if ("name" in body) data.name = result.value.name;
  if ("subGenres" in body) data.subGenresJson = serializeTags(result.value.subGenres);
  if ("memo" in body) data.memo = result.value.memo;
  if ("url" in body) data.url = result.value.url;

  const updated = await prisma.person.update({ where: { id }, data });
  return NextResponse.json(toPersonDTO(updated));
}

export async function DELETE(_req: Request, { params }: Params) {
  const { id } = await params;
  const existing = await prisma.person.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "人物が見つかりません" }, { status: 404 });
  await prisma.person.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
