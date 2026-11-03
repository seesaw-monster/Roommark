import { normalizeUrl } from "./bookmarks";
import {
  EVENT_KINDS,
  EVENT_KIND_LABELS,
  type EventKind,
  type EventStatus,
  type TicketStatus,
} from "./event-constants";
import { prisma } from "./prisma";

export { EVENT_KINDS, EVENT_KIND_LABELS };
export type { EventKind, EventStatus, TicketStatus };

export type EventSchedule = {
  startDate: string;
  startTime: string | null;
  endDate: string;
  endTime: string | null;
};

export type EventTicketSchedule = {
  ticketStartDate: string | null;
  ticketStartTime: string | null;
  ticketEndDate: string | null;
  ticketEndTime: string | null;
};

export type EventInput = EventSchedule &
  EventTicketSchedule & {
    kind: EventKind;
    title: string;
    venue: string | null;
    imageUrl: string | null;
    eventUrl: string | null;
  };

export type EventRow = {
  id: string;
  roomId: string;
  kind: string;
  title: string;
  startDate: string;
  startTime: string | null;
  endDate: string;
  endTime: string | null;
  venue: string | null;
  imageUrl: string | null;
  eventUrl: string | null;
  ticketStartDate: string | null;
  ticketStartTime: string | null;
  ticketEndDate: string | null;
  ticketEndTime: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type EventDTO = EventInput & {
  id: string;
  roomId: string;
  status: EventStatus;
  ticketStatus: TicketStatus | null;
  createdAt: string;
  updatedAt: string;
};

export type EventValidationResult =
  | { ok: true; value: EventInput }
  | { ok: false; error: string };

export const EVENT_INPUT_KEYS = [
  "kind",
  "title",
  "startDate",
  "startTime",
  "endDate",
  "endTime",
  "venue",
  "imageUrl",
  "eventUrl",
  "ticketStartDate",
  "ticketStartTime",
  "ticketEndDate",
  "ticketEndTime",
] as const;

export function isEventKind(value: unknown): value is EventKind {
  return EVENT_KINDS.includes(value as EventKind);
}

export function isValidDateString(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

export function isValidTimeString(value: unknown): value is string {
  return typeof value === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

function asOptionalString(value: unknown): string | null | undefined {
  if (value === null || value === undefined) return null;
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

export function validateEventInput(input: unknown): EventValidationResult {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    return { ok: false, error: "入力内容が不正です" };
  }

  const body = input as Record<string, unknown>;

  if (!isEventKind(body.kind)) {
    return { ok: false, error: "種別が不正です" };
  }

  const title = typeof body.title === "string" ? body.title.trim() : "";
  if (!title) return { ok: false, error: "タイトルを入力してください" };

  const venue = asOptionalString(body.venue);
  if (venue === undefined) return { ok: false, error: "場所が不正です" };

  const startDate = body.startDate;
  if (!isValidDateString(startDate)) {
    return { ok: false, error: "開始日が不正です" };
  }

  const endDate = body.endDate;
  if (!isValidDateString(endDate)) {
    return { ok: false, error: "終了日が不正です" };
  }

  const startTime = asOptionalString(body.startTime);
  if (startTime === undefined || (startTime !== null && !isValidTimeString(startTime))) {
    return { ok: false, error: "開始時刻が不正です" };
  }

  const endTime = asOptionalString(body.endTime);
  if (endTime === undefined || (endTime !== null && !isValidTimeString(endTime))) {
    return { ok: false, error: "終了時刻が不正です" };
  }

  if ((startTime === null) !== (endTime === null)) {
    return { ok: false, error: "開始時刻と終了時刻は両方指定してください" };
  }

  if (endDate < startDate) {
    return { ok: false, error: "終了日は開始日以降にしてください" };
  }

  if (endDate === startDate && startTime !== null && endTime !== null && startTime > endTime) {
    return { ok: false, error: "開始時刻は終了時刻以前にしてください" };
  }

  const rawImageUrl = asOptionalString(body.imageUrl);
  if (rawImageUrl === undefined) {
    return { ok: false, error: "画像URLが不正です" };
  }

  let imageUrl: string | null = null;
  if (rawImageUrl !== null) {
    imageUrl = normalizeUrl(rawImageUrl);
    if (!imageUrl) return { ok: false, error: "画像URLが不正です" };
  }

  const rawEventUrl = asOptionalString(body.eventUrl);
  if (rawEventUrl === undefined) {
    return { ok: false, error: "イベントURLが不正です" };
  }

  let eventUrl: string | null = null;
  if (rawEventUrl !== null) {
    eventUrl = normalizeUrl(rawEventUrl);
    if (!eventUrl) return { ok: false, error: "イベントURLが不正です" };
  }

  const ticketStartDate = asOptionalString(body.ticketStartDate);
  const ticketEndDate = asOptionalString(body.ticketEndDate);
  if (ticketStartDate === undefined || ticketEndDate === undefined) {
    return { ok: false, error: "チケット期間が不正です" };
  }

  if ((ticketStartDate === null) !== (ticketEndDate === null)) {
    return { ok: false, error: "チケット期間は開始日と終了日を両方指定してください" };
  }

  if (ticketStartDate !== null && !isValidDateString(ticketStartDate)) {
    return { ok: false, error: "チケット開始日が不正です" };
  }

  if (ticketEndDate !== null && !isValidDateString(ticketEndDate)) {
    return { ok: false, error: "チケット終了日が不正です" };
  }

  const ticketStartTime = asOptionalString(body.ticketStartTime);
  const ticketEndTime = asOptionalString(body.ticketEndTime);
  if (
    ticketStartTime === undefined ||
    ticketEndTime === undefined ||
    (ticketStartTime !== null && !isValidTimeString(ticketStartTime)) ||
    (ticketEndTime !== null && !isValidTimeString(ticketEndTime))
  ) {
    return { ok: false, error: "チケット時刻が不正です" };
  }

  if (ticketStartDate === null) {
    if (ticketStartTime !== null || ticketEndTime !== null) {
      return { ok: false, error: "チケット時刻はチケット期間と一緒に指定してください" };
    }
  } else if (ticketEndDate !== null) {
    if ((ticketStartTime === null) !== (ticketEndTime === null)) {
      return { ok: false, error: "チケット開始時刻と終了時刻は両方指定してください" };
    }
    if (ticketEndDate < ticketStartDate) {
      return { ok: false, error: "チケット終了日は開始日以降にしてください" };
    }
    if (
      ticketEndDate === ticketStartDate &&
      ticketStartTime !== null &&
      ticketEndTime !== null &&
      ticketStartTime > ticketEndTime
    ) {
      return { ok: false, error: "チケット開始時刻は終了時刻以前にしてください" };
    }
  }

  return {
    ok: true,
    value: {
      kind: body.kind,
      title,
      startDate,
      startTime,
      endDate,
      endTime,
      venue,
      imageUrl,
      eventUrl,
      ticketStartDate,
      ticketStartTime,
      ticketEndDate,
      ticketEndTime,
    },
  };
}

function getJstParts(now: Date): { date: string; time: string } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";
  return {
    date: `${get("year")}-${get("month")}-${get("day")}`,
    time: `${get("hour")}:${get("minute")}`,
  };
}

function formatJstDate(now: Date): string {
  return getJstParts(now).date;
}

export function formatJstDateTime(now: Date): string {
  const { date, time } = getJstParts(now);
  return `${date}T${time}`;
}

function startDateTime(date: string, time: string | null): string {
  return `${date}T${time ?? "00:00"}`;
}

function endDateTime(date: string, time: string | null): string {
  return `${date}T${time ?? "23:59"}`;
}

export function getEventStatus(event: EventSchedule, now = new Date()): EventStatus {
  const current = formatJstDateTime(now);
  const start = startDateTime(event.startDate, event.startTime);
  const end = endDateTime(event.endDate, event.endTime);
  if (current < start) return "upcoming";
  if (current > end) return "past";
  return "ongoing";
}

export function getTicketStatus(
  event: EventTicketSchedule,
  now = new Date(),
): TicketStatus | null {
  if (event.ticketStartDate === null || event.ticketEndDate === null) return null;
  const current = formatJstDateTime(now);
  const start = startDateTime(event.ticketStartDate, event.ticketStartTime);
  const end = endDateTime(event.ticketEndDate, event.ticketEndTime);
  if (current < start) return "before";
  if (current > end) return "ended";
  return "onSale";
}

export function toEventDTO(event: EventRow, now = new Date()): EventDTO {
  return {
    id: event.id,
    roomId: event.roomId,
    kind: isEventKind(event.kind) ? event.kind : "other",
    title: event.title,
    startDate: event.startDate,
    startTime: event.startTime,
    endDate: event.endDate,
    endTime: event.endTime,
    venue: event.venue,
    imageUrl: event.imageUrl,
    eventUrl: event.eventUrl,
    ticketStartDate: event.ticketStartDate,
    ticketStartTime: event.ticketStartTime,
    ticketEndDate: event.ticketEndDate,
    ticketEndTime: event.ticketEndTime,
    status: getEventStatus(event, now),
    ticketStatus: getTicketStatus(event, now),
    createdAt: event.createdAt.toISOString(),
    updatedAt: event.updatedAt.toISOString(),
  };
}

function addDays(date: string, days: number): string {
  const [year, month, day] = date.split("-").map(Number);
  const next = new Date(Date.UTC(year, month - 1, day + days));
  return `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, "0")}-${String(
    next.getUTCDate(),
  ).padStart(2, "0")}`;
}

function compareStartAsc(a: EventSchedule, b: EventSchedule): number {
  return startDateTime(a.startDate, a.startTime).localeCompare(
    startDateTime(b.startDate, b.startTime),
  );
}

function compareStartDesc(a: EventSchedule, b: EventSchedule): number {
  return compareStartAsc(b, a);
}

export async function getEventsForTop(now = new Date()): Promise<EventDTO[]> {
  const rows = await prisma.event.findMany();
  const threshold = addDays(formatJstDate(now), 30);
  return rows
    .map((row) => toEventDTO(row, now))
    .filter(
      (event) =>
        event.status === "ongoing" ||
        (event.status === "upcoming" && event.startDate <= threshold),
    )
    .sort(compareStartAsc);
}

export async function getAllEvents(now = new Date()): Promise<EventDTO[]> {
  const rows = await prisma.event.findMany();
  const events = rows.map((row) => toEventDTO(row, now));
  const active = events.filter((event) => event.status !== "past").sort(compareStartAsc);
  const past = events.filter((event) => event.status === "past").sort(compareStartDesc);
  return [...active, ...past];
}
