import { Prisma } from "@prisma/client";

export type BookmarkInput = {
  roomId: string;
  categoryId?: string | null;
  url: string;
  title: string;
  description?: string | null;
  ogImage?: string | null;
  memo?: string | null;
  tags?: string[];
  metadata?: Record<string, unknown> | null;
  favorite?: boolean;
  readStatus?: ReadStatus;
  reread?: boolean;
};

export type ReadStatus = "unread" | "read";

export type ReadState = {
  readStatus: ReadStatus;
  reread: boolean;
};

export function isReadStatus(value: unknown): value is ReadStatus {
  return value === "unread" || value === "read";
}

export function getReadState(metadata: Record<string, unknown> | null): ReadState {
  const readStatus = isReadStatus(metadata?.readStatus) ? metadata.readStatus : "unread";
  return {
    readStatus,
    reread: readStatus === "read" && metadata?.reread === true,
  };
}

export function mergeReadState(
  metadata: Record<string, unknown> | null,
  input: { readStatus?: ReadStatus; reread?: boolean },
): string {
  const current = getReadState(metadata);
  const readStatus = input.readStatus ?? current.readStatus;
  const normalizedReadStatus: ReadStatus =
    input.readStatus === "unread" ? "unread" : input.reread === true ? "read" : readStatus;
  const reread = normalizedReadStatus === "read" && (input.reread ?? current.reread) === true;
  return JSON.stringify({ ...(metadata ?? {}), readStatus: normalizedReadStatus, reread });
}

export function parseTags(tagsJson: string): string[] {
  try {
    const v: unknown = JSON.parse(tagsJson);
    return Array.isArray(v) ? v.filter((t): t is string => typeof t === "string") : [];
  } catch {
    return [];
  }
}

export function serializeTags(tags: string[]): string {
  const normalized = [...new Set(tags.map((t) => t.trim()).filter(Boolean))];
  return JSON.stringify(normalized);
}

export function parseMetadata(metadata: string | null): Record<string, unknown> | null {
  if (!metadata) return null;
  try {
    const v: unknown = JSON.parse(metadata);
    return typeof v === "object" && v !== null ? (v as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

export type BookmarkDTO = {
  id: string;
  roomId: string;
  categoryId: string | null;
  categorySlug: string | null;
  categoryName: string | null;
  url: string;
  title: string;
  description: string | null;
  ogImage: string | null;
  memo: string | null;
  tags: string[];
  metadata: Record<string, unknown> | null;
  favorite: boolean;
  readStatus: ReadStatus;
  reread: boolean;
  createdAt: string;
  updatedAt: string;
};

const withCategory = Prisma.validator<Prisma.BookmarkInclude>()({
  category: { select: { name: true, slug: true } },
});

type BookmarkWithCategory = Prisma.BookmarkGetPayload<{ include: typeof withCategory }>;

export function toBookmarkDTO(b: BookmarkWithCategory): BookmarkDTO {
  const metadata = parseMetadata(b.metadata);
  return {
    id: b.id,
    roomId: b.roomId,
    categoryId: b.categoryId,
    categorySlug: b.category?.slug ?? null,
    categoryName: b.category?.name ?? null,
    url: b.url,
    title: b.title,
    description: b.description,
    ogImage: b.ogImage,
    memo: b.memo,
    tags: parseTags(b.tagsJson),
    metadata,
    favorite: b.favorite,
    ...getReadState(metadata),
    createdAt: b.createdAt.toISOString(),
    updatedAt: b.updatedAt.toISOString(),
  };
}

export function normalizeUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed) && !/^https?:\/\//i.test(trimmed)) return null;
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const u = new URL(withScheme);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    return u.toString();
  } catch {
    return null;
  }
}

export function normalizeTagsInput(input: unknown): string[] {
  if (Array.isArray(input)) {
    return [...new Set(input.filter((t): t is string => typeof t === "string").map((t) => t.trim()).filter(Boolean))].slice(0, 30);
  }
  if (typeof input === "string") {
    return normalizeTagsInput(input.split(/[,，\s]+/));
  }
  return [];
}
