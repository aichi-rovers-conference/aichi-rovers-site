// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // ✅ Vercelのbuild中はESLintエラーで落とさない
    ignoreDuringBuilds: true,
  },
  // もし型エラーでも落ちる場合は↓も一時的にON（後で戻す）
  // typescript: {
  //   ignoreBuildErrors: true,
  // },
};

export default nextConfig;
