import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useApp } from "../context/AppContext";
import api from "../api/client";
import type { WatchlistEntry, Movie } from "../types";
import {
  Settings, Film, Check, Star, Loader2, Eye, EyeOff,
  ArrowRight, ChevronLeft, ChevronRight, Heart, Bookmark,
  Play, Compass
} from "lucide-react";

type ProfileTab = "overview" | "settings";

interface FavoriteEntry {
  id: number;
  movie_id: number;
  created_at: string;
  movie: Movie;
}

// Counts for the header stats
interface ProfileCounts {
  favorites: number;
  completed: number;
  watchlist: number;
  watching: number;
}

// ============================================================================
// SKELETON CARD (shimmer while loading)
// ============================================================================

function SkeletonCard({ theme }: { theme: string }) {
  return (
    <div className="flex-shrink-0 w-[140px] animate-pulse" style={{ scrollSnapAlign: "start" }}>
      <div className={`w-full aspect-[2/3] rounded-lg ${theme === "dark" ? "bg-[#2A2A4A]" : "bg-gray-200"}`} />
      <div className={`h-3 mt-2 rounded ${theme === "dark" ? "bg-[#2A2A4A]" : "bg-gray-200"} w-[80%]`} />
      <div className={`h-3 mt-1.5 rounded ${theme === "dark" ? "bg-[#2A2A4A]" : "bg-gray-200"} w-[50%]`} />
    </div>
  );
}

// ============================================================================
// MOVIE CAROUSEL (upgraded)
// ============================================================================

