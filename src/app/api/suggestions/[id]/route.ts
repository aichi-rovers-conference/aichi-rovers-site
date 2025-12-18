import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function getAdminToken(req: Request) {
  const bearer = req.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
  return bearer ?? req.headers.get("x-admin-token") ?? "";
}
function requireAdmin(req: Request) {
  const expected = process.env.SUGGESTION_ADMIN_TOKEN;
  if (!expected) return false;
  return getAdminToken(req) === expected;
}

export async function GET(req: Request, ctx: { params: { id: string } }) {
  if (!requireAdmin(req)) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const item = await prisma.suggestion.findUnique({
    where: { id: ctx.params.id },
  });

  if (!item) return NextResponse.json({ message: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true, item });
}

export async function PATCH(req: Request, ctx: { params: { id: string } }) {
  if (!requireAdmin(req)) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const data = await req.json().catch(() => null) as
    | { status?: "NEW" | "REVIEWED" | "RESOLVED" | "SPAM"; adminNote?: string; reviewedAt?: string | null }
    | null;

  const status = data?.status;
  const adminNote = data?.adminNote ? String(data.adminNote).trim().slice(0, 1000) : undefined;

  const updated = await prisma.suggestion.update({
    where: { id: ctx.params.id },
    data: {
      status: status ?? undefined,
      adminNote,
      reviewedAt: status === "REVIEWED" ? new Date() : undefined,
    },
    select: { id: true, status: true, adminNote: true, reviewedAt: true, updatedAt: true },
  });

  return NextResponse.json({ ok: true, updated });
}
