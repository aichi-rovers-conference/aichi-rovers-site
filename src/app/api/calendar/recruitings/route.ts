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

function getIdWhere(id: string) {
  // id が数値でも文字列でも動くように（Prisma型差異の回避）
  return /^\d+$/.test(id) ? Number(id) : id;
}

function jstMidnight(ymd: string) {
  const [y, m, d] = ymd.split("-").map((v) => Number(v));
  if (!y || !m || !d) throw new Error("Invalid date");
  const utc = Date.UTC(y, m - 1, d, 0, 0, 0);
  return new Date(utc - 9 * 60 * 60 * 1000);
}

async function getSession(): Promise<Session | null> {
  const jar = await cookies(); // ← ここが重要
  const token = jar.get(COOKIE_NAME)?.value ?? "";
  const s = token ? await verifyToken(token) : null;
  return s ? (s as Session) : null;
}

async function getLastUpdated(): Promise<string | null> {
  // updatedAt が無いスキーマでも落ちないように try/catch
  try {
    const p = prisma as any;
    const row = await p.recruiting.findFirst({
      orderBy: { updatedAt: "desc" },
      select: { updatedAt: true },
    });
    return row?.updatedAt ? new Date(row.updatedAt).toISOString() : null;
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session || !session.isActive) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.role === "VIEWER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(req.url);
  const all = url.searchParams.get("all") === "1";
  const yearParam = url.searchParams.get("year");
  const year = yearParam ? Number(yearParam) : new Date().getFullYear();

  const p = prisma as any;

  let items: any[] = [];
  if (all) {
    // 管理画面：全件（年で絞らない）
    items = await p.recruiting.findMany({
      orderBy: [{ deadline: "asc" }, { date: "asc" }],
    });
  } else {
    // public / 年別など
    const from = jstMidnight(`${year}-01-01`);
    const to = jstMidnight(`${year + 1}-01-01`);
    items = await p.recruiting.findMany({
      where: { date: { gte: from, lt: to } },
      orderBy: [{ date: "asc" }],
    });
  }

  const lastUpdated = await getLastUpdated();
  return NextResponse.json({ items, lastUpdated });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || !session.isActive) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.role === "VIEWER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Bad Request" }, { status: 400 });

  // ✅ UI側が送る想定に合わせる
  const {
    title,
    area,
    publishFrom,
    deadline,
    date,
    endDate,
    url,
    urlDesc,
    imageUrl,
    isPublished,
  } = body as {
    title: string;
    area: string;
    publishFrom: string; // YYYY-MM-DD
    deadline: string;    // YYYY-MM-DD
    date: string;        // YYYY-MM-DD
    endDate?: string;    // YYYY-MM-DD
    url?: string;
    urlDesc?: string;
    imageUrl?: string;
    isPublished?: boolean;
  };

  if (!title || !area || !publishFrom || !deadline || !date) {
    return NextResponse.json(
      { error: "title, area, publishFrom, deadline, date are required" },
      { status: 400 }
    );
  }

  const p = prisma as any;
  const created = await p.recruiting.create({
    data: {
      title: String(title),
      area: String(area),
      publishFrom: jstMidnight(publishFrom),
      deadline: jstMidnight(deadline),
      date: jstMidnight(date),
      endDate: jstMidnight(endDate || date),
      url: url ? String(url) : null,
      urlDesc: urlDesc ? String(urlDesc) : null,
      imageUrl: imageUrl ? String(imageUrl) : null,
      isPublished: isPublished !== false,
    },
  });

  return NextResponse.json({ item: created }, { status: 201 });
}
