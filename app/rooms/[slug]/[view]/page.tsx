import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getRoomBySlug } from "@/lib/rooms";
import { DetailClient } from "@/components/DetailClient";
import { SubRoomClient } from "@/components/SubRoomClient";

export default async function RoomViewPage({
  params,
}: {
  params: Promise<{ slug: string; view: string }>;
}) {
  const { slug, view } = await params;
  const room = await getRoomBySlug(slug);
  if (!room) notFound();

  // Why not separate routes: category slugs are fixed per room and never collide with cuid ids,
  // so a single [view] segment keeps sub-room URLs short (/rooms/engineer/tech-article).
  if (room.categories.some((c) => c.slug === view)) {
    return <SubRoomClient slug={slug} categorySlug={view} />;
  }

  const bookmark = await prisma.bookmark.findUnique({ where: { id: view } });
  if (!bookmark || bookmark.roomId !== room.id) notFound();
  return <DetailClient roomSlug={slug} id={view} />;
}
