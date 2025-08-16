import { prisma } from "../../../../lib/prisma";
import QRClient from "./qr-client";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function Page({ params }: { params: { token: string } }) {
  const rec = await prisma.emailToken.findUnique({
    where: { token: params.token },
    include: { participant: true },
  });
  if (!rec) return notFound();
  if (rec.expiresAt < new Date()) return notFound();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-white to-slate-50 p-6">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 ring-1 ring-slate-200 shadow-sm">
        <h1 className="text-lg font-bold">
          {rec.meetingCode} 出席用QR
        </h1>
        <p className="text-sm text-slate-600 mt-1">
          {rec.participant.name} / {rec.participant.district} / {rec.participant.troop}
        </p>

        <div className="mt-4">
          <QRClient
            meeting={rec.meetingCode}
            participantId={rec.participantId}
            name={rec.participant.name}
          />
        </div>

        <p className="mt-4 text-xs text-slate-500">
          本リンクは {new Date(rec.expiresAt).toLocaleString()} まで有効です。
          オフライン表示のためにスクリーンショット保存も推奨します。
        </p>
      </div>
    </div>
  );
}
