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
};

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
  createdAt: string;
  updatedAt: string;
};

const withCategory = Prisma.validator<Prisma.BookmarkInclude>()({
  category: { select: { name: true, slug: true } },
});

type BookmarkWithCategory = Prisma.BookmarkGetPayload<{ include: typeof withCategory }>;

export function toBookmarkDTO(b: BookmarkWithCategory): BookmarkDTO {
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
    metadata: parseMetadata(b.metadata),
    favorite: b.favorite,
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
