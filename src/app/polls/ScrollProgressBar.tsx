// src/app/polls/ScrollProgressBar.tsx
"use client";

import { motion, useScroll, useTransform } from "framer-motion";

export default function ScrollProgressBar() {
  const { scrollYProgress } = useScroll();
  const scaleX = useTransform(scrollYProgress, [0, 1], [0, 1]);

  return (
    <motion.div
      aria-hidden
      className="fixed left-0 right-0 top-0 z-40 h-0.5 origin-left bg-gray-900"
      style={{ scaleX }}
    />
  );
}
