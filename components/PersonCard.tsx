"use client";

import type { PersonDTO } from "./types";

export function PersonCard({
  person,
  onEdit,
  onDelete,
}: {
  person: PersonDTO;
  onEdit: (person: PersonDTO) => void;
  onDelete: (person: PersonDTO) => void;
}) {
  return (
    <article className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="text-lg font-semibold">{person.name}</h3>
          {person.subGenres.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1.5 text-xs">
              {person.subGenres.map((subGenre) => (
                <span key={subGenre} className="rounded-full bg-stone-100 px-2 py-0.5 text-stone-700">
                  {subGenre}
                </span>
              ))}
            </div>
          )}
          {person.memo && <p className="mt-2 whitespace-pre-wrap text-sm text-stone-700">{person.memo}</p>}
          {person.url && (
            <a
              href={person.url}
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-block text-sm text-stone-700 underline"
            >
              リンク →
            </a>
          )}
        </div>
        <div className="flex shrink-0 flex-col gap-2 text-xs">
          <button type="button" onClick={() => onEdit(person)} className="text-stone-600 hover:underline">
            編集
          </button>
          <button type="button" onClick={() => onDelete(person)} className="text-red-600 hover:underline">
            削除
          </button>
        </div>
      </div>
      <p className="mt-3 text-xs text-stone-500">
        登録: {new Date(person.createdAt).toLocaleString("ja-JP")}
      </p>
    </article>
  );
}
