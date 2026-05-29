import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyToken, COOKIE_NAME } from "@/lib/auth";
import ArcHeader from "@/src/components/ArcHeader";
import ArcFooter from "@/src/components/ArcFooter";
import SiteImagesClient from "./SiteImagesClient";

export const dynamic = "force-dynamic";

function canEdit(session: any) {
  const role = session?.role;
  return role === "ADMIN" || role === "EDITOR" || session?.isSuper === true;
}

export default async function SiteImagesPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value ?? "";
  const session = token ? await verifyToken(token) : null;

  if (!session) redirect("/?auth=required");
  if (!canEdit(session)) redirect("/exec?auth=forbidden");

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      <div className="h-2 w-full bg-gradient-to-r from-violet-400 via-fuchsia-400 to-indigo-400" />
      <ArcHeader />
      <main className="mx-auto max-w-4xl px-4 md:px-8 py-8">
        <h1 className="text-2xl font-extrabold tracking-tight">サイト写真管理</h1>
        <p className="mt-2 text-sm text-gray-600">
          各写真スロットに画像をアップロードすると、サイト全体に即時反映されます。
          「デフォルトに戻す」を押すと元の写真に戻ります。
        </p>
        <SiteImagesClient />
      </main>
      <ArcFooter />
    </div>
  );
}
