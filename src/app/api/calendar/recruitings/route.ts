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

// "2025-09-01" -> JST 00:00
function jstDateOnly(s: string): Date {
  const t = String(s ?? "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(t)) throw new Error("不正な日付形式です（YYYY-MM-DD）");
  return new Date(`${t}T00:00:00+09:00`);
}

// Date -> JST "YYYY-MM-DD"
function toJstYmd(d?: Date | null): string | undefined {
  if (!d) return undefined;
  const t = d.getTime() + 9 * 60 * 60 * 1000;
  return new Date(t).toISOString().slice(0, 10);
}

// 今日(JST)の00:00
function jstToday00(): Date {
  const now = Date.now();
  const jst = new Date(now + 9 * 60 * 60 * 1000);
  const y = jst.getUTCFullYear();
  const m = String(jst.getUTCMonth() + 1).padStart(2, "0");
  const d = String(jst.getUTCDate()).padStart(2, "0");
  return new Date(`${y}-${m}-${d}T00:00:00+09:00`);
}

export async function GET(req: NextRequest) {
  const me = await getSession();
  const url = new URL(req.url);
  const includeUnpublished = url.searchParams.get("all") === "1";
  const where: any = {};

  if (me?.role === "ADMIN" || me?.role === "EDITOR" || me?.isSuper) {
    if (!includeUnpublished) {
      // where.isPublished = true; // 必要なら開ける
    }
  } else {
    where.isPublished = true;
    where.deadline = { gte: jstToday00() };
  }

  const rows = await prisma.recruiting.findMany({
    where,
    orderBy: [{ deadline: "asc" }, { createdAt: "asc" }],
  });

  const lastUpdated =
    rows.reduce<Date | null>((acc, r) => (!acc || r.updatedAt > acc ? r.updatedAt : acc), null)?.toISOString() ?? null;

  // ★ JST "YYYY-MM-DD"で返却
  const items = rows.map((r) => ({
    id: r.id,
    title: r.title,
    date: toJstYmd(r.date)!,                                   // 開始
    endDate: toJstYmd((r as any).endDate ?? r.date),           // 終了（未設定は開始）
    deadline: toJstYmd(r.deadline)!,                           // 締切
    area: r.area,
    url: r.url ?? undefined,
    urlDesc: r.urlDesc ?? undefined,
    imageUrl: r.imageUrl ?? undefined,
    isPublished: r.isPublished,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  }));

  return NextResponse.json({ items, lastUpdated });
}

export async function POST(req: NextRequest) {
  const me = await getSession();
  const ok = me && (me.role === "ADMIN" || me.role === "EDITOR" || me.isSuper);
  if (!ok) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const b = await req.json().catch(() => ({} as any));
  const { title, date, endDate, deadline, area, url, urlDesc, imageUrl, isPublished = true } = b ?? {};

  if (!title?.trim() || !date || !deadline || !area?.trim()) {
    return NextResponse.json({ error: "必須項目が未入力です" }, { status: 400 });
  }

  try {
    const row = await prisma.recruiting.create({
      data: {
        title: String(title).trim(),
        date: jstDateOnly(date),
        ...(endDate ? { endDate: jstDateOnly(endDate) } : {}),
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
