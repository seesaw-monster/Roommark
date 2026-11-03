"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { EventCard } from "./EventCard";
import { EventFormModal } from "./EventFormModal";
import type { EventDTO } from "./types";

export function EventRoomClient({
  room,
}: {
  room: { name: string; icon: string | null };
}) {
  const [events, setEvents] = useState<EventDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<EventDTO | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await fetch("/api/events?scope=all", { cache: "no-store" });
    if (!res.ok) {
      setError("イベントの取得に失敗しました");
      setLoading(false);
      return;
    }
    const data = await res.json();
    setEvents(data.events as EventDTO[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function openCreate() {
    setEditing(null);
    setModalOpen(true);
  }

  function openEdit(event: EventDTO) {
    setEditing(event);
    setModalOpen(true);
  }

  async function remove(event: EventDTO) {
    if (!window.confirm(`「${event.title}」を削除しますか？`)) return;
    const res = await fetch(`/api/events/${event.id}`, { method: "DELETE" });
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
          {room.icon ?? "🎪"} {room.name}
        </h1>
        <button
          type="button"
          onClick={openCreate}
          className="rounded-lg bg-stone-900 px-4 py-2 text-sm text-white"
        >
          ＋ イベントを作成
        </button>
      </header>

      {loading ? (
        <p className="py-8 text-center text-sm text-stone-500">読み込み中…</p>
      ) : error ? (
        <p className="py-8 text-center text-sm text-red-600">{error}</p>
      ) : events.length === 0 ? (
        <p className="rounded-xl border border-dashed border-stone-300 py-12 text-center text-sm text-stone-500">
          まだイベントがありません。「＋ イベントを作成」から追加してください。
        </p>
      ) : (
        <div className="space-y-3">
          {events.map((event) => (
            <EventCard
              key={event.id}
              event={event}
              actions={
                <div className="flex flex-col gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => openEdit(event)}
                    className="text-stone-600 hover:underline"
                  >
                    編集
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(event)}
                    className="text-red-600 hover:underline"
                  >
                    削除
                  </button>
                </div>
              }
            />
          ))}
        </div>
      )}

      {modalOpen && (
        <EventFormModal
          key={editing?.id ?? "new"}
          event={editing}
          onClose={() => setModalOpen(false)}
          onSaved={load}
        />
      )}
    </main>
  );
}
