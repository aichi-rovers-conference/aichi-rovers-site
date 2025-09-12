// app/api/calendar/events/route.ts
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

async function requireEditor() {
  const jar = await cookies();
  const token = jar.get(COOKIE_NAME)?.value ?? "";
  const s = token ? await verifyToken(token) : null;
  if (!s) return null;
  const ok = s.role === "ADMIN" || s.role === "EDITOR" || s.isSuper;
  return ok ? (s as Session) : null;
}

// "2025-09-01" → Date("2025-09-01T00:00:00+09:00")
function jstDateOnly(s: string): Date {
  const t = String(s ?? "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(t)) throw new Error("不正な日付形式です（YYYY-MM-DD）");
  return new Date(`${t}T00:00:00+09:00`);
}

// DateをJSTのYYYY-MM-DDに整形（undefined可）
function toJstYmd(d?: Date | null): string | undefined {
  if (!d) return undefined;
  const t = d.getTime() + 9 * 60 * 60 * 1000;
  return new Date(t).toISOString().slice(0, 10);
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const year = url.searchParams.get("year"); // 例: "2026"
  const includeUnpublished = url.searchParams.get("all") === "1";

  const where: any = {};
  if (!includeUnpublished) where.isPublished = true;

  if (year && /^\d{4}$/.test(year)) {
    const y = Number(year);
    const from = new Date(`${y}-01-01T00:00:00+09:00`);
    const to = new Date(`${y + 1}-01-01T00:00:00+09:00`);
    where.date = { gte: from, lt: to };
  }

  const rows = await prisma.calendarEvent.findMany({
    where,
    orderBy: [{ date: "asc" }, { createdAt: "asc" }],
  });

  const lastUpdated =
    rows.reduce<Date | null>((acc, r) => (!acc || r.updatedAt > acc ? r.updatedAt : acc), null)?.toISOString() ?? null;

  // ★ ここでJST日付に整形して返す（前端はslice不要＆時差事故なし）
  const items = rows.map((r) => ({
    id: r.id,
    date: toJstYmd(r.date)!,                              // "YYYY-MM-DD"
    endDate: toJstYmd((r as any).endDate ?? r.date),      // 期間対応／未設定は開始日
    title: r.title,
    url: r.url ?? undefined,
    note: r.note ?? undefined,
    area: r.area ?? undefined,
    isPublished: r.isPublished,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  }));

  return NextResponse.json({ items, lastUpdated });
}

export async function POST(req: NextRequest) {
  const me = await requireEditor();
  if (!me) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => ({} as any));
  const { date, endDate, title, url, note, area, isPublished = true } = body ?? {};

  if (!date || !title) return NextResponse.json({ error: "必須項目が未入力です" }, { status: 400 });

  try {
    const row = await prisma.calendarEvent.create({
      data: {
        date: jstDateOnly(date),
        // endDateは任意
        ...(endDate ? { endDate: jstDateOnly(endDate) } : {}),
        title: String(title).trim(),
        url: url ? String(url).trim() : null,
        note: note ? String(note).trim() : null,
        area: area ? String(area).trim() : null,
        isPublished: Boolean(isPublished),
      },
    });
    return NextResponse.json({ item: row });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "作成に失敗しました" }, { status: 500 });
  }
}
