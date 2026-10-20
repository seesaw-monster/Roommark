"use client";

import Link from "next/link";
import type { BookmarkDTO } from "./types";

export function BookmarkCard({
  roomSlug,
  bookmark,
  isTechArticle,
  onToggleFavorite,
  onUpdateReadState,
  onDelete,
}: {
  roomSlug: string;
  bookmark: BookmarkDTO;
  isTechArticle?: boolean;
  onToggleFavorite: (b: BookmarkDTO) => void;
  onUpdateReadState?: (
    b: BookmarkDTO,
    patch: { readStatus?: "unread" | "read"; reread?: boolean },
  ) => void;
  onDelete: (b: BookmarkDTO) => void;
}) {
  return (
    <article className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
      <div className="flex items-start gap-3">
        {bookmark.ogImage && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={bookmark.ogImage} alt="" className="h-14 w-14 shrink-0 rounded-lg object-cover" />
        )}
        <div className="min-w-0 flex-1">
          <a
            href={bookmark.url}
            target="_blank"
            rel="noreferrer"
            className="block truncate font-semibold hover:underline"
          >
            {bookmark.title}
          </a>
          <div className="mt-0.5 truncate text-xs text-stone-500">{bookmark.url}</div>
          {bookmark.memo && <p className="mt-1 line-clamp-2 text-sm text-stone-700">{bookmark.memo}</p>}
          <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
            {isTechArticle && (
              <>
                <button
                  type="button"
                  onClick={() =>
                    onUpdateReadState?.(bookmark, {
                      readStatus: bookmark.readStatus === "read" ? "unread" : "read",
                    })
                  }
                  className={`rounded-full px-2 py-0.5 ${
                    bookmark.readStatus === "read"
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-amber-100 text-amber-800"
                  }`}
                >
                  {bookmark.readStatus === "read" ? "既読" : "未読"}
                </button>
                {bookmark.readStatus === "read" && (
                  <button
                    type="button"
                    onClick={() => onUpdateReadState?.(bookmark, { reread: !bookmark.reread })}
                    className={`rounded-full px-2 py-0.5 ${
                      bookmark.reread ? "bg-blue-100 text-blue-700" : "bg-stone-100 text-stone-600"
                    }`}
                  >
                    {bookmark.reread ? "また読む中" : "また読む"}
                  </button>
                )}
              </>
            )}
            {bookmark.categoryName && (
              <span className="rounded-full bg-stone-900 px-2 py-0.5 text-white">{bookmark.categoryName}</span>
            )}
            {bookmark.tags.map((t) => (
              <span key={t} className="rounded-full bg-stone-200 px-2 py-0.5 text-stone-700">#{t}</span>
            ))}
          </div>
        </div>
        <button
          type="button"
          onClick={() => onToggleFavorite(bookmark)}
          aria-label="お気に入り切替"
          className="shrink-0 text-xl"
        >
          {bookmark.favorite ? "★" : "☆"}
        </button>
      </div>
      <div className="mt-2 flex items-center justify-between text-xs text-stone-500">
        <span>{new Date(bookmark.createdAt).toLocaleString("ja-JP")}</span>
        <span className="flex gap-3">
          <Link href={`/rooms/${roomSlug}/${bookmark.id}`} className="hover:underline">詳細・編集</Link>
          <button type="button" onClick={() => onDelete(bookmark)} className="text-red-600 hover:underline">
            削除
          </button>
        </span>
      </div>
    </article>
  );
}
