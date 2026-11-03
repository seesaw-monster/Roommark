import Link from "next/link";
import { EventCard } from "./EventCard";
import type { EventDTO } from "./types";

export function EventSection({ events }: { events: EventDTO[] }) {
  if (events.length === 0) return null;

  return (
    <section className="mb-8">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-xl font-bold">開催中・直近のイベント</h2>
        <Link href="/rooms/event" className="text-sm text-stone-600 hover:underline">
          イベントを管理 →
        </Link>
      </div>
      <div className="space-y-3">
        {events.map((event) => (
          <EventCard key={event.id} event={event} />
        ))}
      </div>
    </section>
  );
}
