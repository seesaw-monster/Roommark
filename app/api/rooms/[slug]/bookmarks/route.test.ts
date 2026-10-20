import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "./route";

const prismaMock = vi.hoisted(() => ({
  room: { findUnique: vi.fn() },
  bookmark: {
    findMany: vi.fn(),
    create: vi.fn(),
  },
}));

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/lib/ogp", () => ({ fetchOgp: vi.fn() }));

const baseDate = new Date("2024-01-01T00:00:00.000Z");
const category = {
  id: "c1",
  roomId: "r1",
  name: "技術記事",
  slug: "tech-article",
  sortOrder: 0,
};
const room = {
  id: "r1",
  name: "エンジニア",
  slug: "engineer",
  icon: "💻",
  sortOrder: 0,
  categories: [category],
};

function bookmarkRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "b1",
    roomId: "r1",
    categoryId: "c1",
    url: "https://example.com/",
    title: "title",
    description: null,
    ogImage: null,
    memo: null,
    tagsJson: "[]",
    metadata: null,
    favorite: false,
    createdAt: baseDate,
    updatedAt: baseDate,
    category: { name: category.name, slug: category.slug },
    ...overrides,
  };
}

const unreadRow = bookmarkRow({ id: "b1", tagsJson: '["react"]' });
const readRow = bookmarkRow({
  id: "b2",
  tagsJson: '["react"]',
  metadata: JSON.stringify({ readStatus: "read", reread: false }),
});
const rereadRow = bookmarkRow({
  id: "b3",
  tagsJson: '["next"]',
  metadata: JSON.stringify({ readStatus: "read", reread: true }),
});

const params = Promise.resolve({ slug: "engineer" });

describe("GET /api/rooms/[slug]/bookmarks read state filter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.room.findUnique.mockResolvedValue(room);
    prismaMock.bookmark.findMany.mockResolvedValue([unreadRow, readRow, rereadRow]);
  });

  it("filters by unread", async () => {
    const req = new Request("http://localhost/api/rooms/engineer/bookmarks?readStatus=unread");
    const res = await GET(req, { params });
    const json = await res.json();

    expect(json.bookmarks.map((b: { id: string }) => b.id)).toEqual(["b1"]);
    expect(json.bookmarks[0].readStatus).toBe("unread");
    expect(json.bookmarks[0].reread).toBe(false);
  });

  it("filters by read", async () => {
    const req = new Request("http://localhost/api/rooms/engineer/bookmarks?readStatus=read");
    const res = await GET(req, { params });
    const json = await res.json();

    expect(json.bookmarks.map((b: { id: string }) => b.id)).toEqual(["b2", "b3"]);
    expect(json.bookmarks[1].readStatus).toBe("read");
    expect(json.bookmarks[1].reread).toBe(true);
  });

  it("filters by reread", async () => {
    const req = new Request("http://localhost/api/rooms/engineer/bookmarks?reread=true");
    const res = await GET(req, { params });
    const json = await res.json();

    expect(json.bookmarks.map((b: { id: string }) => b.id)).toEqual(["b3"]);
  });

  it("filters by tag and read state together", async () => {
    const req = new Request(
      "http://localhost/api/rooms/engineer/bookmarks?readStatus=read&tag=react",
    );
    const res = await GET(req, { params });
    const json = await res.json();

    expect(json.bookmarks.map((b: { id: string }) => b.id)).toEqual(["b2"]);
  });
});

describe("POST /api/rooms/[slug]/bookmarks read state", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.room.findUnique.mockResolvedValue(room);
    prismaMock.bookmark.create.mockImplementation(
      async ({ data }: { data: Record<string, unknown> }) => bookmarkRow(data),
    );
  });

  function postRequest(body: unknown) {
    return new Request("http://localhost/api/rooms/engineer/bookmarks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  const baseBody = {
    url: "https://example.com/",
    title: "title",
    description: "desc",
    ogImage: "https://example.com/og.png",
    categorySlug: "tech-article",
  };

  it("stores the specified read state in metadata", async () => {
    const res = await POST(
      postRequest({ ...baseBody, readStatus: "read", reread: true }),
      { params },
    );

    expect(res.status).toBe(201);
    const data = prismaMock.bookmark.create.mock.calls[0][0].data;
    expect(JSON.parse(data.metadata)).toEqual({ readStatus: "read", reread: true });
    const json = await res.json();
    expect(json.readStatus).toBe("read");
    expect(json.reread).toBe(true);
  });

  it("defaults to unread with reread false", async () => {
    const res = await POST(postRequest(baseBody), { params });

    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.readStatus).toBe("unread");
    expect(json.reread).toBe(false);
  });

  it("returns 400 and does not create for an invalid read status", async () => {
    const res = await POST(
      postRequest({ ...baseBody, readStatus: "done" }),
      { params },
    );

    expect(res.status).toBe(400);
    expect(prismaMock.bookmark.create).not.toHaveBeenCalled();
  });
});
