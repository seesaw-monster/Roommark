"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { PersonCard } from "./PersonCard";
import { PersonFormModal } from "./PersonFormModal";
import type { PersonDTO, SubGenreCount } from "./types";

type SortKey = "name" | "new" | "updated";

export function PersonRoomClient({
  room,
}: {
  room: { name: string; icon: string | null };
}) {
  const [people, setPeople] = useState<PersonDTO[]>([]);
  const [subGenres, setSubGenres] = useState<SubGenreCount[]>([]);
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [activeSubGenre, setActiveSubGenre] = useState("");
  const [sort, setSort] = useState<SortKey>("new");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<PersonDTO | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQ(q.trim()), 300);
    return () => clearTimeout(timer);
  }, [q]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    if (debouncedQ) params.set("q", debouncedQ);
    if (activeSubGenre) params.set("subGenre", activeSubGenre);
    params.set("sort", sort);

    const res = await fetch(`/api/people?${params.toString()}`, { cache: "no-store" });
    if (!res.ok) {
      setError("人物の取得に失敗しました");
      setLoading(false);
      return;
    }
    const data = await res.json();
    setPeople(data.people as PersonDTO[]);
    setSubGenres(data.subGenres as SubGenreCount[]);
    setLoading(false);
  }, [debouncedQ, activeSubGenre, sort]);

  useEffect(() => {
    load();
  }, [load]);

  function openCreate() {
    setEditing(null);
    setModalOpen(true);
  }

  function openEdit(person: PersonDTO) {
    setEditing(person);
    setModalOpen(true);
  }

  async function remove(person: PersonDTO) {
    if (!window.confirm(`「${person.name}」を削除しますか？`)) return;
    const res = await fetch(`/api/people/${person.id}`, { method: "DELETE" });
    if (res.ok) load();
  }

  return (
    <main>
      <nav className="mb-4 text-sm text-stone-500">
        <Link href="/" className="hover:underline">
          ← 玄関（Room一覧）
        </Link>
      </nav>
      <header className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">
          {room.icon ?? "👤"} {room.name}
        </h1>
        <button
          type="button"
          onClick={openCreate}
          className="rounded-lg bg-stone-900 px-4 py-2 text-sm text-white"
        >
          ＋ 人物を登録
        </button>
      </header>

      <div className="mb-4 space-y-2 rounded-xl border border-stone-200 bg-white p-3">
        <div className="flex flex-wrap gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="キーワード検索（名前・メモ）"
            className="min-w-52 flex-1 rounded-lg border border-stone-300 px-3 py-1.5 text-sm"
          />
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm"
          >
            <option value="new">新着順</option>
            <option value="updated">更新順</option>
            <option value="name">名前順</option>
          </select>
        </div>
        {subGenres.length > 0 && (
          <div className="flex flex-wrap gap-1.5 text-xs">
            {activeSubGenre && (
              <button
                type="button"
                onClick={() => setActiveSubGenre("")}
                className="rounded-full bg-red-100 px-2.5 py-1 text-red-700"
              >
                {activeSubGenre} を解除 ✕
              </button>
            )}
            {subGenres.map((subGenre) => (
              <button
                key={subGenre.name}
                type="button"
                onClick={() =>
                  setActiveSubGenre(activeSubGenre === subGenre.name ? "" : subGenre.name)
                }
                className={`rounded-full px-2.5 py-1 ${
                  activeSubGenre === subGenre.name
                    ? "bg-stone-900 text-white"
                    : "bg-stone-100 text-stone-600"
                }`}
              >
                {subGenre.name} ({subGenre.count})
              </button>
            ))}
          </div>
        )}
      </div>

      {loading ? (
        <p className="py-8 text-center text-sm text-stone-500">読み込み中…</p>
      ) : error ? (
        <p className="py-8 text-center text-sm text-red-600">{error}</p>
      ) : people.length === 0 ? (
        <p className="rounded-xl border border-dashed border-stone-300 py-12 text-center text-sm text-stone-500">
          まだ人物が登録されていません。「＋ 人物を登録」から追加してください。
        </p>
      ) : (
        <div className="space-y-3">
          {people.map((person) => (
            <PersonCard
              key={person.id}
              person={person}
              onEdit={openEdit}
              onDelete={remove}
            />
          ))}
        </div>
      )}

      {modalOpen && (
        <PersonFormModal
          key={editing?.id ?? "new"}
          person={editing}
          onClose={() => setModalOpen(false)}
          onSaved={load}
        />
      )}
    </main>
  );
}
