// lib/prisma.ts
import { PrismaClient } from "@prisma/client";

/**
 * Next.js の開発環境でホットリロード時に PrismaClient を新規生成し続けないよう
 * globalThis にキャッシュします。
 */
const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    // 必要に応じてログを調整
    log: ["error", "warn"], // "query" を足すと全クエリが出ます
  });

// 開発環境ではキャッシュして複数インスタンス生成を防ぐ
if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

// どちらの書き方にも対応
export default prisma;
export { prisma };
