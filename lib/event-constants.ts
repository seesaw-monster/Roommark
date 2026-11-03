export const EVENT_KINDS = ["live", "exhibition", "other"] as const;

export type EventKind = (typeof EVENT_KINDS)[number];

export const EVENT_KIND_LABELS: Record<EventKind, string> = {
  live: "ライブ",
  exhibition: "展示",
  other: "その他",
};

export type EventStatus = "ongoing" | "upcoming" | "past";

export type TicketStatus = "before" | "onSale" | "ended";
