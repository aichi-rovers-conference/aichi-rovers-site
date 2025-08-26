// app/api/calendar/events/[id]/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import prisma from "@/lib/prisma";
import { verifyToken, COOKIE_NAME } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

async function requireEditor() {
  const jar = await cookies();
  const token = jar.get(COOKIE_NAME)?.value ?? "";
  const s = token ? await verifyToken(token) : null;
  if (!s) return null;
  return s.role === "ADMIN" || s.role === "EDITOR" || s.isSuper ? s : null;
}

function jstDateOnly(s: string): Date {
  const t = String(s ?? "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(t)) throw new Error("不正な日付形式です（YYYY-MM-DD）");
  return new Date(`${t}T00:00:00+09:00`);
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const me = await requireEditor();
  if (!me) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const id = params.id;
  const b = await req.json().catch(() => ({} as any));

  const data: any = {};
  if (b.title !== undefined) data.title = String(b.title).trim();
  if (b.date !== undefined) data.date = jstDateOnly(b.date);
  if (b.url !== undefined) data.url = b.url ? String(b.url).trim() : null;
  if (b.note !== undefined) data.note = b.note ? String(b.note).trim() : null;
  if (b.area !== undefined) data.area = b.area ? String(b.area).trim() : null;
  if (b.isPublished !== undefined) data.isPublished = Boolean(b.isPublished);

  try {
    const row = await prisma.calendarEvent.update({ where: { id }, data });
    return NextResponse.json({ item: row });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "更新に失敗しました" }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const me = await requireEditor();
  if (!me) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const id = params.id;
  try {
    await prisma.calendarEvent.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "削除に失敗しました" }, { status: 500 });
  }
}
