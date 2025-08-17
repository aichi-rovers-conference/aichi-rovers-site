// src/app/api/users/me/password/route.ts

export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "../../../../../../lib/prisma"; 

export async function POST(req: NextRequest) {
  const id = req.cookies.get("admin_id")?.value;
  if (!id) return new NextResponse("Unauthorized", { status: 401 });

  const { currentPassword, newPassword } = await req.json().catch(() => ({}));
  if (!currentPassword || !newPassword) return new NextResponse("Bad Request", { status: 400 });

  const user = await prisma.user.findUnique({ where: { id: Number(id) } });
  if (!user || !user.isActive) return new NextResponse("Unauthorized", { status: 401 });

  const ok = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!ok) return new NextResponse("Unauthorized", { status: 401 });

  const hash = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: hash },
  });

  return new NextResponse("OK");
}
