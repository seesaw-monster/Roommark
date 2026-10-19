export type OgpResult = {
  title: string | null;
  description: string | null;
  ogImage: string | null;
  siteName: string | null;
};

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCharCode(Number(n)));
}

function pickMeta(html: string, attr: "property" | "name", key: string): string | null {
  const re = new RegExp(
    `<meta[^>]*${attr}\\s*=\\s*["']${key}["'][^>]*content\\s*=\\s*["']([^"']*)["'][^>]*>`,
    "i",
  );
  const m = html.match(re);
  if (m) return decodeEntities(m[1].trim()) || null;
  const re2 = new RegExp(
    `<meta[^>]*content\\s*=\\s*["']([^"']*)["'][^>]*${attr}\\s*=\\s*["']${key}["'][^>]*>`,
    "i",
  );
  const m2 = html.match(re2);
  return m2 ? decodeEntities(m2[1].trim()) || null : null;
}

export function extractOgp(html: string, baseUrl: string): OgpResult {
  const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  const ogTitle = pickMeta(html, "property", "og:title") ?? pickMeta(html, "name", "twitter:title");
  const description =
    pickMeta(html, "property", "og:description") ??
    pickMeta(html, "name", "description") ??
    pickMeta(html, "name", "twitter:description");
  const rawImage = pickMeta(html, "property", "og:image") ?? pickMeta(html, "name", "twitter:image");
  const siteName = pickMeta(html, "property", "og:site_name");

  let ogImage: string | null = null;
  if (rawImage) {
    try {
      ogImage = new URL(rawImage, baseUrl).toString();
    } catch {
      ogImage = null;
    }
  }

  return {
    title: ogTitle ?? (titleMatch ? decodeEntities(titleMatch[1].trim()) || null : null),
    description,
    ogImage,
    siteName,
  };
}

export async function fetchOgp(url: string): Promise<OgpResult> {
  const res = await fetch(url, {
    // Why not a headless browser: Phase 1 is a local app for personal scale; plain fetch keeps `pnpm dev` dependency-free.
    headers: { "user-agent": "Roommark/0.1 (+local bookmark app)" },
    redirect: "follow",
  });
  if (!res.ok) throw new Error(`fetch failed: ${res.status}`);
  const contentType = res.headers.get("content-type") ?? "";
  if (!/text\/html/i.test(contentType)) return { title: null, description: null, ogImage: null, siteName: null };
  const html = await res.text();
  return extractOgp(html, res.url || url);
}
