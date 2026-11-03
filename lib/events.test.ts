import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  EVENT_KIND_LABELS,
  EVENT_KINDS,
  getAllEvents,
  getEventStatus,
  getEventsForTop,
  getTicketStatus,
  isEventKind,
  isValidDateString,
  isValidTimeString,
  toEventDTO,
  validateEventInput,
} from "./events";

const prismaMock = vi.hoisted(() => ({
  event: {
    findMany: vi.fn(),
  },
}));

vi.mock("./prisma", () => ({ prisma: prismaMock }));

const baseDate = new Date("2026-11-03T00:00:00.000Z");
const now = new Date("2026-11-03T12:00:00+09:00");

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

const validInput = {
  kind: "live",
  title: "  ライブ  ",
  startDate: "2026-11-03",
  endDate: "2026-11-03",
  venue: "  東京  ",
  imageUrl: "https://example.com/poster.png",
  eventUrl: "  https://example.com/event  ",
};

describe("EVENT_KINDS / EVENT_KIND_LABELS", () => {
  it("has the three kinds: live, exhibition, and other", () => {
    expect(EVENT_KINDS).toEqual(["live", "exhibition", "other"]);
    expect(EVENT_KIND_LABELS).toEqual({
      live: "ライブ",
      exhibition: "展示",
      other: "その他",
    });
  });
});

describe("isEventKind", () => {
  it("allows only live, exhibition, and other", () => {
    expect(isEventKind("live")).toBe(true);
    expect(isEventKind("exhibition")).toBe(true);
    expect(isEventKind("other")).toBe(true);
    expect(isEventKind("movie")).toBe(false);
    expect(isEventKind(null)).toBe(false);
    expect(isEventKind(1)).toBe(false);
  });
});

describe("isValidDateString", () => {
  it("allows only real dates in YYYY-MM-DD format", () => {
    expect(isValidDateString("2026-11-03")).toBe(true);
    expect(isValidDateString("2024-02-29")).toBe(true);
    expect(isValidDateString("2026-02-29")).toBe(false);
    expect(isValidDateString("2026-13-01")).toBe(false);
    expect(isValidDateString("2026-11-3")).toBe(false);
    expect(isValidDateString("")).toBe(false);
    expect(isValidDateString(null)).toBe(false);
  });
});

describe("isValidTimeString", () => {
  it("allows only times in HH:mm format", () => {
    expect(isValidTimeString("00:00")).toBe(true);
    expect(isValidTimeString("23:59")).toBe(true);
    expect(isValidTimeString("24:00")).toBe(false);
    expect(isValidTimeString("9:00")).toBe(false);
    expect(isValidTimeString("12:60")).toBe(false);
    expect(isValidTimeString("")).toBe(false);
    expect(isValidTimeString(null)).toBe(false);
  });
});

describe("validateEventInput", () => {
  it("accepts and normalizes input", () => {
    const result = validateEventInput(validInput);

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error(result.error);
    expect(result.value).toMatchObject({
      kind: "live",
      title: "ライブ",
      startDate: "2026-11-03",
      startTime: null,
      endDate: "2026-11-03",
      endTime: null,
      venue: "東京",
      imageUrl: "https://example.com/poster.png",
      eventUrl: "https://example.com/event",
      ticketStartDate: null,
      ticketStartTime: null,
      ticketEndDate: null,
      ticketEndTime: null,
    });
  });

  it("accepts null optional fields", () => {
    const result = validateEventInput({
      ...validInput,
      startTime: null,
      endTime: null,
      venue: null,
      imageUrl: null,
      eventUrl: null,
      ticketStartDate: null,
      ticketStartTime: null,
      ticketEndDate: null,
      ticketEndTime: null,
    });

    expect(result.ok).toBe(true);
  });

  it("treats an empty image URL as null", () => {
    const result = validateEventInput({ ...validInput, imageUrl: "  " });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error(result.error);
    expect(result.value.imageUrl).toBeNull();
  });

  const invalidCases: [string, Record<string, unknown>][] = [
    ["an invalid kind", { ...validInput, kind: "movie" }],
    ["an empty title", { ...validInput, title: "  " }],
    ["an invalid start date", { ...validInput, startDate: "2026-02-30" }],
    ["an end date before the start date", { ...validInput, endDate: "2026-11-02" }],
    ["only a start time", { ...validInput, startTime: "18:00" }],
    ["only an end time", { ...validInput, endTime: "20:00" }],
    [
      "a start time after the end time on the same day",
      { ...validInput, startTime: "20:00", endTime: "18:00" },
    ],
    ["only a ticket start date", { ...validInput, ticketStartDate: "2026-11-01" }],
    [
      "a ticket end date before the start date",
      {
        ...validInput,
        ticketStartDate: "2026-11-05",
        ticketEndDate: "2026-11-04",
      },
    ],
    [
      "only a ticket start time",
      {
        ...validInput,
        ticketStartDate: "2026-11-01",
        ticketEndDate: "2026-11-02",
        ticketStartTime: "10:00",
      },
    ],
    ["an invalid image URL", { ...validInput, imageUrl: "javascript:alert(1)" }],
    ["an invalid event URL", { ...validInput, eventUrl: "javascript:alert(1)" }],
  ];

  it.each(invalidCases)("rejects %s", (_label, input) => {
    expect(validateEventInput(input).ok).toBe(false);
  });
});

