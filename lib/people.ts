import { normalizeTagsInput, normalizeUrl, parseTags } from "./bookmarks";

export type PersonInput = {
  name: string;
  subGenres: string[];
  memo: string | null;
  url: string | null;
};

export type PersonRow = {
  id: string;
  roomId: string;
  name: string;
  subGenresJson: string;
  memo: string | null;
  url: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type PersonDTO = PersonInput & {
  id: string;
  roomId: string;
  createdAt: string;
  updatedAt: string;
};

export type PersonValidationResult =
  | { ok: true; value: PersonInput }
  | { ok: false; error: string };

export type SubGenreCount = {
  name: string;
  count: number;
};

const NAME_MAX_LENGTH = 100;
const MEMO_MAX_LENGTH = 2000;

export function validatePersonInput(input: unknown): PersonValidationResult {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    return { ok: false, error: "入力内容が不正です" };
  }

  const body = input as Record<string, unknown>;

  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) return { ok: false, error: "名前を入力してください" };
  if (name.length > NAME_MAX_LENGTH) {
    return { ok: false, error: "名前は100文字以内で入力してください" };
  }

  let subGenres: string[];
  if (body.subGenres === undefined || body.subGenres === null) {
    subGenres = [];
  } else if (typeof body.subGenres === "string" || Array.isArray(body.subGenres)) {
    subGenres = normalizeTagsInput(body.subGenres);
  } else {
    return { ok: false, error: "サブジャンルが不正です" };
  }

  let memo: string | null;
  if (body.memo === undefined || body.memo === null) {
    memo = null;
  } else if (typeof body.memo === "string") {
    const trimmed = body.memo.trim();
    if (trimmed.length > MEMO_MAX_LENGTH) {
      return { ok: false, error: "メモは2000文字以内で入力してください" };
    }
    memo = trimmed || null;
  } else {
    return { ok: false, error: "メモが不正です" };
  }

  let url: string | null;
  if (body.url === undefined || body.url === null) {
    url = null;
  } else if (typeof body.url === "string") {
    const trimmed = body.url.trim();
    if (!trimmed) {
      url = null;
    } else {
      url = normalizeUrl(trimmed);
      if (!url) return { ok: false, error: "URLが不正です" };
    }
  } else {
    return { ok: false, error: "URLが不正です" };
  }

  return {
    ok: true,
    value: { name, subGenres, memo, url },
  };
}

export function toPersonDTO(person: PersonRow): PersonDTO {
  return {
    id: person.id,
    roomId: person.roomId,
    name: person.name,
    subGenres: parseTags(person.subGenresJson),
    memo: person.memo,
    url: person.url,
    createdAt: person.createdAt.toISOString(),
    updatedAt: person.updatedAt.toISOString(),
  };
}
