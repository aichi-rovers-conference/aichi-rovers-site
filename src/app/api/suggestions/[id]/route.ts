// src/app/api/suggestions/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import prisma from "@/lib/prisma";
import { verifyToken, COOKIE_NAME } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const STATUSES = ["NEW", "REVIEWED", "RESOLVED", "SPAM"] as const;
type Status = (typeof STATUSES)[number];

type Session = {
  id: number;
  username: string;
  role: "ADMIN" | "EDITOR" | "VIEWER";
  isSuper?: boolean;
  isActive?: boolean;
};

function getIdWhere(id: string) {
  return /^\d+$/.test(id) ? Number(id) : id;
}

async function getSession(): Promise<Session | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE_NAME)?.value ?? "";
  const s = token ? await verifyToken(token) : null;
  return s ? (s as Session) : null;
}

// ★ Next.js 15 対応：params は Promise 扱い
type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  const session = await getSession();
  if (!session || !session.isActive) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;

  const p = prisma as any;
  const item = await p.suggestion.findUnique({
    where: { id: getIdWhere(id) },
  });

  if (!item) {
    return NextResponse.json({ error: "Not Found" }, { status: 404 });
  }

  return NextResponse.json({ item });
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const session = await getSession();
  if (!session || !session.isActive) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.role === "VIEWER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await ctx.params;

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Bad Request" }, { status: 400 });

  const {
    status,
    adminNote,
    category,

    // 滝ストリーム用（あなたのUIに合わせて）
    isPublic,
    publicNote,

    // もし直接日時を渡しているなら（任意）
    reviewedAt,
    resolvedAt,
  } = body as any;

  const data: any = {};

  if (status !== undefined) {
    const s = String(status) as Status;
    if (!STATUSES.includes(s)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }
    data.status = s;

    // 便利な自動付与（不要なら消してOK）
    if (s === "REVIEWED" && reviewedAt === undefined) data.reviewedAt = new Date();
    if (s === "RESOLVED" && resolvedAt === undefined) data.resolvedAt = new Date();
  }

  if (adminNote !== undefined) data.adminNote = adminNote ? String(adminNote) : null;
  if (category !== undefined) data.category = category ? String(category) : null;

  if (isPublic !== undefined) data.isPublic = Boolean(isPublic);
  if (publicNote !== undefined) data.publicNote = publicNote ? String(publicNote) : null;

  if (reviewedAt !== undefined) data.reviewedAt = reviewedAt ? new Date(String(reviewedAt)) : null;
  if (resolvedAt !== undefined) data.resolvedAt = resolvedAt ? new Date(String(resolvedAt)) : null;

  const p = prisma as any;
  const updated = await p.suggestion.update({
    where: { id: getIdWhere(id) },
    data,
  });

  return NextResponse.json({ item: updated });
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  const session = await getSession();
  if (!session || !session.isActive) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.role === "VIEWER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await ctx.params;

  const p = prisma as any;
  await p.suggestion.delete({
    where: { id: getIdWhere(id) },
  });

  return NextResponse.json({ ok: true });
}
