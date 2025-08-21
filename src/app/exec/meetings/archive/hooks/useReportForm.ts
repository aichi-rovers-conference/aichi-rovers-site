// app/exec/meetings/archive/hooks/useReportForm.ts
"use client";

import { useEffect, useMemo, useState } from "react";
import type {
  APIReport,
  GalleryItem,
  MeetingReportPayload,
  SaveModalInfo,
  SectionGroup,
  Child,
  ChildText,
  ChildTimeline,
  ChildGallery,
  GalleryLayout,
} from "../types";
import { normalizeSectionGroups, normalizeGalleryLayout } from "../types";

import {
  extractYouTubeId,
  fyFromDateISO,
  fyOptionsAsc,
  latestFiscalYear,
  toSlugByFYRound,
  todayISO,
} from "../lib/fy";
import { getAbsoluteUrl, safeJson, uploadImage } from "../lib/api";

export function useReportForm() {
  const [form, setForm] = useState<MeetingReportPayload>({
    title: "",
    slug: "",
    date: todayISO(),
    round: 1,
    fiscalYear: latestFiscalYear(),
    reportUrl: "",
    coverUrl: "",
    youtubeId: "",
    isPublished: false,
    pageGallery: [],
    pageGalleryLayout: "grid",
    sections: [],
  });
  const [topMediaType, setTopMediaType] = useState<"image" | "youtube">("image");
  const [status, setStatus] = useState<null | { ok: boolean; msg: string }>(null);
  const [loading, setLoading] = useState(false);
  const [loadingExisting, setLoadingExisting] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingMap, setUploadingMap] = useState<Record<string, boolean>>({});
  const [saveModal, setSaveModal] = useState<SaveModalInfo | null>(null);
  const [copied, setCopied] = useState(false);

  const fyOptsDesc = useMemo(() => fyOptionsAsc(2019).reverse(), []);

  useEffect(() => {
    setForm((f) => ({ ...f, fiscalYear: fyFromDateISO(f.date) }));
  }, [form.date]);

  useEffect(() => {
    setForm((f) => ({ ...f, slug: toSlugByFYRound(f.fiscalYear, f.round) }));
  }, [form.fiscalYear, form.round]);

  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      try {
        setLoadingExisting(true);
        const slug = toSlugByFYRound(form.fiscalYear, form.round);
        const url = getAbsoluteUrl(`/api/meeting-reports/${encodeURIComponent(slug)}`);
        const res = await fetch(url, { cache: "no-store", signal: controller.signal });
        const ct = res.headers.get("content-type") || "";
        if (!ct.includes("application/json")) return;
        const json = await res.json();
        if (res.ok && json?.ok && json?.data) {
          const d: APIReport & { groups?: unknown; pageGalleryLayout?: any } = json.data;

          // groups(新) を最優先、無ければ sections(配列なら) を復元
          const loadedSections: SectionGroup[] =
            Array.isArray((d as any).groups)
              ? normalizeSectionGroups((d as any).groups)
              : Array.isArray(d.sections)
              ? normalizeSectionGroups(d.sections)
              : [];

          setForm((f) => ({
            ...f,
            title: d.title ?? "",
            slug,
            date: d.date ? String(d.date).slice(0, 10) : f.date,
            fiscalYear: f.fiscalYear,
            round: f.round as 1 | 2 | 3 | 4,
            reportUrl: d.reportUrl ?? "",
            coverUrl: d.coverUrl ?? "",
            youtubeId: d.youtubeId ?? "",
            isPublished: Boolean(d.isPublished),
            pageGallery: Array.isArray(d.pageGallery) ? d.pageGallery : [],
            pageGalleryLayout:
              normalizeGalleryLayout((d as any).pageGalleryLayout) ?? (f.pageGalleryLayout ?? "grid"),
            sections: loadedSections,
          }));

          if ((d.youtubeId ?? "").trim()) setTopMediaType("youtube");
          else if ((d.coverUrl ?? "").trim()) setTopMediaType("image");
          setStatus({ ok: true, msg: "既存データを読み込みました" });
        } else if (res.status === 404 || json?.message === "not found") {
          setForm((f) => ({
            ...f,
            title: "",
            slug,
            reportUrl: "",
            coverUrl: "",
            youtubeId: "",
            isPublished: false,
            pageGallery: [],
            pageGalleryLayout: "grid",
            sections: [],
          }));
          setTopMediaType("image");
          setStatus(null);
        }
      } catch (e: any) {
        if (e?.name !== "AbortError")
          setStatus({ ok: false, msg: e?.message ?? "読み込みに失敗しました" });
      } finally {
        setLoadingExisting(false);
      }
    })();
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.fiscalYear, form.round]);

  useEffect(() => {
    if (form.youtubeId?.trim()) setTopMediaType("youtube");
    else if (form.coverUrl?.trim()) setTopMediaType("image");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const change = <K extends keyof MeetingReportPayload>(key: K, v: MeetingReportPayload[K]) =>
    setForm((f) => ({ ...f, [key]: v }));

  const onYouTubeChange = (raw: string) => change("youtubeId", extractYouTubeId(raw));

  const onCoverFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.currentTarget.files?.[0];
    e.currentTarget.value = "";
    if (!file) return;
    try {
      setUploadingCover(true);
      const url = await uploadImage(file);
      change("coverUrl", url);
      setStatus({ ok: true, msg: "トップ画像をアップロードしました" });
    } catch (err: any) {
      setStatus({ ok: false, msg: err?.message ?? "アップロードに失敗しました" });
    } finally {
      setUploadingCover(false);
    }
  };

  // Page Gallery
  const newId = () => crypto.randomUUID?.() ?? Math.random().toString(36).slice(2, 10);

  const addPagePhoto = () =>
    change("pageGallery", [...(form.pageGallery ?? []), { id: newId(), url: "", caption: "" }]);

  const updatePagePhoto = (id: string, patch: Partial<GalleryItem>) =>
    change("pageGallery", (form.pageGallery ?? []).map((g) => (g.id === id ? { ...g, ...patch } : g)));

  const rmPagePhoto = (id: string) =>
    change("pageGallery", (form.pageGallery ?? []).filter((g) => g.id !== id));

  const onPagePhotoFile = async (id: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.currentTarget.files?.[0];
    e.currentTarget.value = "";
    if (!file) return;
    try {
      setUploadingMap((m) => ({ ...m, [id]: true }));
      const url = await uploadImage(file);
      updatePagePhoto(id, { url });
      setStatus({ ok: true, msg: "画像をアップロードしました" });
    } catch (err: any) {
      setStatus({ ok: false, msg: err?.message ?? "アップロードに失敗しました" });
    } finally {
      setUploadingMap((m) => ({ ...m, [id]: false }));
    }
  };

  // Section Groups CRUD
  const addGroup = () =>
    change("sections", [
      ...(form.sections ?? []),
      { id: newId(), type: "group", heading: "", children: [] } as SectionGroup,
    ]);

  const updateGroup = (id: string, patch: Partial<SectionGroup>) =>
    change(
      "sections",
      (form.sections ?? []).map((s) => (s.id === id ? ({ ...s, ...patch } as SectionGroup) : s))
    );

  const rmGroup = (id: string) =>
    change("sections", (form.sections ?? []).filter((s) => s.id !== id));

  const addChildToGroup = (groupId: string, kind: "text" | "timeline" | "gallery") => {
    const id = newId();
    let child: Child;
    if (kind === "text") {
      child = { id, kind: "text", body: "" } as ChildText;
    } else if (kind === "timeline") {
      child = { id, kind: "timeline", items: [] } as ChildTimeline;
    } else {
      child = { id, kind: "gallery", images: [], layout: "grid" } as ChildGallery;
    }

    change(
      "sections",
      (form.sections ?? []).map((g) =>
        g.id === groupId ? { ...g, children: [...g.children, child] } : g
      )
    );
  };

  const rmChild = (groupId: string, childId: string) =>
    change(
      "sections",
      (form.sections ?? []).map((g) =>
        g.id === groupId ? { ...g, children: g.children.filter((c) => c.id !== childId) } : g
      )
    );

  const setChildText = (groupId: string, childId: string, body: string) =>
    change(
      "sections",
      (form.sections ?? []).map((g) =>
        g.id === groupId
          ? {
              ...g,
              children: g.children.map((c) =>
                c.id === childId && c.kind === "text" ? { ...c, body } : c
              ),
            }
          : g
      )
    );

  const addTimelineRow = (groupId: string, childId: string) =>
    change(
      "sections",
      (form.sections ?? []).map((g) =>
        g.id === groupId
          ? {
              ...g,
              children: g.children.map((c) =>
                c.id === childId && c.kind === "timeline"
                  ? { ...c, items: [...c.items, { id: newId(), time: "", label: "", note: "" }] }
                  : c
              ),
            }
          : g
      )
    );

  const setTimelineRow = (groupId: string, childId: string, rowId: string, patch: any) =>
    change(
      "sections",
      (form.sections ?? []).map((g) =>
        g.id === groupId
          ? {
              ...g,
              children: g.children.map((c) =>
                c.id === childId && c.kind === "timeline"
                  ? { ...c, items: c.items.map((r) => (r.id === rowId ? { ...r, ...patch } : r)) }
                  : c
              ),
            }
          : g
      )
    );

  const rmTimelineRow = (groupId: string, childId: string, rowId: string) =>
    change(
      "sections",
      (form.sections ?? []).map((g) =>
        g.id === groupId
          ? {
              ...g,
              children: g.children.map((c) =>
                c.id === childId && c.kind === "timeline"
                  ? { ...c, items: c.items.filter((r) => r.id !== rowId) }
                  : c
              ),
            }
          : g
      )
    );

  const addChildImage = (groupId: string, childId: string) =>
    change(
      "sections",
      (form.sections ?? []).map((g) =>
        g.id === groupId
          ? {
              ...g,
              children: g.children.map((c) =>
                c.id === childId && c.kind === "gallery"
                  ? { ...c, images: [...c.images, { id: newId(), url: "", caption: "" }] }
                  : c
              ),
            }
          : g
      )
    );

  const setChildImage = (
    groupId: string,
    childId: string,
    imgId: string,
    patch: Partial<GalleryItem>
  ) =>
    change(
      "sections",
      (form.sections ?? []).map((g) =>
        g.id === groupId
          ? {
              ...g,
              children: g.children.map((c) =>
                c.id === childId && c.kind === "gallery"
                  ? { ...c, images: c.images.map((im) => (im.id === imgId ? { ...im, ...patch } : im)) }
                  : c
              ),
            }
          : g
      )
    );

  const rmChildImage = (groupId: string, childId: string, imgId: string) =>
    setChildImage(groupId, childId, imgId, { url: "", caption: "" });

  const onChildImageFile = async (
    groupId: string,
    childId: string,
    imgId: string,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.currentTarget.files?.[0];
    e.currentTarget.value = "";
    if (!file) return;
    try {
      setUploadingMap((m) => ({ ...m, [imgId]: true }));
      const url = await uploadImage(file);
      setChildImage(groupId, childId, imgId, { url });
      setStatus({ ok: true, msg: "画像をアップロードしました" });
    } catch (err: any) {
      setStatus({ ok: false, msg: err?.message ?? "アップロードに失敗しました" });
    } finally {
      setUploadingMap((m) => ({ ...m, [imgId]: false }));
    }
  };

  /** ← 追加：子ギャラリーのレイアウトを保存（c.layout を更新） */
  const setChildGalleryLayout = (groupId: string, childId: string, layout: GalleryLayout) =>
    change(
      "sections",
      (form.sections ?? []).map((g) =>
        g.id === groupId
          ? {
              ...g,
              children: g.children.map((c) =>
                c.id === childId && c.kind === "gallery" ? { ...c, layout } : c
              ),
            }
          : g
      )
    );

  // 保存
  const previewUrl = useMemo(
    () =>
      form.reportUrl?.trim()
        ? form.reportUrl.trim()
        : `/arc/conference/reports/${encodeURIComponent(form.slug || "preview")}`,
    [form.reportUrl, form.slug]
  );

  async function save() {
    setLoading(true);
    setStatus(null);
    try {
      if (!form.title.trim()) throw new Error("タイトルを入力してください");
      if (!/^\d{4}-\d{2}-\d{2}$/.test(form.date))
        throw new Error("開催日は YYYY-MM-DD で入力してください");

      const payload: MeetingReportPayload & {
        // 互換のため API 側に渡すフィールド
        groups?: SectionGroup[];
      } = {
        ...form,
        title: form.title.trim(),
        reportUrl: form.reportUrl?.trim() || "",
        coverUrl: form.coverUrl?.trim() || "",
        youtubeId: form.youtubeId?.trim() || "",
        pageGallery: form.pageGallery ?? [],
        sections: form.sections ?? [],
        pageGalleryLayout: normalizeGalleryLayout(form.pageGalleryLayout) ?? "grid",
      };
      payload.fiscalYear = fyFromDateISO(payload.date);
      payload.slug = toSlugByFYRound(payload.fiscalYear, payload.round);

      if (topMediaType === "image") payload.youtubeId = "";
      else payload.coverUrl = "";

      // ★ 重要：DB には groups としても送る（表示側が groups を読むため）
      payload.groups = payload.sections;

      const url = getAbsoluteUrl(`/api/meeting-reports/${encodeURIComponent(payload.slug)}`);
      const res = await fetch(url, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await safeJson(res);
      if (!res.ok || !json?.ok) throw new Error(json?.message ?? "保存に失敗しました");

      setSaveModal({ url: previewUrl, isPublished: payload.isPublished, title: payload.title });
      setStatus({ ok: true, msg: "保存しました" });
    } catch (e: any) {
      setStatus({ ok: false, msg: e?.message ?? "保存に失敗しました" });
    } finally {
      setLoading(false);
    }
  }

  const copyLink = async () => {
    if (!saveModal?.url) return;
    try {
      const url = saveModal.url.startsWith("http")
        ? saveModal.url
        : (typeof window !== "undefined" ? location.origin : "") + saveModal.url;
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {}
  };

  return {
    form,
    setForm,
    change,
    fyOptsDesc,
    topMediaType,
    setTopMediaType,
    onYouTubeChange,
    onCoverFile,
    status,
    setStatus,
    loading,
    loadingExisting,
    uploadingCover,
    uploadingMap,
    addPagePhoto,
    updatePagePhoto,
    rmPagePhoto,
    onPagePhotoFile,
    addGroup,
    updateGroup,
    rmGroup,
    addChildToGroup,
    rmChild,
    setChildText,
    addTimelineRow,
    setTimelineRow,
    rmTimelineRow,
    addChildImage,
    setChildImage,
    rmChildImage,
    onChildImageFile,
    /** 追加 ↓ */
    setChildGalleryLayout,
    /** 追加 ↑ */
    save,
    previewUrl,
    saveModal,
    setSaveModal,
    copyLink,
    copied,
  };
}
