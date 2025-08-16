import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma"; 
import { cookies } from "next/headers";
import { verifyToken, COOKIE_NAME } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(req: NextRequest) {
  try {
    const jar = await cookies();
    const token = jar.get(COOKIE_NAME)?.value ?? "";
    const me = token ? await verifyToken(token) : null;
    if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    // EDITOR でも投入は許可（実送信はADMIN/SUPER側で）
    const body = await req.json().catch(() => ({}));
    const meetingCode = String(body?.meetingCode || "").trim();
    const subject = String(body?.subject || "");
    const tpl = String(body?.body || "");
    const ids: string[] = Array.isArray(body?.participantIds) ? body.participantIds : [];
    const baseUrl: string = String(body?.baseUrl || "");

    if (!meetingCode || !subject || !tpl || ids.length === 0) {
      return NextResponse.json({ error: "invalid payload" }, { status: 400 });
    }

    // 受信者取得（メールがある人のみ）
    const participants = await prisma.participant.findMany({
      where: { id: { in: ids }, email: { not: null } },
      select: { id: true, name: true, email: true, troop: true, district: true },
    });

    const enqueuedData = participants.map(p => {
      // メール本文のパーソナライズは送信時でも良いが、ここで固定化してもOK
      const map: Record<string, string> = {
        "{{name}}": p.name,
        "{{district}}": p.district as unknown as string, // DistrictはDBでは日本語（@map適用）
        "{{troop}}": p.troop,
        "{{meeting}}": meetingCode,
        "{{qr_url}}": `${baseUrl}/qr?meeting=${encodeURIComponent(meetingCode)}&id=${encodeURIComponent(p.id)}&name=${encodeURIComponent(p.name)}`,
      };
      const subj = Object.entries(map).reduce((s, [k, v]) => s.replaceAll(k, v), subject);
      const body = Object.entries(map).reduce((s, [k, v]) => s.replaceAll(k, v), tpl);

      return {
        participantId: p.id,
        meetingCode,
        to: p.email!, // not null で取得済み
        subject: subj,
        body,
      };
    });

    if (enqueuedData.length) {
      await prisma.emailQueue.createMany({ data: enqueuedData });
    }

    return NextResponse.json({
      ok: true,
      enqueued: enqueuedData.length,
      skipped: ids.length - enqueuedData.length,
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.code || "SERVER_ERROR", message: e?.message || String(e) },
      { status: 500 }
    );
  }
}
