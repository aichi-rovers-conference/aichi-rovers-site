// app/api/calendar/recruitings/route.ts
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import prisma from "@/lib/prisma";
import { verifyToken, COOKIE_NAME } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type Session = {
  id: number;
  username: string;
  role: "ADMIN" | "EDITOR" | "VIEWER";
  isSuper?: boolean;
  isActive?: boolean;
};

async function getSession(): Promise<Session | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE_NAME)?.value ?? "";
  const s = token ? await verifyToken(token) : null;
  return s ? (s as Session) : null;
}

// "2025-09-01" → Date("2025-09-01T00:00:00+09:00")
function jstDateOnly(s: string): Date {
  const t = String(s ?? "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(t)) throw new Error("不正な日付形式です（YYYY-MM-DD）");
  return new Date(`${t}T00:00:00+09:00`);
}

// 今日(JST)の00:00
function jstToday00(): Date {
  const now = Date.now();
  const jst = new Date(now + 9 * 60 * 60 * 1000); // JST=UTC+9
  const y = jst.getUTCFullYear();
  const m = String(jst.getUTCMonth() + 1).padStart(2, "0");
  const d = String(jst.getUTCDate()).padStart(2, "0");
  return new Date(`${y}-${m}-${d}T00:00:00+09:00`);
}

export async function GET(req: NextRequest) {
  const me = await getSession(); // ログインしていれば取得
  const url = new URL(req.url);
  const includeUnpublished = url.searchParams.get("all") === "1"; // 明示指定
  const where: any = {};

  if (me?.role === "ADMIN" || me?.role === "EDITOR" || me?.isSuper) {
    // 編集者：?all=1 のときはフィルタ無し。デフォは全部返す（期限切れも含める）
    if (!includeUnpublished) {
      // 既定でも全部返すが、もし公開のみにしたければ以下を有効化
      // where.isPublished = true;
    }
  } else {
    // 一般公開：公開 & 期限切れ除外
    where.isPublished = true;
    where.deadline = { gte: jstToday00() }; // 当日00:00以降を表示（締切当日は表示される）
  }

  const rows = await prisma.recruiting.findMany({
    where,
    orderBy: [{ deadline: "asc" }, { createdAt: "asc" }],
  });

  const lastUpdated =
    rows.reduce<Date | null>((acc, r) => (!acc || r.updatedAt > acc ? r.updatedAt : acc), null)?.toISOString() ?? null;

  return NextResponse.json({ items: rows, lastUpdated });
}

export async function POST(req: NextRequest) {
  // 追加は編集者のみ
  const me = await getSession();
  const ok = me && (me.role === "ADMIN" || me.role === "EDITOR" || me.isSuper);
  if (!ok) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const b = await req.json().catch(() => ({} as any));
  const { title, date, deadline, area, url, urlDesc, imageUrl, isPublished = true } = b ?? {};

  if (!title?.trim() || !date || !deadline || !area?.trim()) {
    return NextResponse.json({ error: "必須項目が未入力です" }, { status: 400 });
  }

  try {
    const row = await prisma.recruiting.create({
      data: {
        title: String(title).trim(),
        date: jstDateOnly(date),
        deadline: jstDateOnly(deadline),
        area: String(area).trim(),
        url: url ? String(url).trim() : null,
        urlDesc: urlDesc ? String(urlDesc).trim() : null,
        imageUrl: imageUrl ? String(imageUrl).trim() : null,
        isPublished: Boolean(isPublished),
      },
    });
    return NextResponse.json({ item: row });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "作成に失敗しました" }, { status: 500 });
  }
}
