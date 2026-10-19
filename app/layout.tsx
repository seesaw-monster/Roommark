import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Roommark",
  description: "ジャンルごとに部屋を分けてブックマークするローカルアプリ",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body className="min-h-screen bg-stone-100 text-stone-900 antialiased">
        <div className="mx-auto max-w-4xl px-4 py-6">{children}</div>
      </body>
    </html>
  );
}
