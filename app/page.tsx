import Link from "next/link";
import { getRooms } from "@/lib/rooms";

export default async function Home() {
  const rooms = await getRooms();
  return (
    <main>
      <header className="mb-8 text-center">
        <h1 className="text-3xl font-bold tracking-tight">Roommark</h1>
        <p className="mt-2 text-sm text-stone-600">
          入りたい部屋を選ぶ。異なるジャンルは混ぜて表示しない。
        </p>
      </header>
      <div className="grid gap-4 sm:grid-cols-3">
        {rooms.map((room) => (
          <Link
            key={room.slug}
            href={`/rooms/${room.slug}`}
            className="rounded-2xl border border-stone-200 bg-white p-6 text-center shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="text-5xl">{room.icon ?? "🚪"}</div>
            <div className="mt-3 text-lg font-semibold">{room.name}</div>
            <div className="mt-1 text-xs text-stone-500">/{room.slug}</div>
          </Link>
        ))}
      </div>
      {rooms.length === 0 && (
        <p className="mt-8 text-center text-sm text-stone-500">
          Roomがありません。<code className="rounded bg-stone-200 px-1">pnpm db:setup</code> で固定Roomを作成してください。
        </p>
      )}
    </main>
  );
}
