import { notFound } from "next/navigation";
import { getRoomBySlug } from "@/lib/rooms";
import { RoomClient } from "@/components/RoomClient";

export default async function RoomPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const room = await getRoomBySlug(slug);
  if (!room) notFound();
  return <RoomClient slug={slug} />;
}
