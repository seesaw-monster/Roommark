import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  EVENT_INPUT_KEYS,
  toEventDTO,
  validateEventInput,
} from "@/lib/events";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { id } = await params;
  const event = await prisma.event.findUnique({ where: { id } });
  if (!event) return NextResponse.json({ error: "イベントが見つかりません" }, { status: 404 });
  return NextResponse.json(toEventDTO(event));
}

export async function PATCH(req: Request, { params }: Params) {
  const { id } = await params;
  const existing = await prisma.event.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "イベントが見つかりません" }, { status: 404 });
  }

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

  const result = validateEventInput({
    kind: existing.kind,
    title: existing.title,
    startDate: existing.startDate,
    startTime: existing.startTime,
    endDate: existing.endDate,
    endTime: existing.endTime,
    venue: existing.venue,
    imageUrl: existing.imageUrl,
    eventUrl: existing.eventUrl,
    ticketStartDate: existing.ticketStartDate,
    ticketStartTime: existing.ticketStartTime,
    ticketEndDate: existing.ticketEndDate,
    ticketEndTime: existing.ticketEndTime,
    ...body,
  });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  const data: Prisma.EventUpdateInput = {};
  for (const key of EVENT_INPUT_KEYS) {
    if (key in body) {
      (data as Record<string, unknown>)[key] = result.value[key];
    }
  }

  const updated = await prisma.event.update({ where: { id }, data });
  return NextResponse.json(toEventDTO(updated));
}

export async function DELETE(_req: Request, { params }: Params) {
  const { id } = await params;
  const existing = await prisma.event.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "イベントが見つかりません" }, { status: 404 });
  }
  await prisma.event.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
