import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../../../lib/prisma";
import { randomUUID } from "node:crypto";

export const revalidate = 0;
export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id: pollId } = await ctx.params;

  // 存在確認（任意：無駄なnonce発行防止）
  const poll = await prisma.poll.findUnique({ where: { id: pollId as any }, select: { id: true } });
  if (!poll) return NextResponse.json({ error: "Poll not found" }, { status: 404 });

  const nonce = randomUUID();
  await prisma.submissionNonce.create({ data: { pollId, nonce } });

  return NextResponse.json({ nonce }, { status: 200, headers: { "Cache-Control": "no-store" } });
}
