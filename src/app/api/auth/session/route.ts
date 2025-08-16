// app/api/auth/session/route.ts
import { NextResponse } from "next/server";
import { jwtVerify } from "jose";

const COOKIE_NAME = "arc_session";
const SECRET = new TextEncoder().encode(process.env.AUTH_SECRET || "dev-secret");

export async function GET(req: Request) {
  try {
    // App Router の Request からは cookies() が取れないので header から読む
    const cookieHeader = (req.headers.get("cookie") || "");
    const token = cookieHeader
      .split(/;\s*/)
      .map((p) => p.split("="))
      .find(([k]) => k === COOKIE_NAME)?.[1];

    if (!token) return NextResponse.json({ ok: false }, { status: 401 });
    const { payload } = await jwtVerify(token, SECRET);
    return NextResponse.json({
      ok: true,
      user: { id: payload.id, username: payload.username, role: payload.role, remember: payload.remember },
    });
  } catch {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
}
