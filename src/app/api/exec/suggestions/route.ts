import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
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

const STATUSES = ["NEW", "REVIEWED", "RESOLVED", "SPAM"] as const;
type Status = (typeof STATUSES)[number];

async function getSession(): Promise<Session | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE_NAME)?.value ?? "";
  const s = token ? await verifyToken(token) : null;
  return s ? (s as Session) : null;
}

function canEdit(s: Session | null) {
  if (!s) return false;
  if (s.isActive === false) return false;
  return s.role === "ADMIN" || s.role === "EDITOR" || s.isSuper === true;
}

function toBool(v: unknown) {
  return v === true || v === 1 || v === "1" || v === "true";
}

export async function GET() {
  const s = await getSession();
  if (!canEdit(s)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const items = await prisma.suggestion.findMany({
    orderBy: [{ createdAt: "desc" }],
    take: 300,
    select: {
      id: true,
      subject: true,
      body: true,
      category: true,
      origin: true,
      createdAt: true,
      updatedAt: true,

      // ★公開（滝）用
      isPublic: true,
      publicNote: true,
      resolvedAt: true,

      // ★運用用
      status: true,
      reviewedAt: true,
      adminNote: true,

      isAnonymous: true,
      contactEmail: true, // 管理側だけ
    },
  });

  return NextResponse.json({ items });
}

export async function PATCH(req: NextRequest) {
  const s = await getSession();
  if (!canEdit(s)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const data = await req.json().catch(() => null);
  if (!data?.id) return NextResponse.json({ error: "bad request" }, { status: 400 });

  const id = String(data.id);

  const statusRaw = String(data.status ?? "");
  const status: Status | null = STATUSES.includes(statusRaw as Status) ? (statusRaw as Status) : null;

  const isPublic = toBool(data.isPublic);
  const publicNote =
    typeof data.publicNote === "string" ? data.publicNote.trim().slice(0, 1000) : null;

  if (!status) return NextResponse.json({ error: "invalid status" }, { status: 400 });

  // ステータスに応じた日時
  const reviewedAt = status === "REVIEWED" ? new Date() : undefined;
  const resolvedAt = status === "RESOLVED" ? new Date() : null;

  // SPAM は強制で公開OFF（事故防止）
  const safeIsPublic = status === "SPAM" ? false : isPublic;

  const updated = await prisma.suggestion.update({
    where: { id },
    data: {
      status,
      reviewedAt,
      resolvedAt,
      isPublic: safeIsPublic,
      publicNote,
    },
    select: {
      id: true,
      status: true,
      reviewedAt: true,
      resolvedAt: true,
      isPublic: true,
      publicNote: true,
      updatedAt: true,
    },
  });

  return NextResponse.json({ item: updated });
}
