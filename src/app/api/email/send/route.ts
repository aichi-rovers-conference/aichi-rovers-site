import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma";
import { cookies } from "next/headers";
import { verifyToken, COOKIE_NAME } from "@/lib/auth";
import nodemailer from "nodemailer";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function getTransport() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || "587");
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const secure = String(process.env.SMTP_SECURE || "false") === "true";

  if (!host || !user || !pass) return null;

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });
}

export async function POST(req: NextRequest) {
  try {
    const jar = await cookies();
    const token = jar.get(COOKIE_NAME)?.value ?? "";
    const me = token ? await verifyToken(token) : null;
    if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (me.role !== "ADMIN" && !me.isSuper) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const max = Math.min(200, Math.max(1, Number(body?.max || 50)));

    const transporter = getTransport();
    if (!transporter) {
      return NextResponse.json(
        { error: "NO_SMTP", message: "SMTP_HOST/PORT/USER/PASS を .env に設定してください" },
        { status: 400 }
      );
    }

    const from = process.env.SMTP_FROM || process.env.SMTP_USER!;
    const pending = await prisma.emailQueue.findMany({
      where: { status: "PENDING" },
      orderBy: { queuedAt: "asc" },
      take: max,
    });

    let ok = 0, ng = 0;

    for (const m of pending) {
      try {
        await transporter.sendMail({
          from,
          to: m.to,
          subject: m.subject,
          text: m.body,
        });
        await prisma.emailQueue.update({
          where: { id: m.id },
          data: { status: "SENT", sentAt: new Date(), error: null },
        });
        ok++;
      } catch (e: any) {
        await prisma.emailQueue.update({
          where: { id: m.id },
          data: { status: "FAILED", error: e?.message || String(e) },
        });
        ng++;
      }
    }

    const remaining = await prisma.emailQueue.count({ where: { status: "PENDING" } });
    return NextResponse.json({ ok: true, sent: ok, failed: ng, remaining });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.code || "SERVER_ERROR", message: e?.message || String(e) },
      { status: 500 }
    );
  }
}
