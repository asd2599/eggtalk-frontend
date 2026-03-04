/** @type {import('tailwindcss').Config} */
module.exports = {
  // 이 부분을 반드시 추가해야 합니다!
  darkMode: 'class', 
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}