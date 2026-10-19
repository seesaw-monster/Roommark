import { prisma } from "./prisma";

export const FIXED_ROOM_SLUGS = ["engineer", "book", "music"] as const;
export type FixedRoomSlug = (typeof FIXED_ROOM_SLUGS)[number];

export async function getRooms() {
  return prisma.room.findMany({
    orderBy: { sortOrder: "asc" },
    include: { categories: { orderBy: { sortOrder: "asc" } } },
  });
}

export async function getRoomBySlug(slug: string) {
  return prisma.room.findUnique({
    where: { slug },
    include: { categories: { orderBy: { sortOrder: "asc" } } },
  });
}
