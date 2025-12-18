/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      keyframes: {
        "scroll-x": {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" }, // カードを2倍並べる前提
        },
        "stamp-pop": {
          "0%": {
            transform: "scale(0) rotate(-20deg)",
            opacity: 0,
          },
          "60%": {
            transform: "scale(1.1) rotate(5deg)",
            opacity: 1,
          },
          "100%": {
            transform: "scale(1) rotate(0deg)",
            opacity: 1,
          },
        },
      },
      animation: {
        "scroll-x": "scroll-x 45s linear infinite",
        "stamp-pop": "stamp-pop 0.6s ease-out forwards",
      },
    },
  },
  plugins: [],
};
