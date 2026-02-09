/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./app/**/*.{js,ts,jsx,tsx,mdx}",
        "./pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./components/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            colors: {
                primary: "#f43f5e",
                secondary: "#52525b",
                danger: "#ef4444",
                success: "#10b981",
                warning: "#f59e0b",
                background: "#09090b",
                surface: "#18181b",
                "surface-highlight": "#27272a",
                "surface-hover": "#3f3f46",
            },
            borderRadius: {
                "3xl": "1.5rem",
                "4xl": "2rem",
            },
            boxShadow: {
                glow: "0 0 15px rgba(244, 63, 94, 0.3)",
            },
        },
    },
    plugins: [],
};
