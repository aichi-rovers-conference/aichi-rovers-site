// app/layout.tsx
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { headers } from "next/headers";
import Script from "next/script";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ARC Web",
  description: "愛知ローバース会議の公式Webサイトです",
  icons: {
    // PC向け（同一デザイン）
    icon: [
      { url: "/favicon.ico" }, // あるなら
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
    ],
    // iOS Safari（スマホのタブ/ホーム追加で参照）→ PCと同じ画像にする
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
    // 任意（Safari ピン留め）
    other: [{ rel: "mask-icon", url: "/safari-pinned-tab.svg", color: "#000000" }],
  },
  // PWA を使っているなら manifest も同じ画像へ
  manifest: "/site.webmanifest",
};

// async にして headers() を await
export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const hdrs = await headers();
  const nonce = hdrs.get("x-csp-nonce") ?? undefined;

  return (
    <html lang="ja">
      <head>
        {/*
          もし自前のインライン <script> を使うなら nonce を必ず付与してください。
          例:
        */}
        {/* <Script id="boot" nonce={nonce} strategy="beforeInteractive">
          {`window.__ARC__ = { version: 1 };`}
        </Script> */}
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
