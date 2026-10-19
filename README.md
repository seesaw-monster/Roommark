# Roommark

A local web app that organizes bookmarks into rooms by genre.

## Getting Started

```sh
cp .env.example .env   # Only for the first time
pnpm install
pnpm db:setup          # Create SQLite + seed fixed Rooms (engineer/books/music)
pnpm dev               # http://localhost:3000
```

## Git hooks

`pnpm install` sets `core.hooksPath` to `.githooks`, so every clone uses the versioned hooks:

- `pre-commit` — runs the tests related to staged `.ts` / `.tsx` files
- `pre-push` — runs `pnpm typecheck` and `pnpm test`

For an existing clone, enable the hooks manually:

```sh
git config core.hooksPath .githooks
```

Skip a hook when necessary with `git commit --no-verify` or `git push --no-verify`.

## CI

GitHub Actions runs typecheck, test, and build on pushes to `main` and on pull requests (`.github/workflows/ci.yml`).
