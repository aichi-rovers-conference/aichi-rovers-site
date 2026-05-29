"use client";

import Image, { type ImageProps } from "next/image";
import { useSiteImages } from "@/src/hooks/useSiteImages";

type SiteImageProps = Omit<ImageProps, "src"> & {
  siteKey: string;
  fallback: string;
};

export default function SiteImage({ siteKey, fallback, alt, ...props }: SiteImageProps) {
  const { images } = useSiteImages();
  const src = images[siteKey] ?? fallback;
  return <Image src={src} alt={alt} unoptimized={src.startsWith("/uploads/")} {...props} />;
}