describe("getEventStatus", () => {
  it("returns ongoing for a date-only event on the same day", () => {
    expect(getEventStatus(eventRow(), now)).toBe("ongoing");
  });

  it("returns upcoming before the start time", () => {
    expect(
      getEventStatus(eventRow({ startTime: "18:00", endTime: "20:00" }), now),
    ).toBe("upcoming");
  });

  it("returns ongoing exactly at the start time", () => {
    expect(
      getEventStatus(eventRow({ startTime: "12:00", endTime: "20:00" }), now),
    ).toBe("ongoing");
  });

  it("returns ongoing exactly at the end time", () => {
    expect(
      getEventStatus(eventRow({ startTime: "10:00", endTime: "12:00" }), now),
    ).toBe("ongoing");
  });

  it("returns past after the end time", () => {
    expect(
      getEventStatus(eventRow({ startTime: "10:00", endTime: "11:59" }), now),
    ).toBe("past");
  });

  it("returns past for an event that ended the previous day", () => {
    expect(
      getEventStatus(
        eventRow({ startDate: "2026-11-02", endDate: "2026-11-02" }),
        now,
      ),
    ).toBe("past");
  });

  it("returns ongoing during a multi-day event", () => {
    expect(
      getEventStatus(
        eventRow({ startDate: "2026-11-01", endDate: "2026-11-04" }),
        now,
      ),
    ).toBe("ongoing");
  });
});

describe("getTicketStatus", () => {
  it("returns null when there is no ticket period", () => {
    expect(getTicketStatus(eventRow(), now)).toBeNull();
  });

  it("returns before before the sale starts", () => {
    expect(
      getTicketStatus(
        eventRow({
          ticketStartDate: "2026-11-04",
          ticketEndDate: "2026-11-05",
        }),
        now,
      ),
    ).toBe("before");
  });

  it("returns onSale during the sale period", () => {
    expect(
      getTicketStatus(
        eventRow({
          ticketStartDate: "2026-11-01",
          ticketEndDate: "2026-11-05",
        }),
        now,
      ),
    ).toBe("onSale");
  });

  it("returns onSale exactly at the sale start time", () => {
    expect(
      getTicketStatus(
        eventRow({
          ticketStartDate: "2026-11-03",
          ticketStartTime: "12:00",
          ticketEndDate: "2026-11-03",
          ticketEndTime: "18:00",
        }),
        now,
      ),
    ).toBe("onSale");
  });

  it("returns onSale exactly at the sale end time", () => {
    expect(
      getTicketStatus(
        eventRow({
          ticketStartDate: "2026-11-03",
          ticketStartTime: "10:00",
          ticketEndDate: "2026-11-03",
          ticketEndTime: "12:00",
        }),
        now,
      ),
    ).toBe("onSale");
  });

  it("returns ended after the sale ends", () => {
    expect(
      getTicketStatus(
        eventRow({
          ticketStartDate: "2026-11-01",
          ticketEndDate: "2026-11-02",
        }),
        now,
      ),
    ).toBe("ended");
  });

  it("returns onSale on a date-only sale end date", () => {
    expect(
      getTicketStatus(
        eventRow({
          ticketStartDate: "2026-11-03",
          ticketEndDate: "2026-11-03",
        }),
        now,
      ),
    ).toBe("onSale");
  });
});

describe("toEventDTO", () => {
  it("converts to a DTO including status and ticket status", () => {
    const dto = toEventDTO(eventRow(), now);

    expect(dto).toMatchObject({
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
      status: "ongoing",
      ticketStatus: null,
      createdAt: baseDate.toISOString(),
      updatedAt: baseDate.toISOString(),
    });
  });
});

describe("getEventsForTop", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns only ongoing events and events starting within 30 days in start order", async () => {
    prismaMock.event.findMany.mockResolvedValue([
      eventRow({ id: "past", startDate: "2026-11-02", endDate: "2026-11-02" }),
      eventRow({ id: "ongoing", startDate: "2026-11-01", endDate: "2026-11-04" }),
      eventRow({ id: "day30", startDate: "2026-12-03", endDate: "2026-12-03" }),
      eventRow({ id: "day31", startDate: "2026-12-04", endDate: "2026-12-04" }),
      eventRow({ id: "soon", startDate: "2026-11-05", endDate: "2026-11-05" }),
    ]);

    const events = await getEventsForTop(now);

    expect(events.map((event) => event.id)).toEqual(["ongoing", "soon", "day30"]);
  });
});

describe("getAllEvents", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(now);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns ongoing/future events ascending and past events descending", async () => {
    prismaMock.event.findMany.mockResolvedValue([
      eventRow({ id: "past1", startDate: "2026-10-01", endDate: "2026-10-01" }),
      eventRow({ id: "past2", startDate: "2026-10-02", endDate: "2026-10-02" }),
      eventRow({ id: "ongoing", startDate: "2026-11-01", endDate: "2026-11-04" }),
      eventRow({ id: "soon", startDate: "2026-11-05", endDate: "2026-11-05" }),
      eventRow({ id: "day30", startDate: "2026-12-03", endDate: "2026-12-03" }),
    ]);

    const events = await getAllEvents();

    expect(events.map((event) => event.id)).toEqual([
      "ongoing",
      "soon",
      "day30",
      "past2",
      "past1",
    ]);
  });
});
