import { prisma } from "@/lib/prisma";

const ROOMS = [
  { slug: "engineer", name: "エンジニア", icon: "💻", sortOrder: 0 },
  { slug: "book", name: "本", icon: "📚", sortOrder: 1 },
  { slug: "music", name: "音楽", icon: "🎵", sortOrder: 2 },
] as const;

const CATEGORIES: Record<string, { name: string; slug: string; sortOrder: number }[]> = {
  engineer: [
    { name: "技術記事", slug: "tech-article", sortOrder: 0 },
    { name: "LLMモデル", slug: "llm-model", sortOrder: 1 },
    { name: "ツール", slug: "tool", sortOrder: 2 },
    { name: "OSSリポジトリ", slug: "oss", sortOrder: 3 },
  ],
  book: [],
  music: [],
};

export async function main() {
  for (const r of ROOMS) {
    const room = await prisma.room.upsert({
      where: { slug: r.slug },
      update: { name: r.name, icon: r.icon, sortOrder: r.sortOrder },
      create: { slug: r.slug, name: r.name, icon: r.icon, sortOrder: r.sortOrder },
    });
    for (const c of CATEGORIES[r.slug] ?? []) {
      await prisma.category.upsert({
        where: { roomId_slug: { roomId: room.id, slug: c.slug } },
        update: { name: c.name, sortOrder: c.sortOrder },
        create: { roomId: room.id, name: c.name, slug: c.slug, sortOrder: c.sortOrder },
      });
    }
  }
  console.log("seed: fixed rooms ensured (engineer/book/music)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
