import { useEffect, useState, type FormEvent } from "react";
import { useApp } from "../context/AppContext";
import { Search, Sparkles, X } from "lucide-react";

export type SearchMode = "ai" | "title";

type Variant = "hero" | "navbar";

interface SearchBarProps {
  onSearch: (query: string, mode: SearchMode) => void;
  initialValue?: string;
  initialMode?: SearchMode;
  variant?: Variant;

  // Useful for navbar: allow removing the mode toggle if you want
  showModeToggle?: boolean;

  // Optional: parent can control query/mode (if you later want URL-sync)
  value?: string;
  mode?: SearchMode;
}

export default function SearchBar({
  onSearch,
  initialValue = "",
  initialMode = "ai",
  variant = "hero",
  showModeToggle = true,
  value,
  mode,
}: SearchBarProps) {
  const { theme, t, language } = useApp();

  const [query, setQuery] = useState(initialValue);
  const [searchMode, setSearchMode] = useState<SearchMode>(initialMode);

  // If parent controls the value/mode, sync local state
  useEffect(() => {
    if (typeof value === "string") setQuery(value);
  }, [value]);

  useEffect(() => {
    if (mode) setSearchMode(mode);
  }, [mode]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    onSearch(q, searchMode);
  };

  const handleClear = () => {
    setQuery("");
    onSearch("", searchMode);
  };

  const isNavbar = variant === "navbar";

  return (
    <div className={isNavbar ? "w-full" : "w-full max-w-3xl mx-auto"}>
      {/* Mode toggle */}
      {showModeToggle && (
        <div className={isNavbar ? "hidden md:flex justify-center gap-2 mb-2" : "flex justify-center gap-2 mb-4"}>
          <button
            type="button"
            onClick={() => setSearchMode("title")}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-all ${
              searchMode === "title"
                ? "bg-white text-tmdb-dark-blue shadow-lg"
                : theme === "dark"
                ? "bg-white/10 text-gray-200 hover:bg-white/15"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
            title={language === "bg" ? "Търсене по заглавие" : "Search by title"}
          >
            <Search className="w-4 h-4" />
            {language === "bg" ? "Заглавие" : "Title"}
          </button>

          <button
            type="button"
            onClick={() => setSearchMode("ai")}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-all ${
              searchMode === "ai"
                ? "bg-gradient-to-r from-tmdb-light-green to-tmdb-light-blue text-tmdb-dark-blue shadow-lg"
                : theme === "dark"
                ? "bg-white/10 text-gray-200 hover:bg-white/15"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
            title={language === "bg" ? "AI търсене" : "AI search"}
          >
            <Sparkles className="w-4 h-4" />
            AI
          </button>
        </div>
      )}

      {/* Input */}
      <form onSubmit={handleSubmit} className="relative">
        <div
          className={`relative flex items-center rounded-full overflow-hidden border ${
            theme === "dark" ? "border-white/10 bg-black/20" : "border-gray-200 bg-white"
          } ${isNavbar ? "h-10" : "h-14"} shadow-xl`}
        >
          <div className={`pl-4 ${theme === "dark" ? "text-gray-300" : "text-gray-500"}`}>
            {searchMode === "ai" ? <Sparkles className="w-5 h-5" /> : <Search className="w-5 h-5" />}
          </div>

          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={
              searchMode === "ai"
                ? t.searchPlaceholder
                : language === "bg"
                ? "Търси по точно заглавие..."
                : "Search by exact title..."
            }
            className={`flex-1 px-3 bg-transparent focus:outline-none ${
              theme === "dark" ? "text-white placeholder:text-gray-400" : "text-gray-900 placeholder:text-gray-400"
            } ${isNavbar ? "text-sm" : "text-base"}`}
          />

          {query.length > 0 && (
            <button
              type="button"
              onClick={handleClear}
              className={`mr-2 p-2 rounded-full transition-colors ${
                theme === "dark" ? "text-gray-300 hover:bg-white/10" : "text-gray-500 hover:bg-gray-100"
              }`}
              aria-label="Clear search"
              title={language === "bg" ? "Изчисти" : "Clear"}
            >
              <X className="w-4 h-4" />
            </button>
          )}

          <button
            type="submit"
            className={`mr-2 rounded-full font-semibold transition-all ${
              searchMode === "ai"
                ? "bg-gradient-to-r from-tmdb-light-green to-tmdb-light-blue text-tmdb-dark-blue hover:opacity-90"
                : "bg-white/10 text-white hover:bg-white/20"
            } ${isNavbar ? "px-4 py-1.5 text-sm" : "px-6 py-2 text-base"}`}
          >
            {t.search}
          </button>
        </div>

        {/* Hint (only in hero mode) */}
        {!isNavbar && (
          <p className={`text-xs mt-3 flex items-center gap-2 ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>
            <Sparkles className="w-4 h-4 text-tmdb-light-blue" />
            {searchMode === "ai"
              ? t.searchHint
              : language === "bg"
              ? "Пример: “The Godfather”"
              : 'Example: "The Godfather"'}
          </p>
        )}
      </form>
    </div>
  );
}
