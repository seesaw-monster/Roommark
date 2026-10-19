export type RoomInfo = {
  id: string;
  slug: string;
  name: string;
  icon: string | null;
  bookmarkCount: number;
  categories: { id: string; slug: string; name: string; bookmarkCount: number }[];
};

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

export type TagCount = { name: string; count: number };

export async function fetchOgpPreview(url: string) {
  const res = await fetch(`/api/ogp?url=${encodeURIComponent(url)}`);
  if (!res.ok) throw new Error("OGP取得に失敗しました");
  return (await res.json()) as {
    url: string;
    title: string | null;
    description: string | null;
    ogImage: string | null;
    siteName: string | null;
  };
}
