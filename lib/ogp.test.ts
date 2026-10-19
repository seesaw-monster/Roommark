import { afterEach, describe, expect, it, vi } from "vitest";
import { extractOgp, fetchOgp } from "./ogp";

describe("extractOgp", () => {
  it("og:title・og:description・og:image・og:site_nameを抽出する", () => {
    const html = `
      <html><head>
      <meta property="og:title" content="OGP Title">
      <meta property="og:description" content="OGP Desc">
      <meta property="og:image" content="https://example.com/img.png">
      <meta property="og:site_name" content="Example">
      <title>Fallback</title>
      </head></html>`;
    expect(extractOgp(html, "https://example.com/")).toEqual({
      title: "OGP Title",
      description: "OGP Desc",
      ogImage: "https://example.com/img.png",
      siteName: "Example",
    });
  });

  it("OGPが無い場合はtitleタグにフォールバックする", () => {
    const html = `<html><head><title> Hello </title></head></html>`;
    expect(extractOgp(html, "https://example.com/")).toEqual({
      title: "Hello",
      description: null,
      ogImage: null,
      siteName: null,
    });
  });

  it("descriptionはdescriptionメタ・twitter:descriptionも拾う", () => {
    const html = `<html><head><meta name="description" content="meta desc"></head></html>`;
    expect(extractOgp(html, "https://example.com/").description).toBe("meta desc");

    const twitter = `<html><head><meta name="twitter:description" content="tw desc"></head></html>`;
    expect(extractOgp(twitter, "https://example.com/").description).toBe("tw desc");
  });

  it("相対パスのog:imageを絶対URLに解決する", () => {
    const html = `<html><head><meta property="og:image" content="/img.png"></head></html>`;
    expect(extractOgp(html, "https://example.com/a/b").ogImage).toBe("https://example.com/img.png");
  });

  it("contentが先・属性が後のmeta順でも抽出できる", () => {
    const html = `<html><head><meta content="After Title" property="og:title"></head></html>`;
    expect(extractOgp(html, "https://example.com/").title).toBe("After Title");
  });

  it("HTMLエンティティをデコードする", () => {
    const html = `<html><head><title>a &amp; b &lt;c&gt;</title></head></html>`;
    expect(extractOgp(html, "https://example.com/").title).toBe("a & b <c>");
  });
});

describe("fetchOgp", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("HTMLレスポンスからOGPを返す", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        url: "https://example.com/page",
        headers: new Headers({ "content-type": "text/html; charset=utf-8" }),
        text: async () => `<html><head><title>T</title></head></html>`,
      })),
    );
    await expect(fetchOgp("https://example.com/page")).resolves.toMatchObject({ title: "T" });
  });

  it("HTMLでない場合は空のOGPを返す", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        url: "https://example.com/img.png",
        headers: new Headers({ "content-type": "image/png" }),
        text: async () => "",
      })),
    );
    await expect(fetchOgp("https://example.com/img.png")).resolves.toEqual({
      title: null,
      description: null,
      ogImage: null,
      siteName: null,
    });
  });

  it("非2xxは例外を投げる", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: false,
        status: 404,
        headers: new Headers(),
        text: async () => "",
      })),
    );
    await expect(fetchOgp("https://example.com/missing")).rejects.toThrow("fetch failed: 404");
  });
});
