import { Sun, Moon } from "lucide-react";
import { useApp } from "../context/AppContext";

export default function ThemeToggle() {
  const { theme, toggleTheme } = useApp();

  return (
    <button
      onClick={toggleTheme}
      className={`p-2 rounded-lg transition-colors ${
        theme === "dark" ? "hover:bg-white/10 text-gray-200" : "hover:bg-gray-100 text-gray-700"
      }`}
      title={theme === "dark" ? "Light mode" : "Dark mode"}
    >
      {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
    </button>
  );
}
