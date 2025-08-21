// app/arc/conference/page.tsx
import type { Metadata } from "next";
import MeetingsPage from "./MeetingsPageClient";

export const metadata: Metadata = {
  title: "ARC定例会",
  description: "ARC定例会の様子（年度別アーカイブ・YouTubeまとめ・各回の報告リンク）。",
};

export default function Page() {
  // ← 親で横方向を確実にクリップ
  return (
    <div className="w-full max-w-[100vw] overflow-x-clip">
      <MeetingsPage />
    </div>
  );
}
