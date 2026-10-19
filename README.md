# Roommark

A local web app that organizes bookmarks into rooms by genre.

## Getting Started

```sh
cp .env.example .env   # Only for the first time
pnpm install
pnpm db:setup          # Create SQLite + seed fixed Rooms (engineer/books/music)
pnpm dev               # http://localhost:3000
```
