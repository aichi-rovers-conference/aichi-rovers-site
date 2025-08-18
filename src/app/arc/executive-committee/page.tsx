import type { Metadata } from "next";
import ExecCommitteePage from "./ExecCommitteePageClient";

export const metadata: Metadata = {
  title: "ARC運営委員会",
  description: "ARC運営委員会の紹介と体制について。",
};

export default function Page() {
  return <ExecCommitteePage />;
}