function MovieCarousel({
  movies,
  theme,
  language,
  emptyIcon: EmptyIcon,
  emptyText,
  emptyCta,
  loading = false,
}: {
  movies: { movie: Movie; badge?: React.ReactNode }[];
  theme: string;
  language: string;
  emptyIcon: React.ComponentType<{ className?: string }>;
  emptyText: string;
  emptyCta?: { label: string; to: string };
  loading?: boolean;
}) {
  const navigate = useNavigate();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setCanScrollLeft(scrollLeft > 5);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 5);
    }
  };

  const scroll = (direction: "left" | "right") => {
    scrollRef.current?.scrollBy({ left: direction === "left" ? -300 : 300, behavior: "smooth" });
    setTimeout(checkScroll, 350);
  };

  useEffect(() => {
    checkScroll();
    const ref = scrollRef.current;
    ref?.addEventListener("scroll", checkScroll);
    return () => ref?.removeEventListener("scroll", checkScroll);
  }, [movies]);

  // Loading skeletons
  if (loading) {
    return (
      <div className="flex gap-4 overflow-hidden pb-4 px-1">
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonCard key={i} theme={theme} />
        ))}
      </div>
    );
  }

  // Empty state with CTA
  if (movies.length === 0) {
    return (
      <div className={`text-center py-12 rounded-xl ${theme === "dark" ? "bg-[#1A1A33]/50" : "bg-[#F3F4FF]"}`}>
        <EmptyIcon className={`w-12 h-12 mx-auto mb-3 ${theme === "dark" ? "text-[#5B5D78]" : "text-[#A7A7C7]"}`} />
        <p className={`text-sm mb-4 ${theme === "dark" ? "text-[#A7A7C7]" : "text-[#5B5D78]"}`}>{emptyText}</p>
        {emptyCta && (
          <Link
            to={emptyCta.to}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary text-white font-semibold text-sm hover:brightness-110 transition"
          >
            <Compass className="w-4 h-4" />
            {emptyCta.label}
          </Link>
        )}
      </div>
    );
  }

  return (
    <div className="relative group">
      {/* Left arrow (hidden on mobile) */}
      {canScrollLeft && (
        <button
          onClick={() => scroll("left")}
          className={`hidden md:block absolute -left-4 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-all ${
            theme === "dark" ? "bg-[#2A2A4A] text-white hover:bg-[#2A2A4A]" : "bg-white text-gray-800 hover:bg-[#F8F9FC] border"
          }`}
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
      )}
      {/* Right arrow (hidden on mobile) */}
      {canScrollRight && (
        <button
          onClick={() => scroll("right")}
          className={`hidden md:block absolute -right-4 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-all ${
            theme === "dark" ? "bg-[#2A2A4A] text-white hover:bg-[#2A2A4A]" : "bg-white text-gray-800 hover:bg-[#F8F9FC] border"
          }`}
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      )}

      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto pb-4 px-1"
        style={{ scrollbarWidth: "none", scrollSnapType: "x mandatory" }}
      >
        {movies.map(({ movie, badge }, idx) => {
          const title = language === "bg" ? movie.title_bg || movie.title : movie.title;
          const posterUrl = movie.poster_url || (movie.poster_path ? `https://image.tmdb.org/t/p/w342${movie.poster_path}` : null);
          const rating = movie.tmdb_rating || movie.average_rating;

          return (
            <div
              key={movie.id || idx}
              onClick={() => navigate(`/movie/${movie.id}`)}
              className="flex-shrink-0 w-[140px] cursor-pointer group/card"
              style={{ scrollSnapAlign: "start" }}
            >
              <div className="relative rounded-lg overflow-hidden shadow-lg">
                {posterUrl ? (
                  <img src={posterUrl} alt={title} className="w-full aspect-[2/3] object-cover group-hover/card:scale-105 transition-transform duration-300" loading="lazy" />
                ) : (
                  <div className={`w-full aspect-[2/3] flex items-center justify-center ${theme === "dark" ? "bg-[#2A2A4A]" : "bg-gray-200"}`}>
                    <Film className="w-10 h-10 text-[#A7A7C7]" />
                  </div>
                )}
                {badge}
                {rating && rating > 0 && (
                  <div className="absolute bottom-2 left-2 px-1.5 py-0.5 rounded bg-black/70 flex items-center gap-1">
                    <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                    <span className="text-white text-xs font-medium">{(rating > 5 ? rating : rating * 2).toFixed(1)}</span>
                  </div>
                )}
                {/* Hover overlay (desktop) */}
                <div className="absolute inset-0 bg-black/0 group-hover/card:bg-black/40 transition-all duration-200 hidden md:flex items-center justify-center opacity-0 group-hover/card:opacity-100">
                  <span className="text-white text-xs font-medium px-3 py-1.5 rounded-full bg-white/20 backdrop-blur-sm">
                    {language === "bg" ? "Детайли" : "Details"}
                  </span>
                </div>
              </div>
              <div className="pt-2 px-0.5">
                <h3 className={`font-medium text-sm line-clamp-2 group-hover/card:text-primary transition-colors ${
                  theme === "dark" ? "text-white" : "text-[#1A1B2E]"
                }`}>
                  {title}
                </h3>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================================
// SECTION HEADER with count badge + View All
// ============================================================================

function SectionHeader({
  icon: Icon,
  iconColor,
  label,
  count,
  viewAllTo,
  viewAllLabel,
  theme,
}: {
  icon: React.ComponentType<{ className?: string }>;
  iconColor: string;
  label: string;
  count?: number;
  viewAllTo?: string;
  viewAllLabel?: string;
  theme: string;
}) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2.5">
        <div className={`p-1.5 rounded-lg ${iconColor}`}>
          <Icon className="w-5 h-5" />
        </div>
        <h2 className={`text-lg font-semibold ${theme === "dark" ? "text-white" : "text-[#1A1B2E]"}`}>
          {label}
        </h2>
        {count !== undefined && count > 0 && (
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
            theme === "dark" ? "bg-[#2A2A4A] text-[#A7A7C7]" : "bg-gray-200 text-[#5B5D78]"
          }`}>
            {count}
          </span>
        )}
      </div>
      {viewAllTo && (
        <Link
          to={viewAllTo}
          className="flex items-center gap-1 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
        >
          {viewAllLabel || "View All"}
          <ArrowRight className="w-4 h-4" />
        </Link>
      )}
    </div>
  );
}

// ============================================================================
// DATA SECTIONS
// ============================================================================

function FavoritesSection({ theme, language, onCount }: { theme: string; language: string; onCount: (n: number) => void }) {
  const [favorites, setFavorites] = useState<FavoriteEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/favorites/")
      .then(r => { setFavorites(r.data || []); onCount((r.data || []).length); })
      .catch(() => setFavorites([]))
      .finally(() => setLoading(false));
  }, []);

  const movies = favorites.map(f => ({
    movie: f.movie,
    badge: (
      <div className="absolute top-2 right-2 p-1.5 rounded-full bg-secondary">
        <Heart className="w-3 h-3 text-white fill-white" />
      </div>
    ),
  }));

  return (
    <MovieCarousel
      movies={movies} theme={theme} language={language} loading={loading}
      emptyIcon={Heart}
      emptyText={language === "bg" ? "Няма любими филми" : "No favorite movies yet"}
      emptyCta={{ label: language === "bg" ? "Разгледай филми" : "Browse Movies", to: "/browse" }}
    />
  );
}

function ContinueWatchingSection({ theme, language, onCount }: { theme: string; language: string; onCount: (n: number) => void }) {
  const [watching, setWatching] = useState<WatchlistEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/watchlist/")
      .then(r => {
        const w = (r.data || []).filter((e: WatchlistEntry) => e.status === "watching");
        setWatching(w);
        onCount(w.length);
      })
      .catch(() => setWatching([]))
      .finally(() => setLoading(false));
  }, []);

  const movies = watching.filter(e => e.movie).map(e => ({
    movie: e.movie!,
    badge: (
      <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-yellow-500 flex items-center gap-1">
        <Play className="w-3 h-3 text-white fill-white" />
        <span className="text-white text-[10px] font-bold hidden sm:inline">
          {language === "bg" ? "Гледам" : "Watching"}
        </span>
      </div>
    ),
  }));

  // Don't show section if empty and not loading
  if (!loading && movies.length === 0) return null;

  return (
    <section>
      <SectionHeader
        icon={Play} iconColor="bg-yellow-500/10 text-yellow-500"
        label={language === "bg" ? "Продължи да гледаш" : "Continue Watching"}
        count={movies.length}
        viewAllTo="/watchlist" viewAllLabel={language === "bg" ? "Виж всички" : "View All"}
        theme={theme}
      />
      <MovieCarousel
        movies={movies} theme={theme} language={language} loading={loading}
        emptyIcon={Play}
        emptyText=""
      />
    </section>
  );
}

function CompletedSection({ theme, language, onCount }: { theme: string; language: string; onCount: (n: number) => void }) {
  const [completed, setCompleted] = useState<WatchlistEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/watchlist/")
      .then(r => {
        const c = (r.data || []).filter((e: WatchlistEntry) => e.status === "completed");
        setCompleted(c);
        onCount(c.length);
      })
      .catch(() => setCompleted([]))
      .finally(() => setLoading(false));
  }, []);

  const movies = completed.filter(e => e.movie).map(e => ({
    movie: e.movie!,
    badge: (
      <div className="absolute top-2 right-2 p-1.5 rounded-full bg-green-500">
        <Check className="w-3 h-3 text-white" />
      </div>
    ),
  }));

  return (
    <MovieCarousel
      movies={movies} theme={theme} language={language} loading={loading}
      emptyIcon={Check}
      emptyText={language === "bg" ? "Няма завършени филми" : "No completed movies yet"}
      emptyCta={{ label: language === "bg" ? "Разгледай филми" : "Browse Movies", to: "/browse" }}
    />
  );
}

function WatchlistSection({ theme, language, onCount }: { theme: string; language: string; onCount: (n: number) => void }) {
  const [watchlist, setWatchlist] = useState<WatchlistEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/watchlist/")
      .then(r => {
        const w = (r.data || []).filter((e: WatchlistEntry) => e.status === "planned" || e.status === "watching");
        setWatchlist(w);
        onCount(w.length);
      })
      .catch(() => setWatchlist([]))
      .finally(() => setLoading(false));
  }, []);

  const movies = watchlist.filter(e => e.movie).map(e => ({
    movie: e.movie!,
    badge: (
      <div className={`absolute top-2 right-2 p-1.5 rounded-full ${e.status === "watching" ? "bg-yellow-500" : "bg-blue-500"}`}>
        <Bookmark className="w-3 h-3 text-white" />
      </div>
    ),
  }));

  return (
    <MovieCarousel
      movies={movies} theme={theme} language={language} loading={loading}
      emptyIcon={Bookmark}
      emptyText={language === "bg" ? "Списъкът е празен" : "Watchlist is empty"}
      emptyCta={{ label: language === "bg" ? "Разгледай филми" : "Browse Movies", to: "/browse" }}
    />
  );
}

// ============================================================================
// PASSWORD STRENGTH
// ============================================================================

function PasswordStrength({ password, language }: { password: string; language: string }) {
  if (!password) return null;

  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  const levels = [
    { label: language === "bg" ? "Слаба" : "Weak", color: "bg-red-500", width: "w-1/5" },
    { label: language === "bg" ? "Слаба" : "Weak", color: "bg-red-500", width: "w-1/5" },
    { label: language === "bg" ? "Средна" : "Fair", color: "bg-yellow-500", width: "w-2/5" },
    { label: language === "bg" ? "Добра" : "Good", color: "bg-blue-500", width: "w-3/5" },
    { label: language === "bg" ? "Силна" : "Strong", color: "bg-green-500", width: "w-4/5" },
    { label: language === "bg" ? "Отлична" : "Excellent", color: "bg-green-400", width: "w-full" },
  ];

  const level = levels[Math.min(score, 5)];

  return (
    <div className="mt-2 space-y-1">
      <div className="h-1.5 rounded-full bg-gray-700 overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-300 ${level.color} ${level.width}`} />
      </div>
      <p className={`text-xs ${level.color.replace("bg-", "text-")}`}>{level.label}</p>
    </div>
  );
}

// ============================================================================
// PROFILE SETTINGS
// ============================================================================

function ProfileSettings({ theme, language, user }: { theme: string; language: string; user: { name: string; email: string } }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword) return;
    setSaving(true);
    setMessage(null);
    try {
      await api.put("/users/me/password", { current_password: currentPassword, new_password: newPassword });
      setMessage({ type: "success", text: language === "bg" ? "Паролата е сменена успешно" : "Password changed successfully" });
      setCurrentPassword("");
      setNewPassword("");
    } catch (err: any) {
      setMessage({ type: "error", text: err.response?.data?.detail || (language === "bg" ? "Грешка при смяна на паролата" : "Failed to change password") });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-xl space-y-6">
      {/* Profile Info */}
      <div className={`rounded-xl p-6 ${theme === "dark" ? "bg-[#1A1A33]/80 border border-[#2A2A4A]" : "bg-white border border-[#E2E4F0] shadow-sm"}`}>
        <h3 className={`text-lg font-semibold mb-4 ${theme === "dark" ? "text-white" : "text-[#1A1B2E]"}`}>
          {language === "bg" ? "Информация за профила" : "Profile Information"}
        </h3>
        <div className="space-y-4">
          <div>
            <label className={`block text-xs font-medium uppercase tracking-wider mb-1 ${theme === "dark" ? "text-[#A7A7C7]" : "text-[#5B5D78]"}`}>
              {language === "bg" ? "Име" : "Name"}
            </label>
            <p className={`font-medium ${theme === "dark" ? "text-white" : "text-[#1A1B2E]"}`}>{user.name}</p>
          </div>
          <div>
            <label className={`block text-xs font-medium uppercase tracking-wider mb-1 ${theme === "dark" ? "text-[#A7A7C7]" : "text-[#5B5D78]"}`}>
              {language === "bg" ? "Имейл" : "Email"}
            </label>
            <p className={`font-medium ${theme === "dark" ? "text-white" : "text-[#1A1B2E]"}`}>{user.email}</p>
          </div>
        </div>
      </div>

      {/* Change Password */}
      <div className={`rounded-xl p-6 ${theme === "dark" ? "bg-[#1A1A33]/80 border border-[#2A2A4A]" : "bg-white border border-[#E2E4F0] shadow-sm"}`}>
        <h3 className={`text-lg font-semibold mb-1 ${theme === "dark" ? "text-white" : "text-[#1A1B2E]"}`}>
          {language === "bg" ? "Смяна на парола" : "Change Password"}
        </h3>
        <p className={`text-sm mb-5 ${theme === "dark" ? "text-[#A7A7C7]" : "text-[#5B5D78]"}`}>
          {language === "bg" ? "Използвай поне 8 символа с букви и цифри" : "Use 8+ characters with letters and numbers"}
        </p>

        {message && (
          <div className={`p-3 rounded-lg mb-4 ${message.type === "success" ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"}`}>
            {message.text}
          </div>
        )}

        <div className="space-y-4">
          <div className="relative">
            <label className={`block text-sm font-medium mb-2 ${theme === "dark" ? "text-[#A7A7C7]" : "text-[#5B5D78]"}`}>
              {language === "bg" ? "Текуща парола" : "Current Password"}
            </label>
            <input
              type={showCurrentPassword ? "text" : "password"}
              value={currentPassword}
              onChange={e => setCurrentPassword(e.target.value)}
              className={`w-full px-4 py-3 pr-12 rounded-lg border focus:outline-none focus:ring-2 focus:ring-primary ${
                theme === "dark" ? "bg-[#2A2A4A] border-[#2A2A4A] text-white" : "bg-[#F8F9FC] border-[#E2E4F0] text-[#1A1B2E]"
              }`}
            />
            <button type="button" onClick={() => setShowCurrentPassword(!showCurrentPassword)}
              className={`absolute right-3 top-[38px] ${theme === "dark" ? "text-[#A7A7C7]" : "text-[#5B5D78]"}`}>
              {showCurrentPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>

          <div className="relative">
            <label className={`block text-sm font-medium mb-2 ${theme === "dark" ? "text-[#A7A7C7]" : "text-[#5B5D78]"}`}>
              {language === "bg" ? "Нова парола" : "New Password"}
            </label>
            <input
              type={showNewPassword ? "text" : "password"}
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              className={`w-full px-4 py-3 pr-12 rounded-lg border focus:outline-none focus:ring-2 focus:ring-primary ${
                theme === "dark" ? "bg-[#2A2A4A] border-[#2A2A4A] text-white" : "bg-[#F8F9FC] border-[#E2E4F0] text-[#1A1B2E]"
              }`}
            />
            <button type="button" onClick={() => setShowNewPassword(!showNewPassword)}
              className={`absolute right-3 top-[38px] ${theme === "dark" ? "text-[#A7A7C7]" : "text-[#5B5D78]"}`}>
              {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
            <PasswordStrength password={newPassword} language={language} />
          </div>

          <button
            onClick={handleChangePassword}
            disabled={saving || !currentPassword || !newPassword}
            className="px-6 py-2.5 bg-primary text-white font-semibold rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {language === "bg" ? "Смени паролата" : "Change Password"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN PROFILE PAGE
// ============================================================================

export default function Profile() {
  const navigate = useNavigate();
  const { theme, language, user, isAuthenticated } = useApp();
  const [activeTab, setActiveTab] = useState<ProfileTab>("overview");
  const [counts, setCounts] = useState<ProfileCounts>({ favorites: 0, completed: 0, watchlist: 0, watching: 0 });

  const updateCount = (key: keyof ProfileCounts) => (n: number) => {
    setCounts(prev => ({ ...prev, [key]: n }));
  };

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login", { state: { from: "/profile" } });
    }
  }, [isAuthenticated, navigate]);

  if (!isAuthenticated || !user) return null;

  const initial = user.name?.charAt(0).toUpperCase() || "U";

  return (
    <div className={`min-h-screen ${theme === "dark" ? "bg-[#0B0B12]" : "bg-[#F8F9FC]"}`}>
      {/* =============== HEADER / BANNER =============== */}
      <div className="relative overflow-hidden">
        {/* Gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#121226] via-[#0B0B12] to-[#0B0B12]" />
        <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-secondary/5 to-transparent" />
        {/* Subtle pattern */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: "radial-gradient(circle at 25% 50%, white 1px, transparent 1px)",
          backgroundSize: "40px 40px"
        }} />

        <div className="relative max-w-7xl mx-auto px-4 md:px-8 py-8 md:py-10">
          <div className="flex flex-col md:flex-row md:items-center gap-6 md:gap-8">
            {/* Left: Avatar */}
            <div className="flex items-center gap-5">
              <div className="relative">
                {/* Glow ring */}
                <div className="absolute -inset-1 bg-gradient-to-br from-[#A78BFA] to-[#2DD4BF] rounded-full opacity-60 blur-sm" />
                <div className="relative w-20 h-20 md:w-24 md:h-24 rounded-full bg-gradient-to-br from-[#A78BFA] to-[#2DD4BF] flex items-center justify-center ring-2 ring-white/10">
                  <span className="text-3xl md:text-4xl font-bold text-white">{initial}</span>
                </div>
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-white">{user.name}</h1>
                <p className="text-[#A7A7C7] text-sm md:text-base mt-0.5 hidden sm:block">{user.email}</p>
              </div>
            </div>

            {/* Right: Stat pills */}
            <div className="flex gap-3 md:ml-auto flex-wrap">
              <div className={`flex items-center gap-2 px-4 py-2.5 rounded-xl ${theme === "dark" ? "bg-white/5 border border-white/10" : "bg-white/10 border border-white/20"}`}>
                <Heart className="w-4 h-4 text-secondary" />
                <span className="text-white font-semibold text-lg">{counts.favorites}</span>
                <span className="text-[#A7A7C7] text-sm hidden sm:inline">{language === "bg" ? "Любими" : "Favorites"}</span>
              </div>
              <div className={`flex items-center gap-2 px-4 py-2.5 rounded-xl ${theme === "dark" ? "bg-white/5 border border-white/10" : "bg-white/10 border border-white/20"}`}>
                <Check className="w-4 h-4 text-green-400" />
                <span className="text-white font-semibold text-lg">{counts.completed}</span>
                <span className="text-[#A7A7C7] text-sm hidden sm:inline">{language === "bg" ? "Гледани" : "Completed"}</span>
              </div>
              <div className={`flex items-center gap-2 px-4 py-2.5 rounded-xl ${theme === "dark" ? "bg-white/5 border border-white/10" : "bg-white/10 border border-white/20"}`}>
                <Bookmark className="w-4 h-4 text-blue-400" />
                <span className="text-white font-semibold text-lg">{counts.watchlist}</span>
                <span className="text-[#A7A7C7] text-sm hidden sm:inline">{language === "bg" ? "За гледане" : "Watchlist"}</span>
              </div>
            </div>
          </div>

          {/* Tabs (pill-style) */}
          <div className="flex gap-1 mt-6 p-1 rounded-xl bg-white/5 w-fit">
            <button
              onClick={() => setActiveTab("overview")}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium text-sm transition-all ${
                activeTab === "overview"
                  ? "bg-primary text-white shadow-sm"
                  : "text-[#A7A7C7] hover:text-[#EDEDF7]"
              }`}
            >
              <Film className="w-4 h-4" />
              {language === "bg" ? "Преглед" : "Overview"}
            </button>
            <button
              onClick={() => setActiveTab("settings")}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium text-sm transition-all ${
                activeTab === "settings"
                  ? "bg-primary text-white shadow-sm"
                  : "text-[#A7A7C7] hover:text-[#EDEDF7]"
              }`}
            >
              <Settings className="w-4 h-4" />
              {language === "bg" ? "Настройки" : "Settings"}
            </button>
          </div>
        </div>
      </div>

      {/* =============== CONTENT =============== */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">
        {activeTab === "overview" && (
          <div className="space-y-10">
            {/* Continue Watching (only shows if items exist) */}
            <ContinueWatchingSection theme={theme} language={language} onCount={updateCount("watching")} />

            {/* Favorites */}
            <section>
              <SectionHeader
                icon={Heart} iconColor="bg-secondary/10 text-secondary"
                label={language === "bg" ? "Любими филми" : "Favorite Movies"}
                count={counts.favorites}
                viewAllTo="/browse" viewAllLabel={language === "bg" ? "Виж всички" : "View All"}
                theme={theme}
              />
              <FavoritesSection theme={theme} language={language} onCount={updateCount("favorites")} />
            </section>

            {/* Completed */}
            <section>
              <SectionHeader
                icon={Check} iconColor="bg-green-500/10 text-green-500"
                label={language === "bg" ? "Изгледани филми" : "Completed Movies"}
                count={counts.completed}
                viewAllTo="/watchlist" viewAllLabel={language === "bg" ? "Виж всички" : "View All"}
                theme={theme}
              />
              <CompletedSection theme={theme} language={language} onCount={updateCount("completed")} />
            </section>

            {/* Watchlist */}
            <section>
              <SectionHeader
                icon={Bookmark} iconColor="bg-blue-500/10 text-blue-500"
                label={language === "bg" ? "За гледане" : "Watchlist"}
                count={counts.watchlist}
                viewAllTo="/watchlist" viewAllLabel={language === "bg" ? "Виж всички" : "View All"}
                theme={theme}
              />
              <WatchlistSection theme={theme} language={language} onCount={updateCount("watchlist")} />
            </section>
          </div>
        )}

        {activeTab === "settings" && (
          <ProfileSettings theme={theme} language={language} user={user} />
        )}
      </div>
    </div>
  );
}