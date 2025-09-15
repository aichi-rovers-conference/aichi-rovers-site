import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyToken, COOKIE_NAME } from "@/lib/auth";
import ArcHeader1 from "@/src/components/ArcHeader1";
import ArcFooter from "@/src/components/ArcFooter";
import EditorClient from "./EditorClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function getSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value ?? "";
  return token ? await verifyToken(token) : null;
}

function canWrite(session: any) {
  const role = session?.role ?? session?.user?.role;
  return role === "ADMIN" || role === "EDITOR";
}

export default async function ExcomEditorPage() {
  const session = await getSession();
  if (!session) redirect("/?auth=required");
  if (!canWrite(session)) redirect("/exec?auth=forbidden");

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      <div className="h-2 w-full bg-gradient-to-r from-violet-400 via-fuchsia-400 to-indigo-400" />
      <ArcHeader1 navItems={[{ name: "ダッシュボード", path: "/exec" }]} />
      <main className="mx-auto max-w-6xl px-4 md:px-8 py-8">
        <h1 className="text-2xl font-extrabold tracking-tight">運営委員 編集</h1>
        <EditorClient />
      </main>
      <ArcFooter />
    </div>
  );
}
