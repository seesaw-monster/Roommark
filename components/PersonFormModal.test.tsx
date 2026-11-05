// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { PersonFormModal } from "./PersonFormModal";
import type { PersonDTO } from "./types";

const existingPerson: PersonDTO = {
  id: "p1",
  roomId: "person-room",
  name: "夏目漱石",
  subGenres: ["純文学"],
  memo: "好きな作家",
  url: "https://example.com/authors/natsume",
  createdAt: "2026-11-04T00:00:00.000Z",
  updatedAt: "2026-11-04T00:00:00.000Z",
};

function renderModal(person?: PersonDTO) {
  const onClose = vi.fn();
  const onSaved = vi.fn();
  render(
    <PersonFormModal person={person} onClose={onClose} onSaved={onSaved} />,
  );
  return { onClose, onSaved };
}

function stubFetch() {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({}),
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("PersonFormModal", () => {
  it("creates a person with only a name", async () => {
    const fetchMock = stubFetch();
    const { onSaved, onClose } = renderModal();

    fireEvent.change(screen.getByLabelText(/名前/), {
      target: { value: "  夏目漱石  " },
    });
    fireEvent.click(screen.getByRole("button", { name: "保存" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/people",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "夏目漱石",
          subGenres: [],
          memo: null,
          url: null,
        }),
      }),
    );
    await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("submits subgenres and URL", async () => {
    const fetchMock = stubFetch();
    renderModal();

    fireEvent.change(screen.getByLabelText(/名前/), {
      target: { value: "夏目漱石" },
    });
    fireEvent.change(screen.getByLabelText(/サブジャンル/), {
      target: { value: "純文学, ミステリー" },
    });
    fireEvent.change(screen.getByLabelText(/メモ/), {
      target: { value: "  好きな作家  " },
    });
    fireEvent.change(screen.getByLabelText(/URL/), {
      target: { value: "  https://example.com/authors/natsume  " },
    });
    fireEvent.click(screen.getByRole("button", { name: "保存" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
      name: "夏目漱石",
      subGenres: ["純文学", "ミステリー"],
      memo: "好きな作家",
      url: "https://example.com/authors/natsume",
    });
  });

  it("shows an error and does not submit when the name is empty", () => {
    const fetchMock = stubFetch();
    renderModal();

    fireEvent.click(screen.getByRole("button", { name: "保存" }));

    expect(screen.getByText("名前を入力してください")).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("shows existing values and updates with PATCH in edit mode", async () => {
    const fetchMock = stubFetch();
    renderModal(existingPerson);

    expect((screen.getByLabelText(/名前/) as HTMLInputElement).value).toBe("夏目漱石");
    expect((screen.getByLabelText(/サブジャンル/) as HTMLInputElement).value).toBe("純文学");
    expect((screen.getByLabelText(/メモ/) as HTMLTextAreaElement).value).toBe("好きな作家");
    expect((screen.getByLabelText(/URL/) as HTMLInputElement).value).toBe(
      "https://example.com/authors/natsume",
    );

    fireEvent.change(screen.getByLabelText(/名前/), {
      target: { value: "新しい名前" },
    });
    fireEvent.click(screen.getByRole("button", { name: "保存" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/people/p1",
      expect.objectContaining({ method: "PATCH" }),
    );
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).name).toBe("新しい名前");
  });
});
