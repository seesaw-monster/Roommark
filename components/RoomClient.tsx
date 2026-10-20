"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { BookmarkCard } from "@/components/BookmarkCard";
import { RegisterModal } from "@/components/RegisterModal";
import type { BookmarkDTO, RoomInfo, TagCount } from "@/components/types";

type SortKey = "new" | "updated" | "title";
type ReadFilter = "" | "unread" | "read" | "reread";

export function BookmarkListClient({
  slug,
  room,
  fixedCategorySlug,
  headerTitle,
  backHref,
  backLabel,
}: {
  slug: string;
  room: RoomInfo;
  fixedCategorySlug?: string;
  headerTitle: string;
  backHref: string;
  backLabel: string;
}) {
  const [bookmarks, setBookmarks] = useState<BookmarkDTO[]>([]);
  const [tags, setTags] = useState<TagCount[]>([]);
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [activeTag, setActiveTag] = useState("");
  const [sort, setSort] = useState<SortKey>("new");
  const [favoriteOnly, setFavoriteOnly] = useState(false);
  const [readFilter, setReadFilter] = useState<ReadFilter>("");
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const isTechArticle = fixedCategorySlug === "tech-article";

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q.trim()), 300);
    return () => clearTimeout(t);
  }, [q]);

  const load = useCallback(async () => {
    const params = new URLSearchParams();
    if (debouncedQ) params.set("q", debouncedQ);
    if (activeTag) params.set("tag", activeTag);
    if (fixedCategorySlug) params.set("category", fixedCategorySlug);
    if (favoriteOnly) params.set("favorite", "true");
    if (isTechArticle) {
      if (readFilter === "unread" || readFilter === "read") params.set("readStatus", readFilter);
      if (readFilter === "reread") params.set("reread", "true");
    }
    params.set("sort", sort);
    const res = await fetch(`/api/rooms/${slug}/bookmarks?${params.toString()}`);
    if (res.ok) {
      const data = await res.json();
      setBookmarks(data.bookmarks as BookmarkDTO[]);
      setTags(data.tags as TagCount[]);
    }
    setLoading(false);
  }, [slug, debouncedQ, activeTag, fixedCategorySlug, sort, favoriteOnly, readFilter, isTechArticle]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  async function toggleFavorite(b: BookmarkDTO) {
    const res = await fetch(`/api/bookmarks/${b.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ favorite: !b.favorite }),
    });
    if (res.ok) load();
  }

  async function updateReadState(
    b: BookmarkDTO,
    patch: { readStatus?: "unread" | "read"; reread?: boolean },
  ) {
    const res = await fetch(`/api/bookmarks/${b.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (res.ok) load();
  }

  async function removeBookmark(b: BookmarkDTO) {
    if (!window.confirm(`「${b.title}」を削除しますか？`)) return;
    const res = await fetch(`/api/bookmarks/${b.id}`, { method: "DELETE" });
    if (res.ok) load();
  }

  return (
    <main>
      <nav className="mb-4 text-sm text-stone-500">
        <Link href={backHref} className="hover:underline">{backLabel}</Link>
      </nav>
      <header className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">{headerTitle}</h1>
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="rounded-lg bg-stone-900 px-4 py-2 text-sm text-white"
        >
          ＋ 登録
        </button>
      </header>

      <div className="mb-4 space-y-2 rounded-xl border border-stone-200 bg-white p-3">
        <div className="flex flex-wrap gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="キーワード検索（タイトル・URL・メモ）"
            className="min-w-52 flex-1 rounded-lg border border-stone-300 px-3 py-1.5 text-sm"
          />
          <div className="relative flex-none">
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              className="appearance-none rounded-lg border border-stone-300 bg-white py-1.5 pl-3 pr-8 text-sm"
            >
              <option value="new">新着順</option>
              <option value="updated">更新順</option>
              <option value="title">タイトル順</option>
            </select>
            <svg
              aria-hidden="true"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-500"
            >
              <path d="M4 6l4 4 4-4" />
            </svg>
          </div>
          <label className="flex items-center gap-1 text-sm">
            <input
              type="checkbox"
              checked={favoriteOnly}
              onChange={(e) => setFavoriteOnly(e.target.checked)}
            />
            ★のみ
          </label>
          {isTechArticle && (
            <select
              value={readFilter}
              onChange={(e) => setReadFilter(e.target.value as ReadFilter)}
              className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm"
            >
              <option value="">すべての読書状態</option>
              <option value="unread">未読</option>
              <option value="read">既読</option>
              <option value="reread">また読む</option>
            </select>
          )}
        </div>
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 text-xs">
            {activeTag && (
              <button
                type="button"
                onClick={() => setActiveTag("")}
                className="rounded-full bg-red-100 px-2.5 py-1 text-red-700"
              >
                #{activeTag} を解除 ✕
              </button>
            )}
            {tags.map((t) => (
              <button
                key={t.name}
                type="button"
                onClick={() => setActiveTag(activeTag === t.name ? "" : t.name)}
                className={`rounded-full px-2.5 py-1 ${activeTag === t.name ? "bg-stone-900 text-white" : "bg-stone-100 text-stone-600"}`}
              >
                #{t.name} ({t.count})
              </button>
            ))}
          </div>
        )}
      </div>

      {loading ? (
        <p className="py-8 text-center text-sm text-stone-500">読み込み中…</p>
      ) : bookmarks.length === 0 ? (
        <p className="rounded-xl border border-dashed border-stone-300 py-12 text-center text-sm text-stone-500">
          まだブックマークがありません。「＋ 登録」から追加してください。
        </p>
      ) : (
        <div className="space-y-3">
          {bookmarks.map((b) => (
            <BookmarkCard
              key={b.id}
              roomSlug={slug}
              bookmark={b}
              isTechArticle={isTechArticle}
              onToggleFavorite={toggleFavorite}
              onUpdateReadState={updateReadState}
              onDelete={removeBookmark}
            />
          ))}
        </div>
      )}

      {modalOpen && (
        <RegisterModal
          room={room}
          fixedCategorySlug={fixedCategorySlug}
          onClose={() => setModalOpen(false)}
          onCreated={load}
        />
      )}
    </main>
  );
}

