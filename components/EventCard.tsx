import type { ReactNode } from "react";
import { EVENT_KIND_LABELS } from "@/lib/event-constants";
import type { EventDTO } from "./types";

const STATUS_LABELS = {
  ongoing: "開催中",
  upcoming: "近日開催",
  past: "終了",
} as const;

const STATUS_CLASSES = {
  ongoing: "bg-emerald-100 text-emerald-800",
  upcoming: "bg-blue-100 text-blue-700",
  past: "bg-stone-200 text-stone-600",
} as const;

const TICKET_LABELS = {
  before: "販売前",
  onSale: "販売中",
  ended: "販売終了",
} as const;

const TICKET_CLASSES = {
  before: "bg-amber-100 text-amber-800",
  onSale: "bg-emerald-100 text-emerald-800",
  ended: "bg-stone-200 text-stone-600",
} as const;

function formatDateTime(date: string, time: string | null): string {
  const [year, month, day] = date.split("-");
  const formattedDate = `${year}/${month}/${day}`;
  return time ? `${formattedDate} ${time}` : formattedDate;
}

function formatSchedule(event: EventDTO): string {
  const start = formatDateTime(event.startDate, event.startTime);
  const end = formatDateTime(event.endDate, event.endTime);
  return start === end ? start : `${start} 〜 ${end}`;
}

export function EventCard({
  event,
  actions,
}: {
  event: EventDTO;
  actions?: ReactNode;
}) {
  return (
    <article className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
      <div className="flex items-start gap-3">
        {event.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={event.imageUrl}
            alt=""
            className="h-24 w-24 shrink-0 rounded-lg object-cover"
          />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="rounded-full bg-stone-900 px-2 py-0.5 text-white">
              {EVENT_KIND_LABELS[event.kind]}
            </span>
            <span className={`rounded-full px-2 py-0.5 ${STATUS_CLASSES[event.status]}`}>
              {STATUS_LABELS[event.status]}
            </span>
            {event.ticketStatus && (
              <span
                className={`rounded-full px-2 py-0.5 ${TICKET_CLASSES[event.ticketStatus]}`}
              >
                {TICKET_LABELS[event.ticketStatus]}
              </span>
            )}
          </div>
          <h3 className="mt-1 truncate text-lg font-semibold">{event.title}</h3>
          <p className="mt-1 text-sm text-stone-600">{formatSchedule(event)}</p>
          {event.venue && (
            <p className="mt-0.5 text-sm text-stone-500">{event.venue}</p>
          )}
          {event.eventUrl && (
            <a
              href={event.eventUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-1 inline-block text-sm text-stone-700 underline"
            >
              イベント詳細 →
            </a>
          )}
        </div>
        {actions && <div className="shrink-0">{actions}</div>}
      </div>
    </article>
  );
}
