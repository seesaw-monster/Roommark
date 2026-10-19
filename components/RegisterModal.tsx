"use client";

import { useState } from "react";
import type { RoomInfo } from "./types";
import { fetchOgpPreview } from "./types";

export function RegisterModal({
  room,
  fixedCategorySlug,
  onClose,
  onCreated,
}: {
  room: RoomInfo;
  fixedCategorySlug?: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [memo, setMemo] = useState("");
  const [tags, setTags] = useState("");
  const [categorySlug, setCategorySlug] = useState(fixedCategorySlug ?? "");
  const [fetching, setFetching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ogImage, setOgImage] = useState<string | null>(null);

  async function handleFetchTitle() {
    if (!url.trim()) {
      setError("URLを入力してください");
      return;
    }
    setFetching(true);
    setError(null);
    try {
      const ogp = await fetchOgpPreview(url.trim());
      if (ogp.title) setTitle(ogp.title);
      setOgImage(ogp.ogImage);
      if (!ogp.title) setError("タイトルを取得できませんでした。手入力してください");
    } catch {
      setError("タイトルの自動取得に失敗しました。手入力で保存できます");
    } finally {
      setFetching(false);
    }
  }

  async function handleSave() {
    if (!url.trim()) {
      setError("URLを入力してください");
      return;
    }
    const effectiveCategory = fixedCategorySlug || categorySlug;
    if (room.categories.length > 0 && !effectiveCategory) {
      setError("カテゴリを選択してください");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/rooms/${room.slug}/bookmarks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: url.trim(),
          title: title.trim() || undefined,
          memo: memo.trim() || undefined,
          tags: tags.split(/[,\s\u3000\uFF0C]+/).filter(Boolean),
          categorySlug: effectiveCategory || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "保存に失敗しました");
        return;
      }
      onCreated();
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-bold">
          {room.icon} {room.name}
          {fixedCategorySlug &&
            ` / ${room.categories.find((c) => c.slug === fixedCategorySlug)?.name ?? fixedCategorySlug}`}
          に登録
        </h2>
        <div className="mt-4 space-y-3">
          <label className="block">
            <span className="text-sm font-medium">URL *</span>
            <div className="mt-1 flex gap-2">
              <input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com/article"
                className="flex-1 rounded-lg border border-stone-300 px-3 py-2 text-sm"
              />
              <button
                type="button"
                onClick={handleFetchTitle}
                disabled={fetching}
                className="shrink-0 rounded-lg bg-stone-900 px-3 py-2 text-sm text-white disabled:opacity-50"
              >
                {fetching ? "取得中…" : "自動取得"}
              </button>
            </div>
          </label>
          {ogImage && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={ogImage} alt="" className="max-h-32 rounded-lg object-cover" />
          )}
          <label className="block">
            <span className="text-sm font-medium">タイトル</span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="自動取得 / 手入力"
              className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
            />
          </label>
          {room.categories.length > 0 &&
            (fixedCategorySlug ? (
              <p className="text-sm">
                <span className="font-medium">カテゴリ: </span>
                <span className="rounded-full bg-stone-900 px-2.5 py-1 text-xs text-white">
                  {room.categories.find((c) => c.slug === fixedCategorySlug)?.name ?? fixedCategorySlug}
                </span>
              </p>
            ) : (
              <label className="block">
                <span className="text-sm font-medium">カテゴリ *</span>
                <select
                  value={categorySlug}
                  onChange={(e) => setCategorySlug(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
                >
                  <option value="">選択してください</option>
                  {room.categories.map((c) => (
                    <option key={c.slug} value={c.slug}>{c.name}</option>
                  ))}
                </select>
              </label>
            ))}
          <label className="block">
            <span className="text-sm font-medium">メモ</span>
            <textarea
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              rows={3}
              className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium">タグ（カンマ・空白区切り）</span>
            <input
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="typescript, あとで読む"
              className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
            />
          </label>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="rounded-lg px-4 py-2 text-sm text-stone-600 hover:bg-stone-100">
              キャンセル
            </button>
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
      </div>
    </div>
  );
}