export function RoomClient({ slug }: { slug: string }) {
  const [room, setRoom] = useState<RoomInfo | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const loadRoom = useCallback(async () => {
    const res = await fetch("/api/rooms");
    if (res.ok) {
      const data = await res.json();
      setRoom((data.rooms as RoomInfo[]).find((r) => r.slug === slug) ?? null);
    }
    setLoaded(true);
  }, [slug]);

  useEffect(() => {
    loadRoom();
  }, [loadRoom]);

  if (!loaded || !room) {
    return (
      <main>
        <nav className="mb-4 text-sm text-stone-500">
          <Link href="/" className="hover:underline">← 玄関（Room一覧）</Link>
        </nav>
        <p className="py-8 text-center text-sm text-stone-500">
          {loaded ? "Roomが見つかりません" : "読み込み中…"}
        </p>
      </main>
    );
  }

  if (room.categories.length === 0) {
    return (
      <BookmarkListClient
        slug={slug}
        room={room}
        headerTitle={`${room.icon} ${room.name}`}
        backHref="/"
        backLabel="← 玄関（Room一覧）"
      />
    );
  }

  return (
    <main>
      <nav className="mb-4 text-sm text-stone-500">
        <Link href="/" className="hover:underline">← 玄関（Room一覧）</Link>
      </nav>
      <header className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">{room.icon} {room.name}</h1>
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="rounded-lg bg-stone-900 px-4 py-2 text-sm text-white"
        >
          ＋ 登録
        </button>
      </header>
      <p className="mb-4 text-sm text-stone-600">入りたい小部屋を選ぶ。</p>
      <div className="grid gap-4 sm:grid-cols-2">
        {room.categories.map((c) => (
          <Link
            key={c.slug}
            href={`/rooms/${slug}/${c.slug}`}
            className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="text-lg font-semibold">{c.name}</div>
            <div className="mt-1 text-sm text-stone-500">{c.bookmarkCount} 件</div>
            <div className="mt-2 text-sm text-stone-700">入る →</div>
          </Link>
        ))}
      </div>
      {modalOpen && (
        <RegisterModal room={room} onClose={() => setModalOpen(false)} onCreated={loadRoom} />
      )}
    </main>
  );
}
