// src/app/api/meetings/qr/email/prune/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const { days = 30 } = await req.json().catch(() => ({ days: 30 }));
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const deleted = await prisma.emailQueue.deleteMany({
    where: { status: "SENT", sentAt: { lt: cutoff } },
  });

  return NextResponse.json({ deleted: deleted.count, cutoff: cutoff.toISOString() });
}
