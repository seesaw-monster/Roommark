import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseTags, serializeTags } from "@/lib/bookmarks";
import { toPersonDTO, validatePersonInput } from "@/lib/people";
import { PERSON_ROOM_SLUG } from "@/lib/rooms";

type SortKey = "name" | "new" | "updated";

function parseSort(value: string | null): SortKey {
  return value === "name" || value === "updated" ? value : "new";
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") ?? "").trim();
  const subGenre = (searchParams.get("subGenre") ?? "").trim();
  const sort = parseSort(searchParams.get("sort"));

  const orderBy =
    sort === "name"
      ? { name: "asc" as const }
      : sort === "updated"
        ? { updatedAt: "desc" as const }
        : { createdAt: "desc" as const };

  const rows = await prisma.person.findMany({
    where: q
      ? { OR: [{ name: { contains: q } }, { memo: { contains: q } }] }
      : undefined,
    orderBy,
    take: 1000,
  });

  const filtered = subGenre
    ? rows.filter((person) => parseTags(person.subGenresJson).includes(subGenre))
    : rows;

  const subGenreCounts = new Map<string, number>();
  for (const person of rows) {
    for (const name of parseTags(person.subGenresJson)) {
      subGenreCounts.set(name, (subGenreCounts.get(name) ?? 0) + 1);
    }
  }

  return NextResponse.json({
    people: filtered.map(toPersonDTO),
    subGenres: [...subGenreCounts.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "ja")),
  });
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "リクエストボディが不正です" }, { status: 400 });
  }

  const result = validatePersonInput(body);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  const room = await prisma.room.findUnique({ where: { slug: PERSON_ROOM_SLUG } });
  if (!room) {
    return NextResponse.json(
      { error: "人物Roomが見つかりません。pnpm db:setup を実行してください" },
      { status: 500 },
    );
  }

  const created = await prisma.person.create({
    data: {
      roomId: room.id,
      name: result.value.name,
      subGenresJson: serializeTags(result.value.subGenres),
      memo: result.value.memo,
      url: result.value.url,
    },
  });

  return NextResponse.json(toPersonDTO(created), { status: 201 });
}
