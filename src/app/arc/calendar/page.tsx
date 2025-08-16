import type { Metadata } from "next";
import CalendarPage from "./CalendarPageClient";

export const metadata: Metadata = {
  title: "事業カレンダー",
  description: "愛知ローバース会議（ARC）の事業カレンダー。募集案内と年間スケジュール。",
};

export default function Page() {
  return <CalendarPage />;
}
