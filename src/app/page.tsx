"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import Image from "next/image";
import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import { FaFacebook, FaInstagram, FaXTwitter, FaLine } from "react-icons/fa6";
import { X } from "lucide-react";
import { AnimatePresence } from "framer-motion";
import ExecAccessButton from "@/components/ExecAccessButton";
import ArcHeader1 from "@/components/ArcHeader1";

export default function Home() {
    const ref =useRef(null);
    const [isOpen, setIsOpen] = useState(false);
    const pathname = usePathname();

    const navItems = [
        { name: "ホーム", path: "/" },
        { name: "ARCとは", path: "/arc" },
        { name: "事業カレンダー", path: "/arc/calendar" },
        { name: "ARC定例会", path: "/arc/conference" },
        { name: "ARC運営委員会", path: "/arc/executive-committee" },
        { name: "ARCアンケート", path: "/polls" },
        { name: "ミニゲーム", path: "/games"},
    ];

    const Hero: React.FC<{ hideText: boolean }> = ({ hideText }) => {
        const ref = useRef<HTMLDivElement | null>(null);
        const { scrollYProgress } = useScroll({ 
            target: ref, 
            offset: ["start start", "end start"],
        });
        const yImg = useTransform(scrollYProgress, [0, 1], [0, 320]);
        const overlayOpacity = useTransform(scrollYProgress, [0, 1], [0.5, 0.6]);

        return (
            <div ref={ref} className="select-none relative w-full h-[60vh] overflow-hidden">
                <motion.div style={{ y: yImg}} className="absolute inset-0 will-change-transform">
                    <Image
                        src="/images/R6-3.JPG"
                        alt="Aichi Rovers Conference"
                        fill
                        className="object-cover z-0 select-none"
                        draggable={false}
                        priority
                        sizes="100vw"
                    />
                </motion.div>

                {/* 暗幕（濃さを少し変える） */}
                <motion.div
                    style={{ opacity: overlayOpacity }}
                    className="absolute inset-0 bg-black z-10"
                />

                {/* テキスト（ふわっと出る） */}
                <motion.div
                    className={`select-none absolute inset-0 z-20 flex flex-col items-center justify-center text-center ${hideText ? "pointer-events-none" : ""}`}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: hideText ? 0 : 1, y: 0 }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    aria-hidden={hideText}
                >
                    <h1 className="text-white text-7xl md:text-10xl font-bold mb-4 drop-shadow-lg">
                        <span className="text-red-700">A</span>ichi{" "}
                        <span className="text-red-700">R</span>overs{" "}
                        <span className="text-red-700">C</span>onference
                    </h1>
                    <p className="text-white font-bold text-5xl md:text-6xl mt-3">
                        愛知ローバース会議
                    </p>

                    <div className="mt-8">
                        <ExecAccessButton
                            mode="inline"
                            label="運営委員専用ページへ"
                            className="px-6"
                        />
                    </div>
                </motion.div>
            </div>
        );
    };

    return (
        <div className="w-full bg-white">
            {/* ヘッダー */}
            <ArcHeader1 navItems={navItems} />

            {/* ヒーロー画像セクション */}
            <Hero hideText={isOpen} />

                {/* 紹介セクション（ヒーローの外に出す！） */}
                <section className="w-full bg-white py-15 px-16 md:px-16">
                    <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                        {/* 左：文章 */}
                        <div>
                            <h2 className="pt-10 text-red-600 text-4xl md:text-5xl font-bold mb-6 text-gray-800">
                                輝かしい愛知の仲間と
                            </h2>
                            <p className="text-black font-bold text-1xl md:text-[19px] leading-relaxed mb-4">
                                愛知ローバース会議（Aichi Rovers Conference）は、ボーイスカウト愛知連盟に所属する
                                ローバースカウトおよび同年代指導者約700名により構成された組織です。
                            </p>
                            <p className="text-black font-bold text-1xl md:text-[19px] leading-relaxed">
                                スローガン “ミライで輝く仲間とともに、夢とロマンで世界を満たす。” を実現すべく、
                                日々仲間と様々な活動に取り組んでいます。
                            </p>
                        </div>

                        {/* 右：写真 */}
                        <div className="flex justify-center">
                            <Image
                                src="/images/sample.png"
                                alt="ARC活動写真"
                                width={500}
                                height={400}
                                className="rounded-lg shadow-lg object-cover select-none"
                                draggable={false}
                            />
                        </div>
                    </div>

                    <div className="pt-15 max-w-6xl mx-auto  grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                        <div>
                            <h2 className="pt-10 text-red-600 text-4xl md:text-5xl font-bold mb-6 text-gray-800">
                                年4回の定例会
                            </h2>
                            <p className="text-black font-bold text-1xl md:text-[19px] leading-relaxed mb-4">
                                愛知ローバース会議では年に1回の年次総会と年に4回の定例会を開催しています。平均60名以上が参加し、スカウトが情報交換や交流を行うための場として活用されています。ローバー活動の報告や募集、積極的な意見交換が繰り広げられています。
                            </p>
                            <Link href="/###" className="relative z-50">
                                <motion.span
                                    whileHover={{ y: -3, scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    transition={{ type: "spring", stiffness: 320, damping: 22 }}
                                    className="text-black inline-flex items-center gap-2 px-3 py-2 rounded-md border border-red-700 font-bold bg-white shadow-sm"
                                    style={{ display: "inline-flex" }}
                                >
                                    詳しくは「定例会」のページをご覧ください。
                                </motion.span>
                            </Link>
                        </div>

                        <div className="flex justify-center">
                            <Image
                                src="/images/sample.png"
                                alt="ARC活動写真"
                                width={500}
                                height={400}
                                className="rounded-lg shadow-lg object-cover select-none"
                                draggable={false}
                            />
                        </div>
                    </div>
                    <div className="pt-15 max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                        {/* 左：文章 */}
                        <div>
                            <h2 className="pt-10 text-red-600 text-4xl md:text-5xl font-bold mb-6 text-gray-800">
                                自分たちによる意思決定
                            </h2>
                            <p className="text-black font-bold text-1xl md:text-[19px] leading-relaxed mb-4">
                                愛知ローバース会議では年次総会を毎年行っており、ローバースカウト自身による意思決定を大切にしています。年次総会で選任された運営委員が定例会の運営を担うことで、愛知のローバースカウト全員の団結と活躍を目指しています。    
                            </p>
                        </div>

                        {/* 右：写真 */}
                        <div className="flex justify-center">
                            <Image
                                src="/images/sample.png"
                                alt="ARC活動写真"
                                width={500}
                                height={400}
                                className="rounded-lg shadow-lg object-cover select-none"
                                draggable={false}
                            />
                        </div>
                    </div>
                </section>
                <div className="max-w-6xl mx-auto mt-16 mb-10 px-20 md:px-16">
                    <div className="border-t border-gray-400" />
                </div>
                <section className="px-16 md:px-16 pb-8 bg-white">
                    <div className="flex justify-center">
                        <div className="relative overflow-hidden">
                            <Image
                                src="/images/コノハズクグレー.png"
                                alt="ARC コノハズク"
                                className="object-contain select-none [-webkit-user-drag:none]"
                                draggable={false}
                                width={300}
                                height={300}
                                onDragStart={(e) => e.preventDefault()}
                            />
                        </div>
                    </div>
                    <div className="pt-10 max-w-6xl mx-auto px-6 md:px-16">
                        <h3 className="text-red-600 text-4xl md:text-4xl font-bold mb-6">資料ダウンロード</h3>

                        {/* ダウンロード関連 */}
                        <ul className="space-y-3">
                            <li>
                                <motion.a 
                                    href="/files/ARC憲章R3年度版.pdf"
                                    download
                                    whileHover={{ y: -4, scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    transition={{ type: "spring", stiffness: 320, damping: 22 }}
                                    className="flex items-center gap-3 px-4 py-3 rounded-lg border border-gray-200 text-gray-800 font-semibold"
                                >
                                    <span className="text-red-600 text-xl leading-none">▶</span>
                                    <span>愛知ローバース会議 憲章</span>
                                </motion.a>
                            </li>
                            <li>
                                <motion.a 
                                    href="/files/令和7年度愛知ローバース会議年次総会資料.pdf"
                                    download
                                    whileHover={{ y: -4, scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    transition={{ type: "spring", stiffness: 320, damping: 22 }}
                                    className="flex items-center gap-3 px-4 py-3 rounded-lg border border-gray-200 text-gray-800 font-semibold"
                                >
                                    <span className="text-red-600 text-xl leading-none">▶</span>
                                    <span>R7年度ARC総会資料</span>
                                </motion.a>
                            </li>
                            <li>
                                <motion.a 
                                    href="/files/友情シールプロジェクト_フライヤー.pdf"
                                    download
                                    whileHover={{ y: -4, scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    transition={{ type: "spring", stiffness: 320, damping: 22 }}
                                    className="flex items-center gap-3 px-4 py-3 rounded-lg border border-gray-200 text-gray-800 font-semibold"
                                >
                                    <span className="text-red-600 text-xl leading-none">▶</span>
                                    <span>友情シールプロジェクト</span>
                                </motion.a>
                            </li>
                        </ul>
                        <p className="mt-6 text-sm text-gray-600">
                            ※編集・加工をしなければ常識の範囲内でご自由にお使いください。
                        </p>
                    </div>
                </section>

                {/* SNSリンクセクション */}
                <section className="bg-gray-100 py-6">
                    <div className="max-w-6xl mx-auto flex justify-center gap-8">
                        {/* Facebookリンク */}
                        <motion.a
                            href="https://www.facebook.com/aichirovers/?locale=ja_JP"
                            target="_blank"
                            rel="noopener noreferrer"
                            whileHover={{ y: -4, scale: 1.06 }}
                            whileTap={{ scale: 0.96 }}
                            transition={{ type: "spring", stiffness: 320, damping: 22 }}
                            className="text-blue-500 hover:text-blue-400 transition-colors duration-200"
                        >
                            <FaFacebook size={28} />
                        </motion.a>
                        
                        {/* Instagram（未開設） */}
                        <span className="text-pink-500 opacity-40 cursor-not-allowed">
                            <FaInstagram size={32} />
                        </span>

                        {/* Twitter（未開設） */}
                        <span className="text-black opacity-40 cursor-not-allowed">
                            <FaXTwitter size={32} />
                        </span>

                        {/* 公式LINE */}
                        <motion.a
                            href="https://lin.ee/BPXqTTv"
                            target="_blank"
                            rel="noopener noreferrer"
                            whileHover={{ y: -4, scale: 1.06 }}
                            whileTap={{ scale: 0.96 }}
                            transition={{ type: "spring", stiffness: 320, damping: 22 }}
                            className="text-green-600 hover:text-green-500 transition-colors duration-200"
                        >
                            <FaLine size={32} />
                        </motion.a>
                    </div>
                </section>

                {/* フッター */}
                <footer className="bg-gray-900 text-white py-6 mt-12">
                    <div className="max-w-6xl mx-auto px-6 md:px-16 text-center">
                        <p className="text-lg font-semibold mb-2">お問い合わせ</p>
                        <a 
                            href="mailto:aichi.rovers.conference@gmail.com"
                            className="text-red-400 hover:text-red-300 transition-colors duration-200"
                        >
                            aichi.rovers.conference@gmail.com
                        </a>
                        <p className="mt-4 text-sm text-gray-400">
                            &copy; {new Date().getFullYear()} Aichi Rovers Conference. All rights reserved.
                        </p>
                    </div>
                </footer>
        </div>
    );
}
