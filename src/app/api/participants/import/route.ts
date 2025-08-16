import { NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma"; 

export const dynamic = "force-dynamic";

// POST { text: "氏名, 団, RS年齢, 地区\n..." }
export async function POST(req: Request) {
  try {
    const { text } = await req.json().catch(() => ({ text: "" }));
    const lines = String(text || "").split(/\r?\n/).map(s => s.trim()).filter(Boolean);
    if (!lines.length) return NextResponse.json({ error: "no lines" }, { status: 400 });

    let created = 0;
    for (const line of lines) {
      const [name, troop, rsAgeStr, district] = line.split(",").map(s => s?.trim() ?? "");
      const rsAge = Number(rsAgeStr);
      if (!name || !troop || !Number.isFinite(rsAge) || !district) continue;
      try {
        await prisma.participant.create({ data: { name, troop, rsAge, district: district as any } });
        created++;
      } catch {}
    }
    return NextResponse.json({ ok: true, created });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.code || "SERVER_ERROR", message: e?.message || String(e) },
      { status: 500 },
    );
  }
}
