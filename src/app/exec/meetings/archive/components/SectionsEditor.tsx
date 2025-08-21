// app/exec/meetings/archive/components/SectionsEditor.tsx
"use client";
import React, { useEffect, useRef, useState } from "react";
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, useSortable, arrayMove, rectSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { SectionGroup, ChildTimelineItem, GalleryItem, GalleryLayout } from "../types";

/** 編集プレビュー用の軽量スライドショー */
function MiniSlideshow({ items }: { items: GalleryItem[] }) {
  const [idx, setIdx] = useState(0);
  const urls = items.filter((x) => !!x.url);
  const has = urls.length > 0;
  const safe = has ? ((idx % urls.length) + urls.length) % urls.length : 0;

  useEffect(() => {
    if (!has) return;
    const t = setInterval(() => setIdx((v) => v + 1), 3500);
    return () => clearInterval(t);
  }, [has, urls.length]);

  if (!has) {
    return (
      <div className="flex h-48 items-center justify-center rounded-xl border border-dashed text-slate-500">
        画像がありません
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-white/90">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={urls[safe].url!} alt={urls[safe].caption ?? ""} className="h-48 w-full object-cover" />
      <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1">
        {urls.map((_, i) => (
          <span key={i} className={`h-1.5 w-4 rounded-full ${i === safe ? "bg-white" : "bg-white/50"}`} />
        ))}
      </div>
      <div className="pointer-events-none absolute inset-0 flex items-center justify-between p-2">
        <button type="button" className="pointer-events-auto rounded-full bg-white/80 px-2 py-1 shadow"
          onClick={() => setIdx((v) => v - 1)} aria-label="前へ">‹</button>
        <button type="button" className="pointer-events-auto rounded-full bg-white/80 px-2 py-1 shadow"
          onClick={() => setIdx((v) => v + 1)} aria-label="次へ">›</button>
      </div>
    </div>
  );
}

/* ========= 小物 ========= */
function DragHandle(props: React.HTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      {...props}
      className={`cursor-grab active:cursor-grabbing rounded-md p-2 text-slate-500 hover:text-slate-700 ${props.className ?? ""}`}
      title="ドラッグして並べ替え"
      aria-label="ドラッグして並べ替え"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <rect x="4" y="6" width="16" height="2" rx="1"></rect>
        <rect x="4" y="11" width="16" height="2" rx="1"></rect>
        <rect x="4" y="16" width="16" height="2" rx="1"></rect>
      </svg>
    </button>
  );
}

function SortableChildCard({
  id, header, onRemove, children, handleListeners,
}: {
  id: string;
  header: React.ReactNode;
  onRemove: () => void;
  children: React.ReactNode;
  handleListeners?: Record<string, any>;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style: React.CSSProperties = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.85 : 1 };
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      className="rounded-lg border border-slate-200 p-3 bg-white/90 shadow-none"
    >
      <div className="mb-2 flex items-center gap-2">
        <DragHandle {...(handleListeners ?? listeners)} />
        <div className="rounded-full bg-slate-100 px-2 py-1 text-xs">{header}</div>
        <button onClick={onRemove} className="ml-auto text-sm text-red-600">削除</button>
      </div>
      {children}
    </div>
  );
}

/* ========= プロップス ========= */
type Props = {
  sections: SectionGroup[];
  addGroup: () => void;
  updateGroup: (id: string, patch: Partial<SectionGroup>) => void;
  rmGroup: (id: string) => void;

  addChildToGroup: (groupId: string, kind: "text" | "timeline" | "gallery") => void;
  rmChild: (groupId: string, childId: string) => void;

  setChildText: (groupId: string, childId: string, body: string) => void;

  addTimelineRow: (groupId: string, childId: string) => void;
  setTimelineRow: (groupId: string, childId: string, rowId: string, patch: Partial<ChildTimelineItem>) => void;
  rmTimelineRow: (groupId: string, childId: string, rowId: string) => void;

  addChildImage: (groupId: string, childId: string) => void;
  setChildImage: (groupId: string, childId: string, imgId: string, patch: Partial<GalleryItem>) => void;
  rmChildImage: (groupId: string, childId: string, imgId: string) => void;
  onChildImageFile: (groupId: string, childId: string, imgId: string, e: React.ChangeEvent<HTMLInputElement>) => void;
  uploadingMap: Record<string, boolean>;

  /** ※必須：子ギャラリーのレイアウトを保存する */
  setChildGalleryLayout: (groupId: string, childId: string, layout: GalleryLayout) => void;
};

