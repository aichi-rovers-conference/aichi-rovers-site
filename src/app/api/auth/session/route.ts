// app/api/auth/session/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";

const COOKIE_NAME = "arc_session";
const SECRET = new TextEncoder().encode(process.env.AUTH_SECRET || "dev-secret");

// ★ middleware と必ず合わせる
const ISS = process.env.AUTH_ISSUER ?? "https://aichirovers.com";
const AUD = process.env.AUTH_AUDIENCE ?? "arc-web";

export async function GET() {
  try {
    // cookies() を使うとエッジ/Node両方で安全
    const jar = await cookies();
    const token = jar.get(COOKIE_NAME)?.value;
    if (!token) return no(); // ← 200で {ok:false} を返す実装

    const { payload } = await jwtVerify(token, SECRET, {
      issuer: ISS,
      audience: AUD,
      clockTolerance: "60s",
    });

    return yes({
      id: payload.id,
      username: payload.username,
      role: payload.role,
      remember: payload.remember,
    });
  } catch {
    return no();
  }
}

function yes(user: any) {
  const res = NextResponse.json({ ok: true, user });
  res.headers.set("Cache-Control", "no-store, max-age=0");
  return res;
}
function no() {
  // 失敗時も 200 で {ok:false} を返すと、フロント側の fetch で res.ok 分岐に左右されにくい
  const res = NextResponse.json({ ok: false });
  res.headers.set("Cache-Control", "no-store, max-age=0");
  return res;
}
