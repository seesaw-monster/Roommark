import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "./route";

const prismaMock = vi.hoisted(() => ({
  room: {
    findUnique: vi.fn(),
  },
  person: {
    findMany: vi.fn(),
    create: vi.fn(),
  },
}));

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

const baseDate = new Date("2026-11-04T00:00:00.000Z");
const personRoom = {
  id: "person-room",
  name: "人物",
  slug: "person",
  icon: "👤",
  sortOrder: 4,
};

function personRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "p1",
    roomId: "person-room",
    name: "夏目漱石",
    subGenresJson: "[]",
    memo: null,
    url: null,
    createdAt: baseDate,
    updatedAt: baseDate,
    ...overrides,
  };
}

const horrorRow = personRow({
  id: "p1",
  name: "ホラー作家",
  subGenresJson: '["ホラー"]',
  createdAt: new Date("2026-11-01T00:00:00.000Z"),
});
const horrorMysteryRow = personRow({
  id: "p2",
  name: "ミステリー作家",
  subGenresJson: '["ホラー","ミステリー"]',
  createdAt: new Date("2026-11-02T00:00:00.000Z"),
});
const noGenreRow = personRow({
  id: "p3",
  name: "映画監督",
  createdAt: new Date("2026-11-03T00:00:00.000Z"),
});

function postRequest(body: unknown) {
  return new Request("http://localhost/api/people", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("GET /api/people", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.room.findUnique.mockResolvedValue(personRoom);
    prismaMock.person.findMany.mockResolvedValue([horrorRow, horrorMysteryRow, noGenreRow]);
  });

  it("returns the person list and subgenre counts", async () => {
    const res = await GET(new Request("http://localhost/api/people"));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.people.map((person: { id: string }) => person.id)).toEqual(["p1", "p2", "p3"]);
    expect(json.people[0]).toMatchObject({
      name: "ホラー作家",
      subGenres: ["ホラー"],
    });
    expect(json.subGenres).toEqual([
      { name: "ホラー", count: 2 },
      { name: "ミステリー", count: 1 },
    ]);
  });

  it("filters by subgenre", async () => {
    const res = await GET(
      new Request("http://localhost/api/people?subGenre=%E3%83%9B%E3%83%A9%E3%83%BC"),
    );
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.people.map((person: { id: string }) => person.id)).toEqual(["p1", "p2"]);
  });

  it("sorts by name", async () => {
    const res = await GET(new Request("http://localhost/api/people?sort=name"));

    expect(res.status).toBe(200);
    expect(prismaMock.person.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { name: "asc" } }),
    );
  });

  it("sorts by updated date", async () => {
    const res = await GET(new Request("http://localhost/api/people?sort=updated"));

    expect(res.status).toBe(200);
    expect(prismaMock.person.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { updatedAt: "desc" } }),
    );
  });

  it("sorts by newest when no sort is specified", async () => {
    const res = await GET(new Request("http://localhost/api/people"));

    expect(res.status).toBe(200);
    expect(prismaMock.person.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { createdAt: "desc" } }),
    );
  });

  it("searches names and memos by keyword", async () => {
    const res = await GET(
      new Request("http://localhost/api/people?q=%E5%A4%8F%E7%9B%AE"),
    );

    expect(res.status).toBe(200);
    expect(prismaMock.person.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          OR: [
            { name: { contains: "夏目" } },
            { memo: { contains: "夏目" } },
          ],
        },
      }),
    );
  });
});

describe("POST /api/people", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.room.findUnique.mockResolvedValue(personRoom);
    prismaMock.person.create.mockImplementation(
      async ({ data }: { data: Record<string, unknown> }) => personRow(data),
    );
  });

  it("creates a person with only a name", async () => {
    const res = await POST(postRequest({ name: "  夏目漱石  " }));
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(prismaMock.person.create.mock.calls[0][0].data).toEqual({
      roomId: "person-room",
      name: "夏目漱石",
      subGenresJson: "[]",
      memo: null,
      url: null,
    });
    expect(json).toMatchObject({
      name: "夏目漱石",
      subGenres: [],
      memo: null,
      url: null,
    });
  });

  it("saves subgenres, memo, and URL", async () => {
    const res = await POST(
      postRequest({
        name: "夏目漱石",
        subGenres: ["純文学", "ミステリー"],
        memo: "  好きな作家  ",
        url: "  example.com/authors/natsume  ",
      }),
    );
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(prismaMock.person.create.mock.calls[0][0].data).toEqual({
      roomId: "person-room",
      name: "夏目漱石",
      subGenresJson: '["純文学","ミステリー"]',
      memo: "好きな作家",
      url: "https://example.com/authors/natsume",
    });
    expect(json).toMatchObject({
      subGenres: ["純文学", "ミステリー"],
      memo: "好きな作家",
      url: "https://example.com/authors/natsume",
    });
  });

  it("accepts subgenres as a comma-separated string", async () => {
    const res = await POST(
      postRequest({ name: "夏目漱石", subGenres: "純文学, ミステリー" }),
    );

    expect(res.status).toBe(201);
    expect(prismaMock.person.create.mock.calls[0][0].data.subGenresJson).toBe(
      '["純文学","ミステリー"]',
    );
  });

  it("returns 400 and does not create when the name is empty", async () => {
    const res = await POST(postRequest({ name: "   " }));

    expect(res.status).toBe(400);
    expect(prismaMock.person.create).not.toHaveBeenCalled();
  });

  it("returns 400 and does not create when the name is 101 characters", async () => {
    const res = await POST(postRequest({ name: "あ".repeat(101) }));

    expect(res.status).toBe(400);
    expect(prismaMock.person.create).not.toHaveBeenCalled();
  });

  it("returns 400 and does not create when the memo is 2001 characters", async () => {
    const res = await POST(
      postRequest({ name: "夏目漱石", memo: "あ".repeat(2001) }),
    );

    expect(res.status).toBe(400);
    expect(prismaMock.person.create).not.toHaveBeenCalled();
  });

  it("returns 400 and does not create for an invalid URL", async () => {
    const res = await POST(
      postRequest({ name: "夏目漱石", url: "javascript:alert(1)" }),
    );

    expect(res.status).toBe(400);
    expect(prismaMock.person.create).not.toHaveBeenCalled();
  });

  it("returns 500 and does not create when the person room is missing", async () => {
    prismaMock.room.findUnique.mockResolvedValue(null);

    const res = await POST(postRequest({ name: "夏目漱石" }));
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.error).toContain("db:setup");
    expect(prismaMock.person.create).not.toHaveBeenCalled();
  });

  it("returns 400 for a non-JSON request", async () => {
    const res = await POST(
      new Request("http://localhost/api/people", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "not-json",
      }),
    );

    expect(res.status).toBe(400);
    expect(prismaMock.person.create).not.toHaveBeenCalled();
  });
});
