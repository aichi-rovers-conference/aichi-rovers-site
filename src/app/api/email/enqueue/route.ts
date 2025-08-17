// app/api/email/enqueue/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma";
import { cookies } from "next/headers";
import { verifyToken, COOKIE_NAME } from "@/lib/auth";
import { EmailStatus } from "@prisma/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(req: NextRequest) {
  try {
    // 認証
    const jar = await cookies();
    const token = jar.get(COOKIE_NAME)?.value ?? "";
    const me = token ? await verifyToken(token) : null;
    if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // 入力
    const body: unknown = await req.json().catch(() => ({}));
    const b = (typeof body === "object" && body) as any;

    const meetingCode = String(b?.meetingCode ?? "").trim();
    const subjectTpl = String(b?.subject ?? "");
    const bodyTpl = String(b?.body ?? "");
    const baseUrl = String(b?.baseUrl ?? "").trim();
    const ids: string[] = Array.isArray(b?.participantIds)
      ? Array.from(new Set((b.participantIds as unknown[]).map((v) => String(v))))
      : [];

    if (!meetingCode || !subjectTpl || !bodyTpl || ids.length === 0) {
      return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
    }

    // 受信者（メールありのみ）
    const participants = await prisma.participant.findMany({
      where: { id: { in: ids }, email: { not: null } },
      select: { id: true, name: true, email: true, troop: true, district: true },
    });

    if (participants.length === 0) {
      return NextResponse.json({ ok: true, enqueued: 0, skipped: ids.length });
    }

    // 簡易テンプレ置換（全置換）
    const fill = (tpl: string, map: Record<string, string>) =>
      Object.entries(map).reduce((acc, [k, v]) => acc.split(k).join(v), tpl);

    const origin = baseUrl.replace(/\/$/, ""); // 末尾スラッシュ除去

    const queueRows = participants.map((p) => {
      const map: Record<string, string> = {
        "{{name}}": p.name,
        "{{district}}": String(p.district),
        "{{troop}}": String(p.troop ?? ""),
        "{{meeting}}": meetingCode,
        "{{qr_url}}": `${origin}/qr?meeting=${encodeURIComponent(meetingCode)}&id=${encodeURIComponent(
          p.id
        )}&name=${encodeURIComponent(p.name)}`,
      };
      return {
        participantId: p.id,
        meetingCode,
        to: p.email as string,
        subject: fill(subjectTpl, map),
        body: fill(bodyTpl, map),
        status: EmailStatus.PENDING,
      };
    });

    // まとめて投入（status まで付与）
    await prisma.emailQueue.createMany({ data: queueRows });

    return NextResponse.json({
      ok: true,
      enqueued: queueRows.length,
      skipped: ids.length - participants.length,
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.code || "SERVER_ERROR", message: e?.message || String(e) },
      { status: 500 }
    );
  }
}
