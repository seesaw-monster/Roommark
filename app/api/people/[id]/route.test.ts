import { beforeEach, describe, expect, it, vi } from "vitest";
import { DELETE, GET, PATCH } from "./route";

const prismaMock = vi.hoisted(() => ({
  person: {
    findUnique: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

const baseDate = new Date("2026-11-04T00:00:00.000Z");
const params = Promise.resolve({ id: "p1" });

function personRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "p1",
    roomId: "person-room",
    name: "夏目漱石",
    subGenresJson: '["純文学"]',
    memo: "好きな作家",
    url: "https://example.com/authors/natsume",
    createdAt: baseDate,
    updatedAt: baseDate,
    ...overrides,
  };
}

function patchRequest(body: unknown) {
  return new Request("http://localhost/api/people/p1", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("GET /api/people/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.person.findUnique.mockResolvedValue(personRow());
  });

  it("returns an existing person as a DTO", async () => {
    const res = await GET(new Request("http://localhost/api/people/p1"), { params });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toMatchObject({
      id: "p1",
      name: "夏目漱石",
      subGenres: ["純文学"],
      memo: "好きな作家",
      url: "https://example.com/authors/natsume",
    });
  });

  it("returns 404 for a missing person", async () => {
    prismaMock.person.findUnique.mockResolvedValue(null);

    const res = await GET(new Request("http://localhost/api/people/missing"), { params });

    expect(res.status).toBe(404);
  });
});

describe("PATCH /api/people/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.person.findUnique.mockResolvedValue(personRow());
    prismaMock.person.update.mockImplementation(
      async ({ data }: { data: Record<string, unknown> }) => personRow(data),
    );
  });

  it("updates only the name", async () => {
    const res = await PATCH(patchRequest({ name: "  新しい名前  " }), { params });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(prismaMock.person.update.mock.calls[0][0].data).toMatchObject({
      name: "新しい名前",
    });
    expect(json.name).toBe("新しい名前");
  });

  it("updates subgenres", async () => {
    const res = await PATCH(
      patchRequest({ subGenres: ["ミステリー", "純文学"] }),
      { params },
    );

    expect(res.status).toBe(200);
    expect(prismaMock.person.update.mock.calls[0][0].data).toMatchObject({
      subGenresJson: '["ミステリー","純文学"]',
    });
  });

  it("clears optional fields with null or an empty array", async () => {
    const res = await PATCH(
      patchRequest({ memo: null, url: null, subGenres: [] }),
      { params },
    );

    expect(res.status).toBe(200);
    expect(prismaMock.person.update.mock.calls[0][0].data).toMatchObject({
      memo: null,
      url: null,
      subGenresJson: "[]",
    });
  });

  it("clears the URL with an empty string", async () => {
    const res = await PATCH(patchRequest({ url: "  " }), { params });

    expect(res.status).toBe(200);
    expect(prismaMock.person.update.mock.calls[0][0].data).toMatchObject({
      url: null,
    });
  });

  it("returns 400 and does not update when the name is empty", async () => {
    const res = await PATCH(patchRequest({ name: "   " }), { params });

    expect(res.status).toBe(400);
    expect(prismaMock.person.update).not.toHaveBeenCalled();
  });

  it("returns 400 and does not update for an invalid URL", async () => {
    const res = await PATCH(
      patchRequest({ url: "javascript:alert(1)" }),
      { params },
    );

    expect(res.status).toBe(400);
    expect(prismaMock.person.update).not.toHaveBeenCalled();
  });

  it("returns 404 and does not update for a missing person", async () => {
    prismaMock.person.findUnique.mockResolvedValue(null);

    const res = await PATCH(patchRequest({ name: "新しい名前" }), { params });

    expect(res.status).toBe(404);
    expect(prismaMock.person.update).not.toHaveBeenCalled();
  });
});

describe("DELETE /api/people/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.person.findUnique.mockResolvedValue(personRow());
    prismaMock.person.delete.mockResolvedValue(personRow());
  });

  it("deletes an existing person", async () => {
    const res = await DELETE(new Request("http://localhost/api/people/p1"), { params });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toEqual({ ok: true });
    expect(prismaMock.person.delete).toHaveBeenCalledWith({ where: { id: "p1" } });
  });

  it("returns 404 and does not delete a missing person", async () => {
    prismaMock.person.findUnique.mockResolvedValue(null);

    const res = await DELETE(new Request("http://localhost/api/people/missing"), { params });

    expect(res.status).toBe(404);
    expect(prismaMock.person.delete).not.toHaveBeenCalled();
  });
});
