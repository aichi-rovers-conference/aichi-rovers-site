// src/app/api/polls/[id]/debug-answers/route.ts
import { NextResponse } from "next/server";

export const runtime = "nodejs"; // Prisma等を使うならNodeで

type Params = { params: { id: string } };

export async function GET(_req: Request, { params }: Params) {
  // TODO: 必要に応じてDB等からデバッグ用データを返す
  return NextResponse.json({ ok: true, route: "debug-answers", pollId: params.id });
}

// 必要ならPOST等も追記
// export async function POST(req: Request, { params }: Params) { ... }
