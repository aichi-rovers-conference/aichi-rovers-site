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

function jstMidnight(ymd: string) {
  const [y, m, d] = ymd.split("-").map((v) => Number(v));
  if (!y || !m || !d) throw new Error("Invalid date");
  const utc = Date.UTC(y, m - 1, d, 0, 0, 0);
  return new Date(utc - 9 * 60 * 60 * 1000);
}

function getIdWhere(id: string) {
  return /^\d+$/.test(id) ? Number(id) : id;
}

async function getSession(): Promise<Session | null> {
  const jar = await cookies(); // ← ここが重要
  const token = jar.get(COOKIE_NAME)?.value ?? "";
  const s = token ? await verifyToken(token) : null;
  return s ? (s as Session) : null;
}

export async function PATCH(
  req: NextRequest,
  ctx: { params: { id: string } }
) {
  const session = await getSession();
  if (!session || !session.isActive) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.role === "VIEWER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = ctx.params;
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Bad Request" }, { status: 400 });

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
  } = body as any;

  const data: any = {};
  if (title !== undefined) data.title = String(title);
  if (area !== undefined) data.area = String(area);

  if (publishFrom !== undefined) data.publishFrom = jstMidnight(String(publishFrom));
  if (deadline !== undefined) data.deadline = jstMidnight(String(deadline));
  if (date !== undefined) data.date = jstMidnight(String(date));
  if (endDate !== undefined) data.endDate = jstMidnight(String(endDate));

  if (url !== undefined) data.url = url ? String(url) : null;
  if (urlDesc !== undefined) data.urlDesc = urlDesc ? String(urlDesc) : null;
  if (imageUrl !== undefined) data.imageUrl = imageUrl ? String(imageUrl) : null;

  if (isPublished !== undefined) data.isPublished = Boolean(isPublished);

  const p = prisma as any;
  const updated = await p.recruiting.update({
    where: { id: getIdWhere(id) },
    data,
  });

  return NextResponse.json({ item: updated });
}

export async function DELETE(
  req: NextRequest,
  ctx: { params: { id: string } }
) {
  const session = await getSession();
  if (!session || !session.isActive) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.role === "VIEWER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = ctx.params;

  const p = prisma as any;
  await p.recruiting.delete({
    where: { id: getIdWhere(id) },
  });

  return NextResponse.json({ ok: true });
}
