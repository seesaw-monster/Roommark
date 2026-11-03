import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { EVENT_ROOM_SLUG } from "@/lib/rooms";
import {
  getAllEvents,
  getEventsForTop,
  toEventDTO,
  validateEventInput,
} from "@/lib/events";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const scope = searchParams.get("scope") ?? "top";

  if (scope !== "top" && scope !== "all") {
    return NextResponse.json({ error: "scopeが不正です" }, { status: 400 });
  }

  const events = scope === "all" ? await getAllEvents() : await getEventsForTop();
  return NextResponse.json({ events });
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "リクエストボディが不正です" }, { status: 400 });
  }

  const result = validateEventInput(body);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  const room = await prisma.room.findUnique({ where: { slug: EVENT_ROOM_SLUG } });
  if (!room) {
    return NextResponse.json(
      { error: "イベントRoomが見つかりません。pnpm db:seed を実行してください" },
      { status: 500 },
    );
  }

  const created = await prisma.event.create({
    data: {
      roomId: room.id,
      ...result.value,
    },
  });

  return NextResponse.json(toEventDTO(created), { status: 201 });
}
