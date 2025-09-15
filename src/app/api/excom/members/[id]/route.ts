// src/app/api/excom/members/[id]/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { cookies } from "next/headers";
import { verifyToken, COOKIE_NAME } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

function canWrite(session: any) {
  const role = session?.role ?? session?.user?.role;
  return role === "ADMIN" || role === "EDITOR";
}

export async function PUT(req: Request, context: any) {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value ?? "";
  const session = token ? await verifyToken(token) : null;
  if (!session || !canWrite(session)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { id } = (context?.params ?? {}) as { id: string };
  if (!id) return NextResponse.json({ error: "missing id" }, { status: 400 });

  const body = await req.json();

  const updated = await prisma.executiveMember.update({
    where: { id },
    data: {
      name: body.name,
      unit: body.unit,
      role: body.role ?? null,
      birthDate: body.birthDate ? new Date(body.birthDate) : null,
      hometown: body.hometown ?? null,
      photoUrl: body.photoUrl ?? null,
      extras: body.extras ?? null, // Record<string,string> | null を想定
      order: typeof body.order === "number" ? body.order : 0,
      isPublished: typeof body.isPublished === "boolean" ? body.isPublished : true,
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, context: any) {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value ?? "";
  const session = token ? await verifyToken(token) : null;
  if (!session || !canWrite(session)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { id } = (context?.params ?? {}) as { id: string };
  if (!id) return NextResponse.json({ error: "missing id" }, { status: 400 });

  await prisma.executiveMember.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
