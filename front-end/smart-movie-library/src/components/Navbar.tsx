import { Link, useNavigate, createSearchParams, useSearchParams } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { Globe, Menu, X, Film, Heart, LogOut, Search, Sparkles } from "lucide-react";
import { useApp } from "../context/AppContext";
import ThemeToggle from "./ThemeToggle";

type SearchMode = "ai" | "title";

interface NavbarProps {
  isLoggedIn: boolean;
  username?: string;
  onLogout?: () => void;
}

export default function Navbar({ isLoggedIn, username, onLogout }: NavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const navigate = useNavigate();
  const { theme, language, setLanguage, t } = useApp();

  // ✅ URL-driven search
  const [params] = useSearchParams();
  const urlQuery = useMemo(() => (params.get("q") || "").trim(), [params]);
  const urlMode = useMemo<SearchMode>(() => (params.get("mode") === "title" ? "title" : "ai"), [params]);

  // Local input mirrors URL
  const [q, setQ] = useState(urlQuery);
  const [mode, setMode] = useState<SearchMode>(urlMode);

  useEffect(() => setQ(urlQuery), [urlQuery]);
  useEffect(() => setMode(urlMode), [urlMode]);

  const toggleLanguage = () => setLanguage(language === "bg" ? "en" : "bg");

  const handleLogout = () => {
    onLogout?.();
    setUserMenuOpen(false);
    navigate("/");
  };

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const query = q.trim();

    if (!query) {
      navigate("/");
      return;
    }

    navigate({
      pathname: "/",
      search: createSearchParams({ q: query, mode }).toString(),
    });
  };

  const clearSearch = () => {
    setQ("");
    navigate("/");
  };

  return (
    <nav
      className={`sticky top-0 z-50 transition-colors ${
        theme === "dark" ? "bg-tmdb-dark-blue" : "bg-white shadow-md"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 lg:px-10">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* ✅ Logo: always go home and clear search */}
          <Link
            to="/"
            onClick={() => {
              setQ("");
              setMobileMenuOpen(false);
              setUserMenuOpen(false);
            }}
            className="flex items-center gap-3 shrink-0"
          >
            <div className="w-10 h-10 bg-gradient-to-r from-tmdb-light-green to-tmdb-light-blue rounded-lg flex items-center justify-center">
              <Film className="w-6 h-6 text-tmdb-dark-blue" />
            </div>
            <span className={`font-bold text-xl hidden sm:block ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
              {t.brand}
            </span>
          </Link>

          {/* ✅ Search in navbar (works) */}
          <div className="hidden md:flex flex-1 items-center justify-center">
            <div className="w-full max-w-xl">
              {/* Mode pills like your screenshot */}
              <div className="flex items-center justify-center gap-2 mb-2">
                <button
                  type="button"
                  onClick={() => setMode("title")}
                  className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all flex items-center gap-2 ${
                    mode === "title"
                      ? "bg-white text-tmdb-dark-blue shadow"
                      : theme === "dark"
                      ? "bg-white/10 text-gray-200 hover:bg-white/15"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  <Search className="w-4 h-4" />
                  {language === "bg" ? "Нормално" : "Normal"}
                </button>

                <button
                  type="button"
                  onClick={() => setMode("ai")}
                  className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all flex items-center gap-2 ${
                    mode === "ai"
                      ? "bg-gradient-to-r from-tmdb-light-green to-tmdb-light-blue text-tmdb-dark-blue shadow"
                      : theme === "dark"
                      ? "bg-white/10 text-gray-200 hover:bg-white/15"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  <Sparkles className="w-4 h-4" />
                  AI
                </button>
              </div>

              <form onSubmit={submitSearch} className="relative">
                <div
                  className={`flex items-center rounded-full border shadow-lg overflow-hidden ${
                    theme === "dark" ? "bg-black/20 border-white/10" : "bg-white border-gray-200"
                  }`}
                >
                  <div className={`pl-4 ${theme === "dark" ? "text-gray-300" : "text-gray-500"}`}>
                    {mode === "ai" ? <Sparkles className="w-5 h-5" /> : <Search className="w-5 h-5" />}
                  </div>

                  <input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder={
                      mode === "ai"
                        ? t.searchPlaceholder
                        : language === "bg"
                        ? "Търси по заглавие..."
                        : "Search by title..."
                    }
                    className={`flex-1 px-3 py-2 bg-transparent focus:outline-none ${
                      theme === "dark" ? "text-white placeholder:text-gray-400" : "text-gray-900 placeholder:text-gray-400"
                    }`}
                  />

                  {q && (
                    <button
                      type="button"
                      onClick={clearSearch}
                      className={`px-3 py-2 ${theme === "dark" ? "text-gray-300 hover:bg-white/10" : "text-gray-500 hover:bg-gray-100"}`}
                      title={language === "bg" ? "Изчисти" : "Clear"}
                    >
                      ✕
                    </button>
                  )}

                  <button
                    type="submit"
                    className="mx-2 my-1 px-5 py-2 rounded-full font-semibold bg-gradient-to-r from-tmdb-light-green to-tmdb-light-blue text-tmdb-dark-blue hover:opacity-90 transition-opacity"
                  >
                    {t.search}
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-2 shrink-0">
            <ThemeToggle />

            <button
              onClick={toggleLanguage}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg transition-colors ${
                theme === "dark" ? "hover:bg-white/10 text-gray-200" : "hover:bg-gray-100 text-gray-700"
              }`}
              title="Toggle language"
            >
              <Globe className="w-4 h-4" />
              <span className="text-sm font-semibold">{language.toUpperCase()}</span>
            </button>

            {isLoggedIn && (
              <Link
                to="/watchlist"
                className={`hidden md:flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                  theme === "dark" ? "text-white hover:bg-white/10" : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                <Heart className="w-4 h-4" />
                {t.watchlist}
              </Link>
            )}

            {isLoggedIn ? (
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen((v) => !v)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                    theme === "dark" ? "hover:bg-white/10 text-white" : "hover:bg-gray-100 text-gray-700"
                  }`}
                >
                  <div className="w-8 h-8 bg-gradient-to-r from-tmdb-light-green to-tmdb-light-blue rounded-full flex items-center justify-center">
                    <span className="text-tmdb-dark-blue font-bold text-sm">
                      {username?.charAt(0).toUpperCase() || "U"}
                    </span>
                  </div>
                  <span className="hidden sm:block font-medium">{username}</span>
                </button>

                {userMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setUserMenuOpen(false)} />
                    <div className={`absolute right-0 top-full mt-2 w-48 rounded-lg shadow-xl z-20 py-1 ${
                      theme === "dark" ? "bg-gray-800" : "bg-white"
                    }`}>
                      <button
                        onClick={handleLogout}
                        className={`flex items-center gap-3 w-full px-4 py-3 transition-colors ${
                          theme === "dark" ? "text-red-400 hover:bg-gray-700" : "text-red-500 hover:bg-gray-100"
                        }`}
                      >
                        <LogOut className="w-4 h-4" />
                        {t.logout}
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="hidden sm:flex items-center gap-2">
                <Link
                  to="/login"
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    theme === "dark" ? "text-white hover:bg-white/10" : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  {t.login}
                </Link>
                <Link
                  to="/register"
                  className="px-4 py-2 bg-gradient-to-r from-tmdb-light-green to-tmdb-light-blue text-tmdb-dark-blue font-semibold rounded-lg hover:opacity-90 transition-opacity text-sm"
                >
                  {t.register}
                </Link>
              </div>
            )}

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen((v) => !v)}
              className={`md:hidden p-2 rounded-lg transition-colors ${
                theme === "dark" ? "hover:bg-white/10 text-white" : "hover:bg-gray-100 text-gray-700"
              }`}
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile menu (simple) */}
        {mobileMenuOpen && (
          <div className={`md:hidden py-4 border-t ${theme === "dark" ? "border-gray-700" : "border-gray-200"}`}>
            <div className="flex flex-col gap-2">
              <Link
                to="/"
                onClick={() => setMobileMenuOpen(false)}
                className={`px-4 py-3 rounded-lg font-medium ${
                  theme === "dark" ? "text-white hover:bg-white/10" : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                {t.home}
              </Link>

              {isLoggedIn && (
                <Link
                  to="/watchlist"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`px-4 py-3 rounded-lg font-medium ${
                    theme === "dark" ? "text-white hover:bg-white/10" : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  {t.watchlist}
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
