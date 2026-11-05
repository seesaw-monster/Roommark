import { describe, expect, it } from "vitest";
import { toPersonDTO, validatePersonInput } from "./people";

const baseDate = new Date("2026-11-04T00:00:00.000Z");

function personRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "p1",
    roomId: "person-room",
    name: "夏目漱石",
    subGenresJson: '["純文学"]',
    memo: null,
    url: null,
    createdAt: baseDate,
    updatedAt: baseDate,
    ...overrides,
  };
}

describe("validatePersonInput", () => {
  it("registers a person with only a name", () => {
    const result = validatePersonInput({ name: "  夏目漱石  " });

    expect(result).toEqual({
      ok: true,
      value: {
        name: "夏目漱石",
        subGenres: [],
        memo: null,
        url: null,
      },
    });
  });

  it("accepts subgenres as an array and trims/deduplicates them", () => {
    const result = validatePersonInput({
      name: "夏目漱石",
      subGenres: [" 純文学 ", "", "純文学", "ミステリー"],
    });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error(result.error);
    expect(result.value.subGenres).toEqual(["純文学", "ミステリー"]);
  });

  it("accepts subgenres as a comma- or space-separated string", () => {
    const result = validatePersonInput({
      name: "夏目漱石",
      subGenres: "純文学, ミステリー　ホラー",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error(result.error);
    expect(result.value.subGenres).toEqual(["純文学", "ミステリー", "ホラー"]);
  });

  it("limits subgenres to 30 items", () => {
    const subGenres = Array.from({ length: 35 }, (_, i) => `ジャンル${i}`);
    const result = validatePersonInput({ name: "夏目漱石", subGenres });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error(result.error);
    expect(result.value.subGenres).toHaveLength(30);
  });

  it("trims memo and converts an empty string to null", () => {
    const trimmed = validatePersonInput({ name: "夏目漱石", memo: "  好きな作家  " });
    const empty = validatePersonInput({ name: "夏目漱石", memo: "  " });

    expect(trimmed.ok).toBe(true);
    if (!trimmed.ok) throw new Error(trimmed.error);
    expect(trimmed.value.memo).toBe("好きな作家");

    expect(empty.ok).toBe(true);
    if (!empty.ok) throw new Error(empty.error);
    expect(empty.value.memo).toBeNull();
  });

  it("normalizes the URL to http/https and converts an empty string to null", () => {
    const normalized = validatePersonInput({
      name: "夏目漱石",
      url: "  example.com/authors/natsume  ",
    });
    const empty = validatePersonInput({ name: "夏目漱石", url: "  " });

    expect(normalized.ok).toBe(true);
    if (!normalized.ok) throw new Error(normalized.error);
    expect(normalized.value.url).toBe("https://example.com/authors/natsume");

    expect(empty.ok).toBe(true);
    if (!empty.ok) throw new Error(empty.error);
    expect(empty.value.url).toBeNull();
  });

  it("accepts a name of exactly 100 characters", () => {
    const result = validatePersonInput({ name: "あ".repeat(100) });

    expect(result.ok).toBe(true);
  });

  it("rejects a name of 101 characters", () => {
    const result = validatePersonInput({ name: "あ".repeat(101) });

    expect(result.ok).toBe(false);
  });

  it("accepts a memo of exactly 2000 characters", () => {
    const result = validatePersonInput({ name: "夏目漱石", memo: "あ".repeat(2000) });

    expect(result.ok).toBe(true);
  });

  it("rejects a memo of 2001 characters", () => {
    const result = validatePersonInput({ name: "夏目漱石", memo: "あ".repeat(2001) });

    expect(result.ok).toBe(false);
  });

  it("rejects an empty name", () => {
    expect(validatePersonInput({ name: "" }).ok).toBe(false);
    expect(validatePersonInput({ name: "   " }).ok).toBe(false);
    expect(validatePersonInput({}).ok).toBe(false);
  });

  it("rejects an invalid URL", () => {
    expect(validatePersonInput({ name: "夏目漱石", url: "javascript:alert(1)" }).ok).toBe(false);
    expect(validatePersonInput({ name: "夏目漱石", url: "ftp://example.com" }).ok).toBe(false);
  });

  it.each([null, "文字列", 1, []])("rejects non-object input: %s", (input) => {
    expect(validatePersonInput(input).ok).toBe(false);
  });
});

describe("toPersonDTO", () => {
  it("converts subgenres to an array and dates to ISO strings", () => {
    const dto = toPersonDTO(
      personRow({
        subGenresJson: '["ホラー","ミステリー"]',
        memo: "好きな監督",
        url: "https://example.com/director",
      }) as never,
    );

    expect(dto).toEqual({
      id: "p1",
      roomId: "person-room",
      name: "夏目漱石",
      subGenres: ["ホラー", "ミステリー"],
      memo: "好きな監督",
      url: "https://example.com/director",
      createdAt: "2026-11-04T00:00:00.000Z",
      updatedAt: "2026-11-04T00:00:00.000Z",
    });
  });

  it("treats invalid subgenre JSON as an empty array", () => {
    const dto = toPersonDTO(personRow({ subGenresJson: "broken" }) as never);

    expect(dto.subGenres).toEqual([]);
  });

  it("excludes non-string subgenres", () => {
    const dto = toPersonDTO(
      personRow({ subGenresJson: '["ホラー",1,null,{"name":"ミステリー"}]' }) as never,
    );

    expect(dto.subGenres).toEqual(["ホラー"]);
  });
});
