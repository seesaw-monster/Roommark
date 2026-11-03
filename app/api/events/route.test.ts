import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "./route";

const prismaMock = vi.hoisted(() => ({
  room: {
    findUnique: vi.fn(),
  },
  event: {
    findMany: vi.fn(),
    create: vi.fn(),
  },
}));

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

const baseDate = new Date("2026-11-03T00:00:00.000Z");
const now = new Date("2026-11-03T12:00:00+09:00");
const eventRoom = {
  id: "event-room",
  name: "イベント",
  slug: "event",
  icon: "🎪",
  sortOrder: 3,
};

function eventRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "e1",
    roomId: "event-room",
    kind: "live",
    title: "イベント",
    startDate: "2026-11-03",
    startTime: null,
    endDate: "2026-11-03",
    endTime: null,
    venue: "会場",
    imageUrl: null,
    eventUrl: null,
    ticketStartDate: null,
    ticketStartTime: null,
    ticketEndDate: null,
    ticketEndTime: null,
    createdAt: baseDate,
    updatedAt: baseDate,
    ...overrides,
  };
}

const validBody = {
  kind: "live",
  title: "  ライブ  ",
  startDate: "2026-11-10",
  endDate: "2026-11-10",
  venue: "  東京  ",
  imageUrl: "https://example.com/poster.png",
  eventUrl: "  https://example.com/event  ",
};

function postRequest(body: unknown) {
  return new Request("http://localhost/api/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(now);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("GET /api/events", () => {
  beforeEach(() => {
    prismaMock.event.findMany.mockResolvedValue([
      eventRow({ id: "past", startDate: "2026-11-02", endDate: "2026-11-02" }),
      eventRow({ id: "ongoing", startDate: "2026-11-01", endDate: "2026-11-04" }),
      eventRow({ id: "day30", startDate: "2026-12-03", endDate: "2026-12-03" }),
      eventRow({ id: "day31", startDate: "2026-12-04", endDate: "2026-12-04" }),
      eventRow({ id: "soon", startDate: "2026-11-05", endDate: "2026-11-05" }),
    ]);
  });

  it("returns only ongoing and upcoming-within-30-days events for scope=top", async () => {
    const res = await GET(new Request("http://localhost/api/events?scope=top"));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.events.map((event: { id: string }) => event.id)).toEqual([
      "ongoing",
      "soon",
      "day30",
    ]);
  });

  it("defaults to top when scope is omitted", async () => {
    const res = await GET(new Request("http://localhost/api/events"));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.events.map((event: { id: string }) => event.id)).toEqual([
      "ongoing",
      "soon",
      "day30",
    ]);
  });

  it("returns all events for scope=all", async () => {
    const res = await GET(new Request("http://localhost/api/events?scope=all"));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.events.map((event: { id: string }) => event.id)).toEqual([
      "ongoing",
      "soon",
      "day30",
      "day31",
      "past",
    ]);
  });

  it("returns 400 for an invalid scope", async () => {
    const res = await GET(new Request("http://localhost/api/events?scope=invalid"));

    expect(res.status).toBe(400);
    expect(prismaMock.event.findMany).not.toHaveBeenCalled();
  });
});

describe("POST /api/events", () => {
  beforeEach(() => {
    prismaMock.room.findUnique.mockResolvedValue(eventRoom);
    prismaMock.event.create.mockImplementation(
      async ({ data }: { data: Record<string, unknown> }) => eventRow(data),
    );
  });

  it("creates an event and links it to the event room", async () => {
    const res = await POST(postRequest({ ...validBody, roomId: "other-room" }));
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(prismaMock.room.findUnique).toHaveBeenCalledWith({
      where: { slug: "event" },
    });
    expect(prismaMock.event.create.mock.calls[0][0].data).toMatchObject({
      roomId: "event-room",
      kind: "live",
      title: "ライブ",
      startDate: "2026-11-10",
      startTime: null,
      endDate: "2026-11-10",
      endTime: null,
      venue: "東京",
      imageUrl: "https://example.com/poster.png",
      eventUrl: "https://example.com/event",
      ticketStartDate: null,
      ticketStartTime: null,
      ticketEndDate: null,
      ticketEndTime: null,
    });
    expect(json).toMatchObject({
      roomId: "event-room",
      title: "ライブ",
      status: "upcoming",
      ticketStatus: null,
    });
  });

  it("returns 400 without creating when the title is missing", async () => {
    const res = await POST(postRequest({ ...validBody, title: "  " }));

    expect(res.status).toBe(400);
    expect(prismaMock.event.create).not.toHaveBeenCalled();
  });

  it("returns 400 without creating when the start date is invalid", async () => {
    const res = await POST(postRequest({ ...validBody, startDate: "2026-02-30" }));

    expect(res.status).toBe(400);
    expect(prismaMock.event.create).not.toHaveBeenCalled();
  });

  it("returns 400 without creating when the image URL is invalid", async () => {
    const res = await POST(
      postRequest({ ...validBody, imageUrl: "javascript:alert(1)" }),
    );

    expect(res.status).toBe(400);
    expect(prismaMock.event.create).not.toHaveBeenCalled();
  });

  it("returns 400 without creating when the event URL is invalid", async () => {
    const res = await POST(
      postRequest({ ...validBody, eventUrl: "javascript:alert(1)" }),
    );

    expect(res.status).toBe(400);
    expect(prismaMock.event.create).not.toHaveBeenCalled();
  });

  it("returns 500 without creating when the event room is missing", async () => {
    prismaMock.room.findUnique.mockResolvedValue(null);

    const res = await POST(postRequest(validBody));

    expect(res.status).toBe(500);
    expect(prismaMock.event.create).not.toHaveBeenCalled();
  });
});
