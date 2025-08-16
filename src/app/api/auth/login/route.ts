// app/api/auth/login/route.ts
import { NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma";
import { signSession, verifyPassword, COOKIE_NAME, type Role } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const username = String(body?.id ?? body?.username ?? "").trim();
    const password = String(body?.password ?? "").trim();
    const remember = Boolean(body?.remember);

    if (!username || !password) {
      return NextResponse.json({ ok: false, error: "missing" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { username },
      select: {
        id: true,
        username: true,
        role: true,
        isActive: true,
        isSuper: true,
        passwordHash: true,
      },
    });

    if (!user || !user.isActive) {
      return NextResponse.json({ ok: false, error: "invalid" }, { status: 401 });
    }

    const ok = await verifyPassword(password, user.passwordHash);
    if (!ok) {
      return NextResponse.json({ ok: false, error: "invalid" }, { status: 401 });
    }

    const payload = {
      id: user.id,
      username: user.username,
      role: user.role as Role,
      isSuper: user.isSuper,
      isActive: user.isActive,
    };

    // remember: true => 30日 / false => 8時間
    const token = await signSession(payload, remember ? "30d" : "8h");

    const isProd = process.env.NODE_ENV === "production";
    const res = NextResponse.json({
      ok: true,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        isSuper: user.isSuper,
        isActive: user.isActive,
      },
      remember,
    });

    res.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: isProd,
      sameSite: "lax",
      path: "/",
      maxAge: remember ? 60 * 60 * 24 * 30 : 60 * 60 * 8,
    });

    // レガシー Cookie を掃除（存在していれば削除）
    for (const legacy of ["admin", "admin_id", "admin_role", "session"]) {
      res.cookies.set(legacy, "", { path: "/", maxAge: 0 });
    }

    return res;
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: "server", message: e?.message || String(e) },
      { status: 500 }
    );
  }
}
