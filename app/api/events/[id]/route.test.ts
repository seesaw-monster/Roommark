import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DELETE, GET, PATCH } from "./route";

const prismaMock = vi.hoisted(() => ({
  event: {
    findUnique: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

const baseDate = new Date("2026-11-03T00:00:00.000Z");
const now = new Date("2026-11-03T12:00:00+09:00");
const params = Promise.resolve({ id: "e1" });

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

function patchRequest(body: unknown) {
  return new Request("http://localhost/api/events/e1", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(now);
  prismaMock.event.findUnique.mockResolvedValue(eventRow());
  prismaMock.event.update.mockImplementation(
    async ({ data }: { data: Record<string, unknown> }) => eventRow(data),
  );
  prismaMock.event.delete.mockResolvedValue(eventRow());
});

afterEach(() => {
  vi.useRealTimers();
});

describe("GET /api/events/[id]", () => {
  it("returns an existing event as a DTO", async () => {
    const res = await GET(new Request("http://localhost/api/events/e1"), { params });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toMatchObject({
      id: "e1",
      title: "イベント",
      status: "ongoing",
      ticketStatus: null,
    });
  });

  it("returns 404 for a missing event", async () => {
    prismaMock.event.findUnique.mockResolvedValue(null);

    const res = await GET(new Request("http://localhost/api/events/missing"), {
      params,
    });

    expect(res.status).toBe(404);
  });
});

describe("PATCH /api/events/[id]", () => {
  it("updates only the specified fields", async () => {
    const res = await PATCH(patchRequest({ title: "  新しいイベント  " }), {
      params,
    });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(prismaMock.event.update.mock.calls[0][0].data).toMatchObject({
      title: "新しいイベント",
    });
    expect(json.title).toBe("新しいイベント");
  });

  it("clears optional fields with null", async () => {
    const res = await PATCH(
      patchRequest({
        imageUrl: null,
        eventUrl: null,
        ticketStartDate: null,
        ticketStartTime: null,
        ticketEndDate: null,
        ticketEndTime: null,
      }),
      { params },
    );

    expect(res.status).toBe(200);
    expect(prismaMock.event.update.mock.calls[0][0].data).toMatchObject({
      imageUrl: null,
      eventUrl: null,
      ticketStartDate: null,
      ticketStartTime: null,
      ticketEndDate: null,
      ticketEndTime: null,
    });
  });

  it("returns 400 and does not update when the end date is before the start date", async () => {
    prismaMock.event.findUnique.mockResolvedValue(
      eventRow({ startDate: "2026-11-10", endDate: "2026-11-10" }),
    );

    const res = await PATCH(patchRequest({ endDate: "2026-11-09" }), { params });

    expect(res.status).toBe(400);
    expect(prismaMock.event.update).not.toHaveBeenCalled();
  });

  it("returns 400 and does not update when only one ticket date is provided", async () => {
    const res = await PATCH(
      patchRequest({ ticketStartDate: "2026-11-01" }),
      { params },
    );

    expect(res.status).toBe(400);
    expect(prismaMock.event.update).not.toHaveBeenCalled();
  });

  it("returns 404 for a missing event", async () => {
    prismaMock.event.findUnique.mockResolvedValue(null);

    const res = await PATCH(patchRequest({ title: "新しいイベント" }), {
      params,
    });

    expect(res.status).toBe(404);
    expect(prismaMock.event.update).not.toHaveBeenCalled();
  });
});

describe("DELETE /api/events/[id]", () => {
  it("deletes an existing event", async () => {
    const res = await DELETE(new Request("http://localhost/api/events/e1"), {
      params,
    });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(prismaMock.event.delete).toHaveBeenCalledWith({ where: { id: "e1" } });
    expect(json).toEqual({ ok: true });
  });

  it("returns 404 for a missing event", async () => {
    prismaMock.event.findUnique.mockResolvedValue(null);

    const res = await DELETE(
      new Request("http://localhost/api/events/missing"),
      { params },
    );

    expect(res.status).toBe(404);
    expect(prismaMock.event.delete).not.toHaveBeenCalled();
  });
});
