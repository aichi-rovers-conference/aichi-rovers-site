"use client";

import HeroImage from "./HeroImage";
import { useSiteImages } from "@/src/hooks/useSiteImages";
import type { ComponentProps } from "react";

type Props = ComponentProps<typeof HeroImage> & {
  siteKey: string;
};

export default function SiteHeroImage({ siteKey, src: fallback, ...props }: Props) {
  const { images } = useSiteImages();
  const src = (images[siteKey] as string) ?? fallback;
  return <HeroImage src={src} {...props} />;
}
