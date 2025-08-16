// /components/polls/types.ts

const uid = () => `tmp_${Math.random().toString(36).slice(2, 10)}`;


export type QuestionType = "radio" | "checkbox" | "text" | "scale" | "rating";

export type ScaleMeta = {
  min: 0 | 1;
  max: number;
  minLabel: string;
  maxLabel: string;
};

export type RatingMeta = {
  count: number;
  shape: "star" | "heart" | "thumb";
};

export type Question = {
  id: string;             // ← クライアント用の常にあるID（仮ID含む）
  serverId?: string;      // ← 既存レコードのDB ID（新規は未定義）
  type: QuestionType | string;
  title: string;
  options?: string[];

  text?: {
    placeholder?: string;
    multiline?: boolean;
    rows?: number;
  };

  scale?: { min: 0 | 1; max: number; minLabel?: string; maxLabel?: string };
  rating?: { count: number; shape: "star" | "heart" | "circle" };
}