/** @type {import('tailwindcss').Config} */
export default {
    content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
    theme: {
        extend: {
            colors: {
                bgDark: "#0d0814",
                cardDark: "#160f24",
                purpleAccent: "#7c3aed",
            },
        },
    },
    plugins: [],
};
