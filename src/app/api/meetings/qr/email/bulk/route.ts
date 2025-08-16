import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../../../../lib/prisma";
import { cookies } from "next/headers";
import { COOKIE_NAME, verifyToken } from "@/lib/auth";
import { renderTemplate, normalizeNewlines } from "@/lib/mailTemplate";
import { buildPreviewQrUrl } from "@/lib/qr"; 

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(req: NextRequest) {
  try {
    // 認証
    const jar = await cookies();
    const token = jar.get(COOKIE_NAME)?.value ?? "";
    const me = token ? await verifyToken(token) : null;
    if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // （任意）管理者制限
    const isSuper = !!process.env.SUPERADMIN_USERNAME && me.username === process.env.SUPERADMIN_USERNAME.trim();
    // if (me.role !== "ADMIN" && !isSuper) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    // 入力
    const body = await req.json().catch(() => ({}));
    const meetingCode = String(body?.meetingCode || "").trim();
    const tplSubject = String(body?.subject || "");
    const tplBody = String(body?.body || "");
    const ids: string[] = Array.isArray(body?.participantIds) ? body.participantIds : [];

    if (!meetingCode || !tplSubject || !tplBody || ids.length === 0) {
      return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
    }

    // メールありの対象者のみ
    const participants = await prisma.participant.findMany({
      where: { id: { in: ids }, email: { not: null } },
      select: { id: true, name: true, email: true },
    });

    const origin = (process.env.APP_ORIGIN || "http://localhost:3000").replace(/\/$/, "");
    let enqueued = 0;
    let failed = 0;

    for (const p of participants) {
      try {
        // /p/[token] 形式のURLを生成（内部で EmailToken 作成 or 再利用）
        const qr_url = await buildPreviewQrUrl(origin, meetingCode, p.id);

        const subject = normalizeNewlines(
          renderTemplate(tplSubject, { name: p.name, meeting: meetingCode, qr_url })
        );

        const textBody = normalizeNewlines(
          renderTemplate(tplBody, { name: p.name, meeting: meetingCode, qr_url })
        );

        await prisma.emailQueue.create({
          data: {
            participantId: p.id,
            meetingCode,
            to: p.email!, // not null で取得済み
            subject,
            body: textBody,
            status: "PENDING",
          },
        });
        enqueued++;
      } catch {
        failed++;
      }
    }

    return NextResponse.json({ ok: true, enqueued, failed });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.code || "SERVER_ERROR", message: e?.message || String(e) },
      { status: 500 }
    );
  }
}
