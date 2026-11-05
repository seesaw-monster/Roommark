"use client";

import { useState } from "react";
import type { PersonDTO } from "./types";

export function PersonFormModal({
  person,
  onClose,
  onSaved,
}: {
  person?: PersonDTO | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(person?.name ?? "");
  const [subGenres, setSubGenres] = useState(person?.subGenres.join(", ") ?? "");
  const [memo, setMemo] = useState(person?.memo ?? "");
  const [url, setUrl] = useState(person?.url ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("名前を入力してください");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const res = await fetch(person ? `/api/people/${person.id}` : "/api/people", {
        method: person ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: trimmedName,
          subGenres: subGenres.split(/[,\s\u3000\uFF0C]+/).filter(Boolean),
          memo: memo.trim() || null,
          url: url.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "保存に失敗しました");
        return;
      }
      onSaved();
      onClose();
    } catch {
      setError("保存に失敗しました");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-bold">{person ? "人物を編集" : "人物を登録"}</h2>
        <div className="mt-4 space-y-3">
          <label className="block">
            <span className="text-sm font-medium">名前 *</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium">サブジャンル（カンマ・空白区切り）</span>
            <input
              value={subGenres}
              onChange={(e) => setSubGenres(e.target.value)}
              placeholder="純文学, ミステリー"
              className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium">メモ</span>
            <textarea
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              rows={4}
              className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium">URL</span>
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com/profile"
              className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
            />
          </label>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-sm text-stone-600 hover:bg-stone-100"
            >
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
