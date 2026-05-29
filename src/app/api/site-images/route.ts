import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { verifyToken, COOKIE_NAME } from "@/lib/auth";
import { SITE_IMAGE_SLOTS } from "@/lib/site-image-keys";

export const dynamic = "force-dynamic";

const VALID_KEYS = new Set<string>(SITE_IMAGE_SLOTS.map((s) => s.key));

function canEdit(session: any) {
  const role = session?.role;
  return role === "ADMIN" || role === "EDITOR" || session?.isSuper === true;
}

// 全スロットの現在値を返す { "hero.main": "https://...", ... }
export async function GET() {
  try {
    const rows = await prisma.siteImage.findMany();
    const map: Record<string, string> = {};
    for (const row of rows) map[row.key] = row.url;
    return NextResponse.json(map);
  } catch {
    return NextResponse.json({});
  }
}

// { key, url } で1件アップサート
export async function PUT(req: NextRequest) {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value ?? "";
  const session = token ? await verifyToken(token) : null;
  if (!session || !canEdit(session)) {
    return NextResponse.json({ ok: false, message: "forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const { key, url } = body as { key?: string; url?: string };

  if (!key || !VALID_KEYS.has(key)) {
    return NextResponse.json({ ok: false, message: "invalid key" }, { status: 400 });
  }
  if (!url || typeof url !== "string") {
    return NextResponse.json({ ok: false, message: "url required" }, { status: 400 });
  }

  const slot = SITE_IMAGE_SLOTS.find((s) => s.key === key)!;
  await prisma.siteImage.upsert({
    where: { key },
    create: { key, url, label: slot.label },
    update: { url },
  });

  return NextResponse.json({ ok: true });
}

// key をクリア（フォールバックに戻す）
export async function DELETE(req: NextRequest) {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value ?? "";
  const session = token ? await verifyToken(token) : null;
  if (!session || !canEdit(session)) {
    return NextResponse.json({ ok: false, message: "forbidden" }, { status: 403 });
  }

  const key = req.nextUrl.searchParams.get("key");
  if (!key || !VALID_KEYS.has(key)) {
    return NextResponse.json({ ok: false, message: "invalid key" }, { status: 400 });
  }

  await prisma.siteImage.deleteMany({ where: { key } });
  return NextResponse.json({ ok: true });
}
