// scripts/create-user.ts
import "dotenv/config";                     // ← .env を自動ロード
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// Prisma の enum は実行時に参照しづらいので手動で定義
const ValidRoles = ["ADMIN", "EDITOR", "VIEWER"] as const;
type Role = (typeof ValidRoles)[number];

function genStrongPassword(length = 14) {
  const chars =
    "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*()-_=+";
  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

async function main() {
  const username = process.argv[2];                // 例: "Shirozu"
  const roleArg = (process.argv[3] || "EDITOR").toUpperCase();
  const role = (ValidRoles.includes(roleArg as Role) ? roleArg : "EDITOR") as Role;
  let plain = process.argv[4];                     // 未指定なら自動生成

  if (!username) {
    console.error(
      "Usage: npx tsx scripts/create-user.ts <username> [ADMIN|EDITOR|VIEWER] [password]"
    );
    process.exit(1);
  }

  if (!plain) plain = genStrongPassword();
  const passwordHash = await bcrypt.hash(plain, 10);

  // 既存有無チェック（上書き注意のメッセージ）
  const existing = await prisma.user.findUnique({ where: { username } });
  if (existing) {
    console.warn(
      `\n[WARN] username "${username}" は既に存在します。情報を上書きします（role/password/isActive=true）。\n`
    );
  }

  const user = await prisma.user.upsert({
    where: { username },
    create: { username, role, passwordHash, isActive: true },
    update: { role, passwordHash, isActive: true },
    select: { id: true, username: true, role: true, isActive: true },
  });

  console.log("✔ User ready");
  console.log("  username:", user.username);
  console.log("  role    :", user.role);
  console.log("  password:", plain, "  <-- 初回ログイン後に変更してください");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
