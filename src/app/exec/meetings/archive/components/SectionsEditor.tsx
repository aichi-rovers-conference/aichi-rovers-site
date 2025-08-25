// app/exec/meetings/archive/components/SectionsEditor.tsx
"use client";
import React, { useCallback } from "react";
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, useSortable, arrayMove, rectSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { SectionGroup, ChildTimelineItem, GalleryItem, GalleryLayout } from "../types";
import TimeInput from "@/src/app/exec/meetings/archive/components/inputs/TimeInput"; // ← ルートの TimeInput を参照
import PageGalleryEditor from "./PageGalleryEditor";

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

  setChildGalleryLayout: (groupId: string, childId: string, layout: GalleryLayout) => void;
};

/* ========= 本体 ========= */
export default function SectionsEditor(props: Props) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  // 子要素の並び替えを保存
  const onDragEndChildren = (groupId: string, items: string[], children: SectionGroup["children"]) =>
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      const oldIndex = items.indexOf(String(active.id));
      const newIndex = items.indexOf(String(over.id));
      if (oldIndex < 0 || newIndex < 0) return;
      const newOrderIds = arrayMove(items, oldIndex, newIndex);
      const byId = new Map(children.map((c) => [c.id, c]));
      const reordered = newOrderIds.map((id) => byId.get(id)!).filter(Boolean);
      props.updateGroup(groupId, { children: reordered } as Partial<SectionGroup>);
    };

  // ===== 子ギャラリー: ファイル選択 → 即時プレビュー → 本アップロード =====
  const makeChildOnFile = useCallback(
    (groupId: string, childId: string) =>
      (imgId: string, e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.currentTarget.files?.[0];
        if (!file) return;
        // 即時プレビュー（仮URL）
        const localUrl = URL.createObjectURL(file);
        props.setChildImage(groupId, childId, imgId, { url: localUrl });
        // 本アップロード（完了後、サーバーURLで上書きされる）
        props.onChildImageFile(groupId, childId, imgId, e);
      },
    [props]
  );

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

              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={onDragEndChildren(g.id, childIds, g.children)}
              >
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
                                    <div className="grid grid-cols-[120px,1fr] gap-3 items-center">
                                      <div>
                                        <label className="text-xs text-slate-500 block mb-1">時刻</label>
                                        <TimeInput
                                          value={row.time ?? ""}
                                          onChange={(v) => props.setTimelineRow(g.id, c.id, row.id, { time: v })}
                                        />
                                      </div>
                                    </div>

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
                          </SortableChildCard>
                        );
                      }

                      // ==== ギャラリー（PageGalleryEditor を流用） ====
                      if (c.kind === "gallery") {
                        const currentLayout: GalleryLayout = c.layout ?? "grid";
                        return (
                          <SortableChildCard key={c.id} id={c.id} header="ギャラリー" onRemove={() => props.rmChild(g.id, c.id)}>
                            <PageGalleryEditor
                              items={c.images}
                              add={() => props.addChildImage(g.id, c.id)}
                              update={(imgId, patch) => props.setChildImage(g.id, c.id, imgId, patch)}
                              remove={(imgId) => props.rmChildImage(g.id, c.id, imgId)}
                              onFile={makeChildOnFile(g.id, c.id)}  // ★ 即時プレビュー＋アップロード
                              uploadingMap={props.uploadingMap}
                              layout={currentLayout}
                              setLayout={(v) => props.setChildGalleryLayout(g.id, c.id, v)}
                            />
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
