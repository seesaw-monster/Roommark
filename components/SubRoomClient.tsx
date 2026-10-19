"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BookmarkListClient } from "@/components/RoomClient";
import type { RoomInfo } from "@/components/types";

export function SubRoomClient({ slug, categorySlug }: { slug: string; categorySlug: string }) {
  const [room, setRoom] = useState<RoomInfo | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch("/api/rooms").then(async (res) => {
      if (res.ok) {
        const data = await res.json();
        setRoom((data.rooms as RoomInfo[]).find((r) => r.slug === slug) ?? null);
      }
      setLoaded(true);
    });
  }, [slug]);

  const category = room?.categories.find((c) => c.slug === categorySlug);

  if (!loaded || !room || !category) {
    return (
      <main>
        <nav className="mb-4 text-sm text-stone-500">
          <Link href={`/rooms/${slug}`} className="hover:underline">← 部屋に戻る</Link>
        </nav>
        <p className="py-8 text-center text-sm text-stone-500">
          {loaded ? "小部屋が見つかりません" : "読み込み中…"}
        </p>
      </main>
    );
  }

  return (
    <BookmarkListClient
      slug={slug}
      room={room}
      fixedCategorySlug={category.slug}
      headerTitle={`${room.icon} ${room.name} / ${category.name}`}
      backHref={`/rooms/${slug}`}
      backLabel={`← ${room.name}（小部屋一覧）`}
    />
  );
}