/* ========= 時刻入力（“:”固定＆連結入力） ========= */
function toHalf(s: string) {
  return s.replace(/[！-～]/g, ch => String.fromCharCode(ch.charCodeAt(0) - 0xFEE0)).replace("：", ":");
}
function clamp(n: number, min: number, max: number) { return Math.min(max, Math.max(min, n)); }
function two(n: number) { return String(n).padStart(2, "0"); }
function digitsToHHMM(digits: string): string {
  const d = digits.replace(/\D/g, "").slice(0, 4);
  if (d.length === 0) return "00:00";
  if (d.length <= 2) return d.padStart(2, "0") + ":00";
  return d.slice(0, 2).padStart(2, "0") + ":" + d.slice(2).padEnd(2, "0");
}

function TimeInput({
  value,
  onChange,
  onEnter,
  className,
}: {
  value: string | undefined;
  onChange: (hhmm: string) => void;
  onEnter?: () => void;
  className?: string;
}) {
  const digitsRef = useRef<string>("");

  useEffect(() => {
    const m = /^(\d{1,2}):(\d{1,2})$/.exec(value ?? "");
    if (m) {
      digitsRef.current = String(m[1]).padStart(2, "0") + String(m[2]).padStart(2, "0");
    }
  }, [value]);

  const setDigits = (d: string) => {
    const s = d.replace(/\D/g, "").slice(0, 4);
    digitsRef.current = s;
    onChange(digitsToHHMM(s));
  };

  const keyHandler: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
    if (/^[0-9]$/.test(e.key)) {
      e.preventDefault();
      setDigits(digitsRef.current + e.key);
      return;
    }
    if (e.key === "Backspace") {
      e.preventDefault();
      setDigits(digitsRef.current.slice(0, -1));
      return;
    }
    if (e.key === "Delete") {
      e.preventDefault();
      setDigits("");
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      onEnter?.();
    }
  };

  const handlePaste: React.ClipboardEventHandler<HTMLInputElement> = (e) => {
    const txt = e.clipboardData.getData("text");
    const d = txt.replace(/\D/g, "").slice(0, 4);
    if (d) {
      e.preventDefault();
      setDigits(d);
    }
  };

  return (
    <input
      type="text"
      className={`rounded-lg border px-3 py-1.5 text-center ${className ?? ""}`}
      value={digitsToHHMM(digitsRef.current)}
      onKeyDown={keyHandler}
      onPaste={handlePaste}
      onChange={() => {}}
    />
  );
}

