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
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https:", // devはevalやinlineが混じるため観測用に許可
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
  eslint: {
    // ✅ Vercel の build 中は ESLint エラーで落とさない
    ignoreDuringBuilds: true,
  },
  // 型エラーで落ちる場合の一時対応（必要な時だけコメントアウト解除）
  // typescript: { ignoreBuildErrors: true },

  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          ...securityHeaders,
          // 開発時のみ、壊さない観測用の Report-Only を付与（本番は middleware で厳格CSPを付与）
          ...(isProd
            ? []
            : [{ key: "Content-Security-Policy-Report-Only", value: devReportOnlyCsp }]),
        ],
      },
    ];
  },
};

export default nextConfig;
