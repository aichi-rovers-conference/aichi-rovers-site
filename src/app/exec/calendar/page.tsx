// app/exec/calendar/page.tsx
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyToken, COOKIE_NAME } from "@/lib/auth";
import ExecCalendarEditorClient from "./ExecCalendarEditorClient";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function ExecCalendarPage() {
  const jar = await cookies();
  const token = jar.get(COOKIE_NAME)?.value ?? "";
  const session = token ? await verifyToken(token) : null;
  if (!session) redirect("/?auth=required");

  const canEdit =
    session.role === "ADMIN" || session.role === "EDITOR" || session.isSuper;
  if (!canEdit) redirect("/"); // 権限なしはトップへ

  return <ExecCalendarEditorClient />;
}
