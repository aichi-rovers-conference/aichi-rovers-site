import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyToken, COOKIE_NAME } from "@/lib/auth";
import ArchiveBuilderClient from "./ArchiveBuilderClient";

export default async function ArchivePage() {
  const cookieStore = await cookies(); // ← Promise なので await（型エラー回避）
  const token = cookieStore.get(COOKIE_NAME)?.value ?? "";
  const session = token ? await verifyToken(token) : null;
  if (!session) redirect("/?auth=required");
  
  return <ArchiveBuilderClient />;
}
