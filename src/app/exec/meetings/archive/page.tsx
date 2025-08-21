import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyToken, COOKIE_NAME } from "@/lib/auth";
import ArchiveBuilderClient from "./ArchiveBuilderClient";
import ArcHeader from "@/components/ArcHeader";

export default async function ArchivePage() {
  const cookieStore = await cookies(); // ← Promise なので await（型エラー回避）
  const token = cookieStore.get(COOKIE_NAME)?.value ?? "";
  const session = token ? await verifyToken(token) : null;
  if (!session) redirect("/?auth=required");
  
  return(
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      <div className="h-2 w-full bg-gradient-to-r from-violet-400 via-fuchsia-400 to-indigo-400" />
      <ArcHeader />
      <ArchiveBuilderClient />;
    </div>
  )
   
    
}
