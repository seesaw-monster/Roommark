import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getRooms } from "@/lib/rooms";

export async function GET() {
  const [rooms, roomCounts, categoryCounts] = await Promise.all([
    getRooms(),
    prisma.bookmark.groupBy({ by: ["roomId"], _count: true }),
    prisma.bookmark.groupBy({ by: ["categoryId"], _count: true, where: { categoryId: { not: null } } }),
  ]);
  const roomCountMap = new Map(roomCounts.map((r) => [r.roomId, r._count]));
  const categoryCountMap = new Map(
    categoryCounts.map((c) => [c.categoryId as string, c._count]),
  );
  return NextResponse.json({
    rooms: rooms.map((r) => ({
      id: r.id,
      slug: r.slug,
      name: r.name,
      icon: r.icon,
      bookmarkCount: roomCountMap.get(r.id) ?? 0,
      categories: r.categories.map((c) => ({
        id: c.id,
        slug: c.slug,
        name: c.name,
        bookmarkCount: categoryCountMap.get(c.id) ?? 0,
      })),
    })),
  });
}
