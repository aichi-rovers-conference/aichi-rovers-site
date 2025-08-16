// app/exec/participants/layout.tsx
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import ArcHeader from "@/components/ArcHeader";
import { verifyToken, COOKIE_NAME } from "@/lib/auth";
import ParticipantsNav from "./ParticipantsNav";

export default async function ParticipantsLayout({ children }: { children: ReactNode }) {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value ?? "";
  const session = token ? await verifyToken(token) : null;
  if (!session) redirect("/?auth=required");

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-slate-50">
      <div className="h-2 w-full bg-gradient-to-r from-violet-400 via-fuchsia-400 to-indigo-400" />
      <ArcHeader />
      <main className="mx-auto max-w-7xl px-4 md:px-8 py-8">
        {/* 余白を少し詰めて、ボタンは視認性UP（大きめ） */}
        <ParticipantsNav className="mt-3" />
        <section className="mt-6">{children}</section>
      </main>
    </div>
  );
}
