"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { BookmarkDTO } from "@/components/types";

export function DetailClient({ roomSlug, id }: { roomSlug: string; id: string }) {
  const router = useRouter();
  const [bookmark, setBookmark] = useState<BookmarkDTO | null>(null);
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [memo, setMemo] = useState("");
  const [tags, setTags] = useState("");
  const [favorite, setFavorite] = useState(false);
  const [readStatus, setReadStatus] = useState<"unread" | "read">("unread");
  const [reread, setReread] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch(`/api/bookmarks/${id}`).then(async (res) => {
      if (!res.ok) {
        setLoaded(true);
        return;
      }
      const b = (await res.json()) as BookmarkDTO;
      setBookmark(b);
      setTitle(b.title);
      setUrl(b.url);
      setMemo(b.memo ?? "");
      setTags(b.tags.join(", "));
      setFavorite(b.favorite);
      setReadStatus(b.readStatus);
      setReread(b.reread);
      setLoaded(true);
    });
  }, [id]);

  async function handleSave() {
    if (!title.trim() || !url.trim()) {
      setError("タイトルとURLは必須です");
      return;
    }
    setSaving(true);
    setError(null);
    const res = await fetch(`/api/bookmarks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: title.trim(),
        url: url.trim(),
        memo: memo.trim(),
        tags: tags.split(/[,\s\u3000\uFF0C]+/).filter(Boolean),
        favorite,
        ...(bookmark?.categorySlug === "tech-article" ? { readStatus, reread } : {}),
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "保存に失敗しました");
      setSaving(false);
      return;
    }
    router.push(`/rooms/${roomSlug}`);
  }

  if (!loaded) return <p className="py-8 text-center text-sm text-stone-500">読み込み中…</p>;
  if (!bookmark) return <p className="py-8 text-center text-sm text-stone-500">ブックマークが見つかりません</p>;

  return (
    <main>
      <nav className="mb-4 text-sm text-stone-500">
        <Link
          href={bookmark.categorySlug ? `/rooms/${roomSlug}/${bookmark.categorySlug}` : `/rooms/${roomSlug}`}
          className="hover:underline"
        >
          ← {bookmark.categorySlug ? "小部屋に戻る" : `${roomSlug} に戻る`}
        </Link>
      </nav>
      <h1 className="mb-4 text-xl font-bold">詳細・編集</h1>
      {bookmark.ogImage && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={bookmark.ogImage} alt="" className="mb-4 max-h-48 rounded-xl object-cover" />
      )}
      {bookmark.description && (
        <p className="mb-4 rounded-xl border border-stone-200 bg-white p-3 text-sm text-stone-600">
          {bookmark.description}
        </p>
      )}
      <div className="space-y-3 rounded-xl border border-stone-200 bg-white p-4">
        <label className="block">
          <span className="text-sm font-medium">タイトル *</span>
          <input value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm" />
        </label>
        <label className="block">
          <span className="text-sm font-medium">URL *</span>
          <input value={url} onChange={(e) => setUrl(e.target.value)} className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm" />
        </label>
        <label className="block">
          <span className="text-sm font-medium">メモ</span>
          <textarea value={memo} onChange={(e) => setMemo(e.target.value)} rows={5} className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm" />
        </label>
        <label className="block">
          <span className="text-sm font-medium">タグ（カンマ・空白区切り）</span>
          <input value={tags} onChange={(e) => setTags(e.target.value)} className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm" />
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={favorite} onChange={(e) => setFavorite(e.target.checked)} />
          お気に入り
        </label>
        {bookmark.categorySlug === "tech-article" && (
          <div className="space-y-2">
            <label className="block">
              <span className="text-sm font-medium">読書状態</span>
              <select
                value={readStatus}
                onChange={(e) => {
                  const next = e.target.value as "unread" | "read";
                  setReadStatus(next);
                  if (next === "unread") setReread(false);
                }}
                className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
              >
                <option value="unread">未読</option>
                <option value="read">既読</option>
              </select>
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={reread}
                disabled={readStatus !== "read"}
                onChange={(e) => setReread(e.target.checked)}
              />
              また読む
            </label>
          </div>
        )}
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex justify-end pt-2">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="rounded-lg bg-stone-900 px-4 py-2 text-sm text-white disabled:opacity-50"
          >
            {saving ? "保存中…" : "保存"}
          </button>
        </div>
      </div>
      <p className="mt-3 text-xs text-stone-500">
        登録: {new Date(bookmark.createdAt).toLocaleString("ja-JP")} / 更新: {new Date(bookmark.updatedAt).toLocaleString("ja-JP")}
      </p>
    </main>
  );
}
