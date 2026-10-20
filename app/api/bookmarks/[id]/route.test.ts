import { beforeEach, describe, expect, it, vi } from "vitest";
import { PATCH } from "./route";

const prismaMock = vi.hoisted(() => ({
  bookmark: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
}));

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

const baseDate = new Date("2024-01-01T00:00:00.000Z");
const category = {
  id: "c1",
  roomId: "r1",
  name: "技術記事",
  slug: "tech-article",
  sortOrder: 0,
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

function existingRow(overrides: Record<string, unknown> = {}) {
  return {
    ...bookmarkRow(overrides),
    room: {
      id: "r1",
      name: "エンジニア",
      slug: "engineer",
      icon: "💻",
      sortOrder: 0,
      categories: [category],
    },
  };
}

function patchRequest(body: unknown) {
  return new Request("http://localhost/api/bookmarks/b1", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const params = Promise.resolve({ id: "b1" });

describe("PATCH /api/bookmarks/[id] read state", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.bookmark.findUnique.mockResolvedValue(existingRow());
    prismaMock.bookmark.update.mockImplementation(
      async ({ data }: { data: Record<string, unknown> }) => bookmarkRow(data),
    );
  });

  it("updates read status and preserves existing metadata", async () => {
    prismaMock.bookmark.findUnique.mockResolvedValue(
      existingRow({
        metadata: JSON.stringify({ foo: "bar", readStatus: "unread", reread: false }),
      }),
    );

    const res = await PATCH(patchRequest({ readStatus: "read" }), { params });

    expect(res.status).toBe(200);
    const data = prismaMock.bookmark.update.mock.calls[0][0].data;
    expect(JSON.parse(data.metadata)).toEqual({
      foo: "bar",
      readStatus: "read",
      reread: false,
    });
    const json = await res.json();
    expect(json.readStatus).toBe("read");
    expect(json.reread).toBe(false);
  });

  it("stores reread alone as read", async () => {
    const res = await PATCH(patchRequest({ reread: true }), { params });

    expect(res.status).toBe(200);
    const data = prismaMock.bookmark.update.mock.calls[0][0].data;
    expect(JSON.parse(data.metadata)).toEqual({ readStatus: "read", reread: true });
    const json = await res.json();
    expect(json.readStatus).toBe("read");
    expect(json.reread).toBe(true);
  });

  it("clears reread when changing back to unread", async () => {
    prismaMock.bookmark.findUnique.mockResolvedValue(
      existingRow({ metadata: JSON.stringify({ readStatus: "read", reread: true }) }),
    );

    const res = await PATCH(patchRequest({ readStatus: "unread" }), { params });

    expect(res.status).toBe(200);
    const data = prismaMock.bookmark.update.mock.calls[0][0].data;
    expect(JSON.parse(data.metadata)).toEqual({ readStatus: "unread", reread: false });
    const json = await res.json();
    expect(json.readStatus).toBe("unread");
    expect(json.reread).toBe(false);
  });

  it("returns 400 and does not update for an invalid read status", async () => {
    const res = await PATCH(patchRequest({ readStatus: "done" }), { params });

    expect(res.status).toBe(400);
    expect(prismaMock.bookmark.update).not.toHaveBeenCalled();
  });
});
