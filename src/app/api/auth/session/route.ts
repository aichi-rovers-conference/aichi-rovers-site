// app/api/auth/session/route.ts
import { NextResponse } from "next/server";
import { jwtVerify } from "jose";

const COOKIE_NAME = "arc_session";
const SECRET = new TextEncoder().encode(process.env.AUTH_SECRET || "dev-secret");

function getCookie(req: Request, name: string): string | null {
  const raw = req.headers.get("cookie");
  if (!raw) return null;
  // name=... の最初の一致を安全に抜き出す
  const m = raw.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  if (!m) return null;
  try {
    return decodeURIComponent(m[1]);
  } catch {
    return m[1]; // デコード失敗時は生値
  }
}

export async function GET(req: Request) {
  try {
    const token = getCookie(req, COOKIE_NAME);
    if (!token) return NextResponse.json({ ok: false }, { status: 401 });

    const { payload } = await jwtVerify(token, SECRET);

    return NextResponse.json(
      {
        ok: true,
        user: {
          id: payload.id,
          username: payload.username,
          role: payload.role,
          remember: payload.remember,
        },
      },
      { headers: { "Cache-Control": "no-store, must-revalidate" } }
    );
  } catch {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
}
