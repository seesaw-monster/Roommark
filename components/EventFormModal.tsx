"use client";

import { useState } from "react";
import { EVENT_KINDS, EVENT_KIND_LABELS } from "@/lib/event-constants";
import type { EventDTO, EventKind } from "./types";

function todayString(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
    now.getDate(),
  ).padStart(2, "0")}`;
}

function addHour(time: string): { time: string; nextDay: boolean } {
  const [hour, minute] = time.split(":").map(Number);
  const totalMinutes = hour * 60 + minute + 60;
  return {
    time: `${String(Math.floor((totalMinutes % (24 * 60)) / 60)).padStart(2, "0")}:${String(
      totalMinutes % 60,
    ).padStart(2, "0")}`,
    nextDay: totalMinutes >= 24 * 60,
  };
}

function addDays(date: string, days: number): string {
  const [year, month, day] = date.split("-").map(Number);
  const next = new Date(Date.UTC(year, month - 1, day + days));
  return `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, "0")}-${String(
    next.getUTCDate(),
  ).padStart(2, "0")}`;
}

export function EventFormModal({
  event,
  onClose,
  onSaved,
}: {
  event?: EventDTO | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const initialDate = todayString();
  const [kind, setKind] = useState<EventKind>(event?.kind ?? "live");
  const [title, setTitle] = useState(event?.title ?? "");
  const [startDate, setStartDate] = useState(event?.startDate ?? initialDate);
  const [startTime, setStartTime] = useState(event?.startTime ?? "");
  const [endDate, setEndDate] = useState(
    event?.endDate ?? event?.startDate ?? initialDate,
  );
  const [endTime, setEndTime] = useState(event?.endTime ?? "");
  const [venue, setVenue] = useState(event?.venue ?? "");
  const [imageUrl, setImageUrl] = useState(event?.imageUrl ?? "");
  const [eventUrl, setEventUrl] = useState(event?.eventUrl ?? "");
  const [ticketStartDate, setTicketStartDate] = useState(
    event?.ticketStartDate ?? "",
  );
  const [ticketStartTime, setTicketStartTime] = useState(
    event?.ticketStartTime ?? "",
  );
  const [ticketEndDate, setTicketEndDate] = useState(event?.ticketEndDate ?? "");
  const [ticketEndTime, setTicketEndTime] = useState(event?.ticketEndTime ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function validate(): string | null {
    if (!title.trim()) return "イベント名を入力してください";
    if (!startDate || !endDate) return "日程を入力してください";
    if (endDate < startDate) return "終了日は開始日以降にしてください";
    if ((startTime && !endTime) || (!startTime && endTime)) {
      return "開始時刻と終了時刻は両方指定してください";
    }
    if (startDate === endDate && startTime && endTime && startTime > endTime) {
      return "開始時刻は終了時刻以前にしてください";
    }
    if (Boolean(ticketStartDate) !== Boolean(ticketEndDate)) {
      return "チケット期間は開始日と終了日を両方指定してください";
    }
    if (ticketStartDate && ticketEndDate) {
      if (ticketEndDate < ticketStartDate) {
        return "チケット終了日は開始日以降にしてください";
      }
      if (Boolean(ticketStartTime) !== Boolean(ticketEndTime)) {
        return "チケット開始時刻と終了時刻は両方指定してください";
      }
      if (
        ticketStartDate === ticketEndDate &&
        ticketStartTime &&
        ticketEndTime &&
        ticketStartTime > ticketEndTime
      ) {
        return "チケット開始時刻は終了時刻以前にしてください";
      }
    } else if (ticketStartTime || ticketEndTime) {
      return "チケット時刻はチケット期間と一緒に指定してください";
    }
    return null;
  }

  function handleStartDateChange(value: string) {
    setStartDate(value);
    if (!value) {
      setEndDate(value);
      return;
    }
    setEndDate(
      startTime && endTime && endTime < startTime ? addDays(value, 1) : value,
    );
  }

  function handleStartTimeChange(value: string) {
    setStartTime(value);
    if (!value) {
      setEndTime("");
      return;
    }
    const next = addHour(value);
    setEndTime(next.time);
    if (next.nextDay && endDate === startDate) {
      setEndDate(addDays(startDate, 1));
    }
  }

  async function handleSave() {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const res = await fetch(event ? `/api/events/${event.id}` : "/api/events", {
        method: event ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind,
          title: title.trim(),
          startDate,
          startTime: startTime || null,
          endDate,
          endTime: endTime || null,
          venue: venue.trim() || null,
          imageUrl: imageUrl.trim() || null,
          eventUrl: eventUrl.trim() || null,
          ticketStartDate: ticketStartDate || null,
          ticketStartTime: ticketStartTime || null,
          ticketEndDate: ticketEndDate || null,
          ticketEndTime: ticketEndTime || null,
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
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-bold">
          {event ? "イベントを編集" : "イベントを作成"}
        </h2>
        <div className="mt-4 space-y-3">
          <label className="block">
            <span className="text-sm font-medium">イベント名 *</span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium">種別 *</span>
            <div className="relative mt-1">
              <select
                value={kind}
                onChange={(e) => setKind(e.target.value as EventKind)}
                className="w-full appearance-none rounded-lg border border-stone-300 bg-white py-2 pl-3 pr-9 text-sm"
              >
                {EVENT_KINDS.map((value) => (
                  <option key={value} value={value}>
                    {EVENT_KIND_LABELS[value]}
                  </option>
                ))}
              </select>
              <svg
                aria-hidden="true"
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-500"
              >
                <path d="M4 6l4 4 4-4" />
              </svg>
            </div>
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="text-sm font-medium">開始日 *</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => handleStartDateChange(e.target.value)}
                className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium">開始時刻</span>
              <input
                type="time"
                value={startTime}
                onChange={(e) => handleStartTimeChange(e.target.value)}
                className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium">終了日 *</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium">終了時刻</span>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
              />
            </label>
          </div>

          <label className="block">
            <span className="text-sm font-medium">場所</span>
            <input
              value={venue}
              onChange={(e) => setVenue(e.target.value)}
              className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium">画像URL</span>
            <input
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://example.com/poster.png"
              className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium">イベントURL</span>
            <input
              value={eventUrl}
              onChange={(e) => setEventUrl(e.target.value)}
              placeholder="https://example.com/event"
              className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
            />
          </label>
          {imageUrl.trim() && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imageUrl.trim()}
              alt=""
              className="max-h-40 rounded-lg object-cover"
            />
          )}

          <div>
            <p className="text-sm font-medium">チケット購入可能期間</p>
            <p className="mt-0.5 text-xs text-stone-500">
              未入力の場合はチケット期間なしとして扱います。
            </p>
            <div className="mt-2 grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="text-xs text-stone-600">販売開始日</span>
                <input
                  type="date"
                  value={ticketStartDate}
                  onChange={(e) => setTicketStartDate(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
                />
              </label>
              <label className="block">
                <span className="text-xs text-stone-600">販売開始時刻</span>
                <input
                  type="time"
                  value={ticketStartTime}
                  onChange={(e) => setTicketStartTime(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
                />
              </label>
              <label className="block">
                <span className="text-xs text-stone-600">販売終了日</span>
                <input
                  type="date"
                  value={ticketEndDate}
                  onChange={(e) => setTicketEndDate(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
                />
              </label>
              <label className="block">
                <span className="text-xs text-stone-600">販売終了時刻</span>
                <input
                  type="time"
                  value={ticketEndTime}
                  onChange={(e) => setTicketEndTime(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
                />
              </label>
            </div>
          </div>

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
