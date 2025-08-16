import type { Metadata } from "next";
import AboutArcPage from "./AboutArcPageClient";

export const metadata: Metadata = {
  title: "ARCとは",
  description: "愛知ローバース会議（ARC）の概要と主な活動の紹介ページ。",
};

export default function Page() {
  return <AboutArcPage />;
}
