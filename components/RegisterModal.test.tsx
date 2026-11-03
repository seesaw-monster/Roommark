// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { RegisterModal } from "./RegisterModal";
import type { RoomInfo } from "./types";

const room: RoomInfo = {
  id: "r1",
  slug: "engineer",
  name: "エンジニア",
  icon: "💻",
  bookmarkCount: 0,
  categories: [],
};

const ogpResponse = {
  url: "https://example.com/",
  title: "Example Title",
  description: null,
  ogImage: null,
  siteName: null,
};

function renderModal() {
  return render(<RegisterModal room={room} onClose={vi.fn()} onCreated={vi.fn()} />);
}

function urlInput() {
  return screen.getByPlaceholderText("https://example.com/article");
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("RegisterModal URL Enter behavior", () => {
  it("starts fetching after pressing Enter in the URL field", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ogpResponse,
    });
    vi.stubGlobal("fetch", fetchMock);
    renderModal();

    fireEvent.change(urlInput(), { target: { value: "https://example.com/" } });
    fireEvent.keyDown(urlInput(), { key: "Enter" });

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(fetchMock).toHaveBeenCalledWith("/api/ogp?url=https%3A%2F%2Fexample.com%2F");
    await waitFor(() => expect(screen.getByDisplayValue("Example Title")).toBeTruthy());
  });

  it("does not fetch for keys other than Enter", () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    renderModal();

    fireEvent.change(urlInput(), { target: { value: "https://example.com/" } });
    fireEvent.keyDown(urlInput(), { key: "a" });

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("does not fetch on Enter used to confirm IME composition", () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    renderModal();

    fireEvent.change(urlInput(), { target: { value: "https://example.com/" } });
    fireEvent.keyDown(urlInput(), { key: "Enter", isComposing: true });

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("shows an error when pressing Enter with an empty URL", () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    renderModal();

    fireEvent.keyDown(urlInput(), { key: "Enter" });

    expect(fetchMock).not.toHaveBeenCalled();
    expect(screen.getByText("URLを入力してください")).toBeTruthy();
  });

  it("does not send duplicate requests when Enter is pressed repeatedly while fetching", async () => {
    let resolveFetch: (value: unknown) => void = () => {};
    const pending = new Promise((resolve) => {
      resolveFetch = resolve;
    });
    const fetchMock = vi.fn().mockReturnValue(pending);
    vi.stubGlobal("fetch", fetchMock);
    renderModal();

    fireEvent.change(urlInput(), { target: { value: "https://example.com/" } });
    fireEvent.keyDown(urlInput(), { key: "Enter" });

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.getByRole("button", { name: "取得中…" })).toBeTruthy());

    fireEvent.keyDown(urlInput(), { key: "Enter" });

    expect(fetchMock).toHaveBeenCalledTimes(1);

    resolveFetch({ ok: true, json: async () => ogpResponse });
    await waitFor(() => expect(screen.getByDisplayValue("Example Title")).toBeTruthy());
  });

  it("shows an error when automatic fetching fails", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false });
    vi.stubGlobal("fetch", fetchMock);
    renderModal();

    fireEvent.change(urlInput(), { target: { value: "https://example.com/" } });
    fireEvent.keyDown(urlInput(), { key: "Enter" });

    await waitFor(() =>
      expect(screen.getByText("タイトルの自動取得に失敗しました。手入力で保存できます")).toBeTruthy(),
    );
  });

  it("starts fetching with the existing fetch button", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ogpResponse,
    });
    vi.stubGlobal("fetch", fetchMock);
    renderModal();

    fireEvent.change(urlInput(), { target: { value: "https://example.com/" } });
    fireEvent.click(screen.getByRole("button", { name: "自動取得" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
  });
});
