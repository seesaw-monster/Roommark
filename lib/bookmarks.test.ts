import { describe, expect, it } from "vitest";
import {
  normalizeTagsInput,
  normalizeUrl,
  parseMetadata,
  parseTags,
  serializeTags,
  toBookmarkDTO,
} from "./bookmarks";

describe("parseTags", () => {
  it("文字列配列のJSONを配列として返す", () => {
    expect(parseTags('["a","b"]')).toEqual(["a", "b"]);
  });

  it("文字列以外は除外する", () => {
    expect(parseTags('["a",1,null,{"t":"x"},"b"]')).toEqual(["a", "b"]);
  });

  it("配列でないJSONは空配列を返す", () => {
    expect(parseTags('{"tags":["a"]}')).toEqual([]);
    expect(parseTags('"a"')).toEqual([]);
    expect(parseTags("null")).toEqual([]);
  });

  it("不正なJSONは空配列を返す", () => {
    expect(parseTags("not-json")).toEqual([]);
    expect(parseTags("")).toEqual([]);
  });
});

describe("serializeTags", () => {
  it("前後空白の除去・空文字の除去・重複排除をする", () => {
    expect(serializeTags([" a ", "", "a", "b", "b "])).toBe('["a","b"]');
  });

  it("空配列は空配列JSONになる", () => {
    expect(serializeTags([])).toBe("[]");
  });
});

describe("parseMetadata", () => {
  it("null・空文字はnullを返す", () => {
    expect(parseMetadata(null)).toBeNull();
    expect(parseMetadata("")).toBeNull();
  });

  it("オブジェクトJSONを返す", () => {
    expect(parseMetadata('{"a":1}')).toEqual({ a: 1 });
  });

  it("オブジェクトでないJSONはnullを返す", () => {
    expect(parseMetadata('"str"')).toBeNull();
    expect(parseMetadata("123")).toBeNull();
    expect(parseMetadata("null")).toBeNull();
  });

  it("不正なJSONはnullを返す", () => {
    expect(parseMetadata("{broken")).toBeNull();
  });
});

describe("normalizeUrl", () => {
  it("http・https URLを正規化する", () => {
    expect(normalizeUrl("https://example.com")).toBe("https://example.com/");
    expect(normalizeUrl("  http://example.com/a?b=c  ")).toBe("http://example.com/a?b=c");
  });

  it("スキーム無しはhttpsを付与する", () => {
    expect(normalizeUrl("example.com")).toBe("https://example.com/");
  });

  it("空文字はnullを返す", () => {
    expect(normalizeUrl("")).toBeNull();
    expect(normalizeUrl("   ")).toBeNull();
  });

  it("http以外のスキームはnullを返す", () => {
    expect(normalizeUrl("ftp://example.com")).toBeNull();
    expect(normalizeUrl("javascript:alert(1)")).toBeNull();
  });

  it("不正なURLはnullを返す", () => {
    expect(normalizeUrl("https://")).toBeNull();
  });
});

describe("normalizeTagsInput", () => {
  it("配列の空白・空文字・重複を整形する", () => {
    expect(normalizeTagsInput([" a ", "", "a", "b"])).toEqual(["a", "b"]);
  });

  it("配列以外は除外し文字列以外は無視する", () => {
    expect(normalizeTagsInput(["a", 1, null, undefined, "b"])).toEqual(["a", "b"]);
  });

  it("文字列はカンマ・読点・空白で分割する", () => {
    expect(normalizeTagsInput("a,b c，d")).toEqual(["a", "b", "c", "d"]);
  });

  it("最大30件に切り詰める", () => {
    const input = Array.from({ length: 40 }, (_, i) => `t${i}`);
    expect(normalizeTagsInput(input)).toHaveLength(30);
  });

  it("配列・文字列以外は空配列を返す", () => {
    expect(normalizeTagsInput(null)).toEqual([]);
    expect(normalizeTagsInput(undefined)).toEqual([]);
    expect(normalizeTagsInput(123)).toEqual([]);
    expect(normalizeTagsInput({})).toEqual([]);
  });
});

describe("toBookmarkDTO", () => {
  it("カテゴリ付きBookmarkをDTOに変換する", () => {
    const dto = toBookmarkDTO({
      id: "b1",
      roomId: "r1",
      categoryId: "c1",
      url: "https://example.com/",
      title: "title",
      description: "desc",
      ogImage: null,
      memo: null,
      tagsJson: '["a","b"]',
      metadata: '{"k":"v"}',
      favorite: true,
      createdAt: new Date("2024-01-01T00:00:00.000Z"),
      updatedAt: new Date("2024-01-02T00:00:00.000Z"),
      category: { name: "cat", slug: "cat-slug" },
    } as never);

    expect(dto).toEqual({
      id: "b1",
      roomId: "r1",
      categoryId: "c1",
      categorySlug: "cat-slug",
      categoryName: "cat",
      url: "https://example.com/",
      title: "title",
      description: "desc",
      ogImage: null,
      memo: null,
      tags: ["a", "b"],
      metadata: { k: "v" },
      favorite: true,
      createdAt: "2024-01-01T00:00:00.000Z",
      updatedAt: "2024-01-02T00:00:00.000Z",
    });
  });

  it("カテゴリ無しはslug・nameがnullになる", () => {
    const dto = toBookmarkDTO({
      id: "b1",
      roomId: "r1",
      categoryId: null,
      url: "https://example.com/",
      title: "title",
      description: null,
      ogImage: null,
      memo: null,
      tagsJson: "broken",
      metadata: null,
      favorite: false,
      createdAt: new Date("2024-01-01T00:00:00.000Z"),
      updatedAt: new Date("2024-01-01T00:00:00.000Z"),
      category: null,
    } as never);

    expect(dto.categorySlug).toBeNull();
    expect(dto.categoryName).toBeNull();
    expect(dto.tags).toEqual([]);
    expect(dto.metadata).toBeNull();
  });
});
