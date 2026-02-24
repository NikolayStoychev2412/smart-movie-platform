import { useState, useEffect, useRef, useCallback } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { moviesApi } from "../api/movies";
import type { Movie } from "../types";
import {
  Home,
  Film,
  Sun,
  Moon,
  Globe,
  Menu,
  X,
  User,
  LogOut,
  Search,
  ChevronDown,
  Bookmark,
  ShieldCheck,
  Star,
  Loader2
} from "lucide-react";

let _cachedMovies: Movie[] | null = null;

export default function Navbar() {
  const { theme, setTheme, language, setLanguage, user, logout, t } = useApp();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Movie[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loadingMovies, setLoadingMovies] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const searchRef = useRef<HTMLDivElement>(null);
  const mobileSearchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const isActive = (path: string) => location.pathname === path;

  const ensureMoviesLoaded = useCallback(async () => {
    if (_cachedMovies) return _cachedMovies;
    setLoadingMovies(true);
    try {
      const movies = await moviesApi.getAll();
      _cachedMovies = movies;
      return movies;
    } catch {
      return [];
    } finally {
      setLoadingMovies(false);
    }
  }, []);

  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setSuggestions([]);
      setSelectedIndex(-1);
      return;
    }

    const filterMovies = async () => {
      const movies = await ensureMoviesLoaded();
      const lower = searchQuery.trim().toLowerCase();
      const filtered = movies.filter((m) => {
        const title = (m.title ?? "").toLowerCase();
        const titleBg = (m.title_bg ?? "").toLowerCase();
        return title.includes(lower) || titleBg.includes(lower);
      });

      filtered.sort((a, b) => {
        const aTitle = (language === "bg" ? a.title_bg || a.title : a.title).toLowerCase();
        const bTitle = (language === "bg" ? b.title_bg || b.title : b.title).toLowerCase();
        const aStarts = aTitle.startsWith(lower) ? 1 : 0;
        const bStarts = bTitle.startsWith(lower) ? 1 : 0;
        if (aStarts !== bStarts) return bStarts - aStarts;
        return (b.tmdb_rating || b.average_rating || 0) - (a.tmdb_rating || a.average_rating || 0);
      });

      setSuggestions(filtered.slice(0, 6));
      setSelectedIndex(-1);
    };

    const timer = setTimeout(filterMovies, 150);
    return () => clearTimeout(timer);
  }, [searchQuery, ensureMoviesLoaded, language]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      const inDesktop = searchRef.current?.contains(target);
      const inMobile = mobileSearchRef.current?.contains(target);
      if (!inDesktop && !inMobile) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    setShowDropdown(false);
    setSearchQuery("");
  }, [location.pathname]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/browse?q=${encodeURIComponent(searchQuery.trim())}&mode=ai`);
      setSearchQuery("");
      setShowDropdown(false);
      setMobileMenuOpen(false);
    }
  };

  const handleSelect = (movie: Movie) => {
    navigate(`/movie/${movie.id}`);
    setSearchQuery("");
    setShowDropdown(false);
    setMobileMenuOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showDropdown || suggestions.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
    } else if (e.key === "Enter" && selectedIndex >= 0) {
      e.preventDefault();
      handleSelect(suggestions[selectedIndex]);
    } else if (e.key === "Escape") {
      setShowDropdown(false);
    }
  };

  const handleInputChange = (value: string) => {
    setSearchQuery(value);
    setShowDropdown(value.trim().length >= 2);
  };

  const navLinks = [
    { path: "/", label: t.home, icon: Home },
    { path: "/browse", label: t.moviesNav, icon: Film },
  ];

  const userNavLinks = user ? [
    ...navLinks,
    { path: "/watchlist", label: t.watchlist, icon: Bookmark },
  ] : navLinks;

  const SearchDropdown = ({ results, isMobile = false }: { results: Movie[]; isMobile?: boolean }) => {
    if (!showDropdown) return null;

    return (
      <div className={`absolute left-0 right-0 ${isMobile ? "top-full mt-1" : "top-full mt-2"} z-50 rounded-xl shadow-2xl border overflow-hidden ${
        theme === "dark"
          ? "bg-surface-2 border-border"
          : "bg-white border-border"
      }`}>
        {loadingMovies ? (
          <div className="flex items-center justify-center gap-2 px-4 py-6">
            <Loader2 className={`w-4 h-4 animate-spin text-muted`} />
            <span className={`text-sm text-muted`}>
              {t.loading}
            </span>
          </div>
        ) : results.length === 0 && searchQuery.trim().length >= 2 ? (
          <div className={`px-4 py-6 text-center text-sm text-muted`}>
            {t.noResults}
          </div>
        ) : (
          <>
            {results.map((movie, idx) => {
              const title = language === "bg" ? movie.title_bg || movie.title : movie.title;
              const posterUrl = movie.poster_url || (movie.poster_path ? `https://image.tmdb.org/t/p/w92${movie.poster_path}` : null);
              const rating = movie.tmdb_rating || movie.average_rating;
              const year = movie.release_year || (movie.release_date ? new Date(movie.release_date).getFullYear() : null);

              return (
                <button
                  key={movie.id}
                  onClick={() => handleSelect(movie)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                    idx === selectedIndex
                      ? theme === "dark" ? "bg-border" : "bg-surface-2"
                      : theme === "dark" ? "hover:bg-border/60" : "hover:bg-bg"
                  }`}
                >
                  {/* Poster thumbnail */}
                  {posterUrl ? (
                    <img
                      src={posterUrl}
                      alt={title}
                      className="w-9 h-[52px] rounded object-cover flex-shrink-0"
                      loading="lazy"
                    />
                  ) : (
                    <div className={`w-9 h-[52px] rounded flex items-center justify-center flex-shrink-0 ${
                      theme === "dark" ? "bg-border" : "bg-gray-200"
                    }`}>
                      <Film className="w-4 h-4 text-muted" />
                    </div>
                  )}

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate text-text`}>
                      {title}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {year && (
                        <span className={`text-xs text-muted`}>
                          {year}
                        </span>
                      )}
                      {rating && rating > 0 && (
                        <span className="flex items-center gap-0.5 text-xs text-yellow-500">
                          <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                          {(rating > 5 ? rating : rating * 2).toFixed(1)}
                        </span>
                      )}
                      {movie.genre && (
                        <span className={`text-xs truncate text-muted`}>
                          {language === "bg" && movie.genre_bg ? movie.genre_bg.split(",")[0] : movie.genre.split(",")[0]}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}

            {/* "View all results" footer */}
            {searchQuery.trim().length >= 2 && (
              <button
                onClick={() => handleSearch({ preventDefault: () => {} } as React.FormEvent)}
                className={`w-full px-4 py-2.5 text-sm font-medium flex items-center justify-center gap-2 border-t transition-colors ${
                  theme === "dark"
                    ? "border-border text-primary hover:bg-border/60"
                    : "border-border text-primary hover:bg-surface-2"
                }`}
              >
                <Search className="w-3.5 h-3.5" />
                {t.seeAllResultsFor} &ldquo;{searchQuery}&rdquo;
              </button>
            )}
          </>
        )}
      </div>
    );
  };

  return (
    <nav className={`sticky top-0 z-50 transition-colors ${
      theme === "dark"
        ? "bg-surface/[.98] border-b border-border"
        : "bg-white/98 border-b border-border shadow-sm"
    }`}>
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left: Logo + Nav grouped together */}
          <div className="flex items-center gap-6">
            <Link to="/" className="flex items-center gap-2 shrink-0 group">
              <img src="/logo.png" alt="MovieMaze logo" className="h-7 w-auto" />
              <span className="font-extrabold text-lg tracking-tight text-primary">MovieMaze</span>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-1">
              {userNavLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                    isActive(link.path)
                      ? "bg-primary text-white"
                      : theme === "dark"
                      ? "text-muted hover:text-text hover:bg-white/10"
                      : "text-muted hover:text-text hover:bg-surface-hover"
                  }`}
                >
                  <link.icon className="w-4 h-4" />
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Search Bar - Desktop with Dropdown */}
          <div ref={searchRef} className="hidden md:block flex-1 max-w-md mx-6 relative">
            <form onSubmit={handleSearch}>
              <div className="relative">
                <input
                  ref={inputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => handleInputChange(e.target.value)}
                  onFocus={() => { if (searchQuery.trim().length >= 2) setShowDropdown(true); }}
                  onKeyDown={handleKeyDown}
                  placeholder={t.navSearchPlaceholder}
                  className={`w-full pl-10 pr-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-primary transition-colors ${
                    theme === "dark"
                      ? "bg-surface-2 border-border text-text placeholder:text-muted"
                      : "bg-surface-2 border-border text-text placeholder:text-muted focus:bg-white"
                  }`}
                  autoComplete="off"
                />
                <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted`} />
              </div>
            </form>
            <SearchDropdown results={suggestions} />
          </div>

          {/* Right side controls */}
          <div className="flex items-center gap-2">
            {/* Theme Toggle */}
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className={`p-2 rounded-lg transition-colors ${
                theme === "dark"
                  ? "text-muted hover:text-text hover:bg-white/10"
                  : "text-muted hover:text-text hover:bg-surface-hover"
              }`}
              aria-label="Toggle theme"
            >
              {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>

            {/* Language Toggle */}
            <button
              onClick={() => setLanguage(language === "en" ? "bg" : "en")}
              className={`p-2 rounded-lg transition-colors flex items-center gap-1 ${
                theme === "dark"
                  ? "text-muted hover:text-text hover:bg-white/10"
                  : "text-muted hover:text-text hover:bg-surface-hover"
              }`}
              aria-label="Toggle language"
            >
              <Globe className="w-5 h-5" />
              <span className="text-xs font-medium uppercase">{language}</span>
            </button>

            {/* User Menu */}
            {user ? (
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                    theme === "dark"
                      ? "text-muted hover:text-text hover:bg-white/10"
                      : "text-muted hover:text-text hover:bg-surface-hover"
                  }`}
                >
                  <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                    <span className="text-white font-bold text-sm">
                      {user.name?.charAt(0).toUpperCase() || "U"}
                    </span>
                  </div>
                  <ChevronDown className={`w-4 h-4 transition-transform ${userMenuOpen ? "rotate-180" : ""}`} />
                </button>

                {userMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setUserMenuOpen(false)} />
                    <div className={`absolute right-0 top-full mt-2 w-48 rounded-lg shadow-lg border z-20 overflow-hidden ${
                      theme === "dark" ? "bg-surface-2 border-border" : "bg-white border-border"
                    }`}>
                      <div className={`px-4 py-3 border-b border-border`}>
                        <p className={`font-medium text-text`}>
                          {user.name}
                        </p>
                        <p className={`text-sm text-muted`}>
                          {user.email}
                        </p>
                      </div>
                      <Link
                        to="/profile"
                        onClick={() => setUserMenuOpen(false)}
                        className={`flex items-center gap-2 px-4 py-3 transition-colors ${
                          theme === "dark" ? "text-muted hover:bg-border" : "text-muted hover:bg-surface-hover"
                        }`}
                      >
                        <User className="w-4 h-4" />
                        {t.profile}
                      </Link>
                      {user.is_admin && (
                        <Link
                          to="/admin"
                          onClick={() => setUserMenuOpen(false)}
                          className={`flex items-center gap-2 px-4 py-3 transition-colors ${
                            theme === "dark" ? "text-warning hover:bg-border" : "text-warning hover:bg-surface-hover"
                          }`}
                        >
                          <ShieldCheck className="w-4 h-4" />
                          {t.adminPanel}
                        </Link>
                      )}
                      <button
                        onClick={() => {
                          logout();
                          setUserMenuOpen(false);
                        }}
                        className={`flex items-center gap-2 px-4 py-3 w-full transition-colors ${
                          theme === "dark" ? "text-error hover:bg-border" : "text-error hover:bg-surface-hover"
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
              <div className="hidden md:flex items-center gap-2">
                <Link
                  to="/login"
                  className={`px-4 py-2 rounded-lg font-medium transition-colors border ${
                    theme === "dark"
                      ? "border-border text-muted hover:text-text hover:border-muted"
                      : "border-border text-muted hover:text-text hover:border-border"
                  }`}
                >
                  {t.login}
                </Link>
                <Link
                  to="/register"
                  className="px-4 py-2 rounded-lg bg-primary text-white font-medium hover:bg-primary-hover transition-colors"
                >
                  {t.register}
                </Link>
              </div>
            )}

            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className={`md:hidden p-2 rounded-lg transition-colors ${
                theme === "dark"
                  ? "text-muted hover:text-text hover:bg-white/10"
                  : "text-muted hover:text-text hover:bg-surface-hover"
              }`}
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className={`md:hidden py-4 border-t border-border`}>
            {/* Mobile Search with Dropdown */}
            <div ref={mobileSearchRef} className="mb-4 relative">
              <form onSubmit={handleSearch}>
                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => handleInputChange(e.target.value)}
                    onFocus={() => { if (searchQuery.trim().length >= 2) setShowDropdown(true); }}
                    onKeyDown={handleKeyDown}
                    placeholder={t.navSearchPlaceholder}
                    className={`w-full pl-10 pr-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-primary ${
                      theme === "dark"
                        ? "bg-surface-2 border-border text-text placeholder:text-muted"
                        : "bg-surface-2 border-border text-text placeholder:text-muted"
                    }`}
                    autoComplete="off"
                  />
                  <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted`} />
                </div>
              </form>
              <SearchDropdown results={suggestions} isMobile />
            </div>

            {/* Mobile Nav Links */}
            <div className="space-y-1">
              {userNavLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    isActive(link.path)
                      ? "bg-primary text-white"
                      : theme === "dark"
                      ? "text-muted hover:text-text hover:bg-white/10"
                      : "text-muted hover:text-text hover:bg-surface-hover"
                  }`}
                >
                  <link.icon className="w-5 h-5" />
                  {link.label}
                </Link>
              ))}

              {!user && (
                <>
                  <Link
                    to="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                      theme === "dark"
                        ? "text-muted hover:text-text hover:bg-white/10"
                        : "text-muted hover:text-text hover:bg-surface-hover"
                    }`}
                  >
                    <User className="w-5 h-5" />
                    {t.login}
                  </Link>
                  <Link
                    to="/register"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 rounded-lg bg-primary text-white font-medium"
                  >
                    <User className="w-5 h-5" />
                    {t.register}
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
