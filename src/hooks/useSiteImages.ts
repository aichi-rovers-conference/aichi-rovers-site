"use client";

import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function useSiteImages() {
  const { data, mutate } = useSWR<Record<string, string>>(
    "/api/site-images",
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 60_000 }
  );
  return { images: data ?? {}, mutate };
}
