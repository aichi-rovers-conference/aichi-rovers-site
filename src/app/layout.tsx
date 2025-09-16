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

export const metadata = {
  title: "ARC Web",
  description: "愛知ローバース会議の公式Webサイトです",
  icons: {
    icon: "/icon.png", // PCのファビコン
    apple: [
      { url: "/icon.png", sizes: "180x180" }, // iOS Safari 用にも同じを指示
    ],
  },
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
