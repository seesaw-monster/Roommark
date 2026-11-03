import { notFound } from "next/navigation";
import { EVENT_ROOM_SLUG, getRoomBySlug } from "@/lib/rooms";
import { EventRoomClient } from "@/components/EventRoomClient";
import { RoomClient } from "@/components/RoomClient";

export default async function RoomPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const room = await getRoomBySlug(slug);
  if (!room) notFound();
  if (slug === EVENT_ROOM_SLUG) {
    return <EventRoomClient room={{ name: room.name, icon: room.icon }} />;
  }
  return <RoomClient slug={slug} />;
}
