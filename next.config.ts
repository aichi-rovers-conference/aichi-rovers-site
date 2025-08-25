// next.config.ts
import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";

// 共通セキュリティヘッダ（CSPはmiddlewareで本番付与）
const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" }, // クリックジャッキング対策
  { key: "X-Content-Type-Options", value: "nosniff" }, // MIMEスニッフィング抑止
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
];

// 開発時のみ「壊さない観測用」CSP-Report-Only（最低限）
const devReportOnlyCsp = [
  "default-src 'self'",
  // devはevalやinlineが混じるため観測用に許可
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https:",
  "style-src 'self' 'unsafe-inline' https:",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data: https:",
  "connect-src 'self' https: wss:",
  "media-src 'self' blob: https:",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'self'",
  "upgrade-insecure-requests",
].join("; ");

const nextConfig: NextConfig = {
  // build安定化
  eslint: { ignoreDuringBuilds: true },
  // typescript: { ignoreBuildErrors: true }, // 必要時のみ一時的に

  // 画像最適化のリモート許可
  images: {
    // Vercel Blob（公開バケット）のドメインを許可
    remotePatterns: [
      { protocol: "https", hostname: "**.vercel-storage.com" },
      // 他のCDN/ストレージを使うならここに追加:
      // { protocol: "https", hostname: "dxxxxx.cloudfront.net" },
      // { protocol: "https", hostname: "bucket.s3.ap-northeast-1.amazonaws.com" },
    ],
    // WebP/AVIF を優先（任意）
    formats: ["image/avif", "image/webp"],
  },

  // 推奨（セキュリティ上のノイズ削減）
  poweredByHeader: false,

  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          ...securityHeaders,
          // 開発時のみ、壊さない観測用の Report-Only を付与
          ...(isProd ? [] : [{ key: "Content-Security-Policy-Report-Only", value: devReportOnlyCsp }]),
        ],
      },
    ];
  },
};

export default nextConfig;
