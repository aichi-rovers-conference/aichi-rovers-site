{/* 
import { NextResponse } from "next/server";
import { prisma } from "../../../../../../lib/prisma"; 
export const revalidate = 0;
export const dynamic = "force-dynamic";

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const pollId = params.id;
  const questions = await prisma.question.findMany({
    where: { pollId },
    orderBy: { index: "asc" },
    select: {
      id: true, type: true, title: true,
      choices: { select: { id: true, label: true, index: true }, orderBy: { index: "asc" } },
    },
  });

  const answers = await prisma.answer.findMany({
    where: { question: { pollId } },
    orderBy: { createdAt: "desc" },
    include: { choices: true }, // CHECKBOX の中間テーブル
    take: 50,
  });

  return NextResponse.json({ questions, answers }, { headers: { "Cache-Control": "no-store" } });
}

*/}