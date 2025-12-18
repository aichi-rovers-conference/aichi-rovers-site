import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import styles from "./AdminSuggestionBox.module.css";
import ArcHeader from "@/src/components/ArcHeader";
import AdminSuggestionBoxClient from "./AdminSuggestionBoxClient";

const STATUSES = ["NEW", "REVIEWED", "RESOLVED", "SPAM"] as const;
type Status = (typeof STATUSES)[number];

async function updateStatusAction(formData: FormData) {
  "use server";
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "") as Status;

  if (!id) return;
  if (!STATUSES.includes(status)) return;

  const data: any = {
    status,
  };

  // reviewedAt は REVIEWED のときだけ付与（運用方針次第で変えてOK）
  if (status === "REVIEWED") data.reviewedAt = new Date();

  // RESOLVED のときは resolvedAt を付与、RESOLVED以外なら消す（「解決時刻」を正しく扱う）
  if (status === "RESOLVED") data.resolvedAt = new Date();
  else data.resolvedAt = null;

  // SPAM は公開させない（事故防止）
  if (status === "SPAM") data.isPublic = false;

  await prisma.suggestion.update({
    where: { id },
    data,
  });

  revalidatePath("/exec/suggestion-box");
}

async function updateNoteAction(formData: FormData) {
  "use server";
  const id = String(formData.get("id") ?? "");
  const adminNote = String(formData.get("adminNote") ?? "").trim().slice(0, 1000);
  if (!id) return;

  await prisma.suggestion.update({
    where: { id },
    data: { adminNote },
  });

  revalidatePath("/exec/suggestion-box");
}

async function updatePublicAction(formData: FormData) {
  "use server";
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  // checkbox：チェックされてなければ null になる
  const isPublic = formData.get("isPublic") === "1";
  const publicNote = String(formData.get("publicNote") ?? "").trim().slice(0, 1000);

  // SPAMは強制で公開OFF
  const cur = await prisma.suggestion.findUnique({
    where: { id },
    select: { status: true },
  });
  const safeIsPublic = cur?.status === "SPAM" ? false : isPublic;

  await prisma.suggestion.update({
    where: { id },
    data: {
      isPublic: safeIsPublic,
      publicNote,
    },
  });

  revalidatePath("/exec/suggestion-box");
}

export default async function AdminSuggestionBox({ take }: { take: number }) {
  const [itemsAll, grouped, itemsNEW, itemsREVIEWED, itemsRESOLVED, itemsSPAM] =
    await Promise.all([
      prisma.suggestion.findMany({ orderBy: { createdAt: "desc" }, take }),
      prisma.suggestion.groupBy({ by: ["status"], _count: { _all: true } }),
      prisma.suggestion.findMany({ where: { status: "NEW" }, orderBy: { createdAt: "desc" }, take }),
      prisma.suggestion.findMany({
        where: { status: "REVIEWED" },
        orderBy: { createdAt: "desc" },
        take,
      }),
      prisma.suggestion.findMany({
        where: { status: "RESOLVED" },
        orderBy: { createdAt: "desc" },
        take,
      }),
      prisma.suggestion.findMany({ where: { status: "SPAM" }, orderBy: { createdAt: "desc" }, take }),
    ]);

  const counts = Object.fromEntries(STATUSES.map((s) => [s, 0])) as Record<Status, number>;
  for (const g of grouped) counts[g.status as Status] = g._count._all;

  const serialize = (it: any) => ({
    id: it.id,
    subject: it.subject,
    body: it.body,
    status: it.status as Status,
    category: it.category ?? null,
    isAnonymous: it.isAnonymous,
    contactEmail: it.contactEmail ?? null,
    origin: it.origin ?? null,
    createdAt: it.createdAt.toISOString(),
    reviewedAt: it.reviewedAt ? it.reviewedAt.toISOString() : null,
    resolvedAt: it.resolvedAt ? it.resolvedAt.toISOString() : null,
    adminNote: it.adminNote ?? null,

    // ★追加
    isPublic: Boolean(it.isPublic),
    publicNote: it.publicNote ?? null,
  });

  return (
    <div className={styles.page}>
      <div className={styles.topBar} />
      <ArcHeader />

      <AdminSuggestionBoxClient
        counts={counts}
        itemsAll={itemsAll.map(serialize)}
        itemsByStatus={{
          NEW: itemsNEW.map(serialize),
          REVIEWED: itemsREVIEWED.map(serialize),
          RESOLVED: itemsRESOLVED.map(serialize),
          SPAM: itemsSPAM.map(serialize),
        }}
        updateStatusAction={updateStatusAction}
        updateNoteAction={updateNoteAction}
        updatePublicAction={updatePublicAction}
      />
    </div>
  );
}