/* ========= 本体 ========= */
export default function SectionsEditor(props: Props) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const onDragEndChildren = (groupId: string, items: string[]) => (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = items.indexOf(String(active.id));
    const newIndex = items.indexOf(String(over.id));
    if (oldIndex < 0 || newIndex < 0) return;
    arrayMove(items, oldIndex, newIndex);
    // 並べ替えの実データ更新は親側に任せる場合はここでコールバックを用意してください
  };

  return (
    <section className="mb-12">
      <div className="mb-3 flex items-center gap-3">
        <h2 className="text-lg font-semibold">本文セクション</h2>
        <button onClick={props.addGroup} className="ml-auto rounded-lg border px-3 py-1.5">小見出し（H2）を追加</button>
      </div>

      <div className="space-y-5">
        {props.sections.map((g) => {
          const childIds = g.children.map((c) => c.id);
          return (
            <div key={g.id} className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
              <div className="flex items-center gap-3">
                <span className="h-6 w-1.5 rounded bg-indigo-600" />
                <input
                  className="flex-1 rounded-lg border px-3 py-2"
                  placeholder="小見出し（H2）"
                  value={g.heading}
                  onChange={(e) => props.updateGroup(g.id, { heading: e.target.value })}
                />
                <button onClick={() => props.rmGroup(g.id)} className="text-sm text-red-600">削除</button>
              </div>

              <div className="mt-3 flex items-center gap-2">
                <span className="text-sm text-slate-600">コンテンツを追加：</span>
                <select
                  className="rounded-lg border px-2 py-1.5"
                  onChange={(e) => {
                    const raw = e.target.value as "" | "text" | "timeline" | "gallery";
                    if (!raw) return;
                    props.addChildToGroup(g.id, raw);
                    e.currentTarget.value = "";
                  }}
                  defaultValue=""
                >
                  <option value="" disabled>選択してください</option>
                  <option value="text">テキスト</option>
                  <option value="timeline">タイムスケジュール（タイムライン）</option>
                  <option value="gallery">ギャラリー</option>
                </select>
                <span className="text-xs text-slate-500">左の≡アイコンをドラッグして順序変更。</span>
              </div>

              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEndChildren(g.id, childIds)}>
                <SortableContext items={childIds} strategy={rectSortingStrategy}>
                  <div className="mt-4 space-y-4">
                    {g.children.map((c) => {
                      if (c.kind === "text") {
                        return (
                          <SortableChildCard key={c.id} id={c.id} header="テキスト" onRemove={() => props.rmChild(g.id, c.id)}>
                            <textarea
                              className="min-h-[120px] w-full rounded-lg border px-3 py-2"
                              placeholder="本文"
                              value={c.body}
                              onChange={(e) => props.setChildText(g.id, c.id, e.target.value)}
                            />
                          </SortableChildCard>
                        );
                      }

                      if (c.kind === "timeline") {
                        return (
                          <SortableChildCard key={c.id} id={c.id} header="タイムスケジュール" onRemove={() => props.rmChild(g.id, c.id)}>
                            <div className="mb-2 flex items-center gap-2">
                              <button
                                onClick={() => props.addTimelineRow(g.id, c.id)}
                                className="rounded-lg border px-3 py-1.5 text-sm"
                              >
                                行を追加
                              </button>
                              <span className="text-xs text-slate-500">
                                数字を連続入力（例 1245 → 12:45）／Enterで行追加
                              </span>
                            </div>

                            <div className="space-y-2">
                              {c.items.map((row, idx) => {
                                const isLast = idx === c.items.length - 1;
                                return (
                                  <div key={row.id} className="grid grid-cols-1 items-start gap-2 md:grid-cols-7">
                                    <TimeInput
                                      className="md:col-span-1"
                                      value={row.time ?? "00:00"}
                                      onChange={(hhmm) => props.setTimelineRow(g.id, c.id, row.id, { time: hhmm })}
                                      onEnter={() => props.addTimelineRow(g.id, c.id)}
                                    />
                                    <input
                                      className="md:col-span-3 rounded-lg border px-2 py-1.5"
                                      placeholder="内容"
                                      value={row.label}
                                      onChange={(e) => props.setTimelineRow(g.id, c.id, row.id, { label: e.target.value })}
                                      onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                          e.preventDefault();
                                          props.addTimelineRow(g.id, c.id);
                                        }
                                      }}
                                    />
                                    <input
                                      className="md:col-span-2 rounded-lg border px-2 py-1.5"
                                      placeholder="備考（任意）"
                                      value={row.note ?? ""}
                                      onChange={(e) => props.setTimelineRow(g.id, c.id, row.id, { note: e.target.value })}
                                      onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                          e.preventDefault();
                                          props.addTimelineRow(g.id, c.id);
                                        }
                                      }}
                                    />
                                    <div className="md:col-span-1 flex items-center justify-end gap-2">
                                      {isLast && (
                                        <button
                                          onClick={() => props.addTimelineRow(g.id, c.id)}
                                          className="rounded-lg border px-2 py-1 text-xs"
                                          title="この下に行を追加"
                                        >
                                          ＋ 行追加
                                        </button>
                                      )}
                                      <button
                                        onClick={() => props.rmTimelineRow(g.id, c.id, row.id)}
                                        className="text-sm text-red-600"
                                      >
                                        削除
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}

                              {c.items.length === 0 && (
                                <p className="text-sm text-slate-500">※ 「行を追加」から入力してください。</p>
                              )}
                            </div>

                            <div className="sticky bottom-0 -mx-3 mt-3 bg-gradient-to-t from-white/90 to-transparent px-3 py-2">
                              <button
                                onClick={() => props.addTimelineRow(g.id, c.id)}
                                className="w-full rounded-lg border px-3 py-1.5 text-sm md:w-auto"
                              >
                                行を追加
                              </button>
                            </div>
                          </SortableChildCard>
                        );
                      }

                      // ==== ギャラリー ====
                      if (c.kind === "gallery") {
                        const currentLayout: GalleryLayout = c.layout ?? "grid";
                        const name = `layout-${g.id}-${c.id}`;

                        return (
                          <SortableChildCard key={c.id} id={c.id} header="ギャラリー" onRemove={() => props.rmChild(g.id, c.id)}>
                            {/* レイアウト切替 & 追加 */}
                            <div className="mb-2 flex flex-wrap items-center gap-3">
                              <div className="text-sm text-slate-700">表示：</div>
                              <label className="flex items-center gap-1 text-sm">
                                <input
                                  type="radio"
                                  name={name}
                                  checked={currentLayout === "grid"}
                                  onChange={() => props.setChildGalleryLayout(g.id, c.id, "grid")}
                                />
                                グリッド
                              </label>
                              <label className="flex items-center gap-1 text-sm">
                                <input
                                  type="radio"
                                  name={name}
                                  checked={currentLayout === "slideshow"}
                                  onChange={() => props.setChildGalleryLayout(g.id, c.id, "slideshow")}
                                />
                                スライドショー
                              </label>

                              <button
                                onClick={() => props.addChildImage(g.id, c.id)}
                                className="ml-auto rounded-lg border px-3 py-1.5 text-sm"
                              >
                                画像を追加
                              </button>
                            </div>

                            {/* プレビュー（スライドショー） */}
                            {currentLayout === "slideshow" && (
                              <div className="mb-3">
                                <MiniSlideshow items={c.images} />
                              </div>
                            )}

                            {/* 編集UI（共通） */}
                            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                              {c.images.map((im) => (
                                <div key={im.id} className="rounded-xl border border-slate-200 bg-white/90 p-3">
                                  <div className="space-y-3">
                                    {im.url ? (
                                      // eslint-disable-next-line @next/next/no-img-element
                                      <img src={im.url} alt={im.caption ?? ""} className="h-40 w-full rounded-lg border object-cover" />
                                    ) : (
                                      <div className="flex h-40 items-center justify-center rounded-lg border border-dashed text-slate-500">
                                        画像がありません
                                      </div>
                                    )}
                                    <label className="inline-flex items-center gap-2 text-sm">
                                      <input
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) => props.onChildImageFile(g.id, c.id, im.id, e)}
                                        disabled={!!props.uploadingMap[im.id]}
                                      />
                                      {props.uploadingMap[im.id] ? "アップロード中…" : "画像ファイルを選択"}
                                    </label>
                                    <input
                                      className="w-full rounded-lg border px-3 py-2"
                                      placeholder="キャプション（任意）"
                                      value={im.caption ?? ""}
                                      onChange={(e) => props.setChildImage(g.id, c.id, im.id, { caption: e.target.value })}
                                    />
                                    <div className="text-right">
                                      <button onClick={() => props.rmChildImage(g.id, c.id, im.id)} className="text-sm text-red-600">削除</button>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>

                            {c.images.length === 0 && (
                              <p className="mt-2 text-sm text-slate-500">※ 「画像を追加」からファイルを選択してください。</p>
                            )}

                            {/* 下部にも追加ボタン */}
                            <div className="mt-3 flex justify-end">
                              <button
                                onClick={() => props.addChildImage(g.id, c.id)}
                                className="rounded-lg border px-3 py-1.5 text-sm"
                              >
                                ＋ 画像を追加
                              </button>
                            </div>
                          </SortableChildCard>
                        );
                      }

                      return null;
                    })}
                  </div>
                </SortableContext>
              </DndContext>
            </div>
          );
        })}

        {props.sections.length === 0 && (
          <p className="text-sm text-slate-500">
            ※ 「小見出し（H2）を追加」→プルダウンで「テキスト / タイムスケジュール / ギャラリー」を追加し、≡をドラッグして順序を変更できます。
          </p>
        )}
      </div>
    </section>
  );
}
