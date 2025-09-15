import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { cookies } from "next/headers";
import { verifyToken, COOKIE_NAME } from "@/lib/auth";


export const dynamic = "force-dynamic";
export const revalidate = 0;


function canWrite(session: any) {
// 役割ベースの単純チェック（必要に応じて調整）
    const role = session?.role ?? session?.user?.role;
    return role === "ADMIN" || role === "EDITOR";
}


// 一覧取得（公開のみ or ?all=1で全部）
export async function GET(req: NextRequest) {
    const url = new URL(req.url);
    const all = url.searchParams.get("all") === "1";


    const list = await prisma.executiveMember.findMany({
        where: all ? {} : { isPublished: true },
        orderBy: [{ order: "asc" }, { createdAt: "asc" }],
    });
    return NextResponse.json(list);
}


// 作成
export async function POST(req: NextRequest) {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value ?? "";
    const session = token ? await verifyToken(token) : null;
    if (!session || !canWrite(session)) return NextResponse.json({ error: "forbidden" }, { status: 403 });


    const body = await req.json();
    // 最低限のバリデーション
    if (!body?.name || !body?.unit) return NextResponse.json({ error: "name/unit required" }, { status: 400 });


    const created = await prisma.executiveMember.create({
        data: {
            name: body.name,
            unit: body.unit,
            role: body.role ?? null,
            birthDate: body.birthDate ? new Date(body.birthDate) : null,
            hometown: body.hometown ?? null,
            photoUrl: body.photoUrl ?? null,
            extras: body.extras ?? null,
            order: typeof body.order === "number" ? body.order : 0,
            isPublished: typeof body.isPublished === "boolean" ? body.isPublished : true,
        },
    });
    return NextResponse.json(created, { status: 201 });
}