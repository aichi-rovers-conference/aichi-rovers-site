export const SITE_IMAGE_SLOTS = [
  { key: "hero.main",      label: "ヒーロー画像（全ページ共通）",            fallback: "/images/R6-3.JPG" },
  { key: "home.photo1",    label: "ホーム：写真1（輝かしい愛知の仲間と）",   fallback: "/images/home1.JPG" },
  { key: "home.photo2",    label: "ホーム：写真2（年4回の定例会）",           fallback: "/images/home2.JPG" },
  { key: "home.photo3",    label: "ホーム：写真3（自分たちによる意思決定）", fallback: "/images/home3.JPG" },
  { key: "arc.intro",      label: "ARCとは：紹介写真",                        fallback: "/images/arc-photo.png" },
  { key: "arc.activity1",  label: "ARC活動：総会・定例会",                    fallback: "/images/ARC_02.jpg" },
  { key: "arc.activity2",  label: "ARC活動：交流会",                          fallback: "/images/ARC_03.jpg" },
  { key: "arc.activity3",  label: "ARC活動：ローバーオリエンテーション",      fallback: "/images/ARC_04.jpg" },
  { key: "arc.activity4",  label: "ARC活動：運営委員セミナー",                fallback: "/images/ARC_05.jpg" },
  { key: "arc.activity5",  label: "ARC活動：その他事業",                      fallback: "/images/ARC_06.jpg" },
] as const;

export type SiteImageKey = typeof SITE_IMAGE_SLOTS[number]["key"];
