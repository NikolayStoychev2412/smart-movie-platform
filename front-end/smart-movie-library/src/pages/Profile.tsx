import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useApp } from "../context/AppContext";
import api from "../api/client";
import type { WatchlistEntry, Movie } from "../types";
import {
  User, Settings, Film, Check, Star, Loader2, Eye, EyeOff,
  ArrowRight, ChevronLeft, ChevronRight, Heart, Bookmark
} from "lucide-react";

type ProfileTab = 'overview' | 'settings';

interface FavoriteEntry {
  id: number;
  movie_id: number;
  created_at: string;
  movie: Movie;
}

// Horizontal Carousel Component
function MovieCarousel({ 
  movies, 
  theme, 
  language,
  emptyIcon: EmptyIcon,
  emptyText
}: { 
  movies: { movie: Movie; badge?: React.ReactNode }[];
  theme: string;
  language: string;
  emptyIcon: React.ComponentType<{ className?: string }>;
  emptyText: string;
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

  if (movies.length === 0) {
    return (
      <div className={`text-center py-12 rounded-xl ${theme === "dark" ? "bg-gray-900/50" : "bg-gray-100"}`}>
        <EmptyIcon className={`w-12 h-12 mx-auto mb-3 ${theme === "dark" ? "text-gray-700" : "text-gray-400"}`} />
        <p className={`text-sm ${theme === "dark" ? "text-gray-500" : "text-gray-500"}`}>{emptyText}</p>
      </div>
    );
  }

  return (
    <div className="relative group">
      {canScrollLeft && (
        <button
          onClick={() => scroll("left")}
          className={`absolute -left-4 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-all ${
            theme === "dark" ? "bg-gray-800 text-white hover:bg-gray-700" : "bg-white text-gray-800 hover:bg-gray-50 border"
          }`}
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
      )}
      {canScrollRight && (
        <button
          onClick={() => scroll("right")}
          className={`absolute -right-4 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-all ${
            theme === "dark" ? "bg-gray-800 text-white hover:bg-gray-700" : "bg-white text-gray-800 hover:bg-gray-50 border"
          }`}
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      )}

      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto pb-4"
        style={{ scrollbarWidth: "none", scrollSnapType: "x mandatory" }}
      >
        {movies.map(({ movie, badge }, idx) => {
          const title = language === "bg" ? movie.title_bg || movie.title : movie.title;
          const posterUrl = movie.poster_url || (movie.poster_path ? `https://image.tmdb.org/t/p/w342${movie.poster_path}` : null);

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
                  <div className={`w-full aspect-[2/3] flex items-center justify-center ${theme === "dark" ? "bg-gray-800" : "bg-gray-200"}`}>
                    <Film className="w-10 h-10 text-gray-500" />
                  </div>
                )}
                {badge}
                {movie.average_rating && (
                  <div className="absolute bottom-2 left-2 px-1.5 py-0.5 rounded bg-black/70 flex items-center gap-1">
                    <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                    <span className="text-white text-xs font-medium">{movie.average_rating.toFixed(1)}</span>
                  </div>
                )}
              </div>
              <div className="pt-2 px-1">
                <h3 className={`font-medium text-sm line-clamp-2 group-hover/card:text-tmdb-light-blue transition-colors ${
                  theme === "dark" ? "text-white" : "text-gray-900"
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

// Favorites Section
function FavoritesSection({ theme, language }: { theme: string; language: string }) {
  const [favorites, setFavorites] = useState<FavoriteEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFavorites();
  }, []);

  const loadFavorites = async () => {
    setLoading(true);
    try {
      const response = await api.get('/favorites/');
      setFavorites(response.data || []);
    } catch (err) {
      console.error("Failed to load favorites:", err);
      setFavorites([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className={`w-6 h-6 animate-spin ${theme === "dark" ? "text-gray-500" : "text-gray-400"}`} />
      </div>
    );
  }

  const movies = favorites.map(f => ({
    movie: f.movie,
    badge: (
      <div className="absolute top-2 right-2 p-1.5 rounded-full bg-pink-500">
        <Heart className="w-3 h-3 text-white fill-white" />
      </div>
    )
  }));

  return (
    <MovieCarousel
      movies={movies}
      theme={theme}
      language={language}
      emptyIcon={Heart}
      emptyText={language === "bg" ? "Няма любими филми" : "No favorite movies yet"}
    />
  );
}

// Completed Section
function CompletedSection({ theme, language }: { theme: string; language: string }) {
  const [completed, setCompleted] = useState<WatchlistEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCompleted();
  }, []);

  const loadCompleted = async () => {
    setLoading(true);
    try {
      const response = await api.get('/watchlist/');
      const all = response.data || [];
      setCompleted(all.filter((e: WatchlistEntry) => e.status === 'completed'));
    } catch (err) {
      console.error("Failed to load completed:", err);
      setCompleted([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className={`w-6 h-6 animate-spin ${theme === "dark" ? "text-gray-500" : "text-gray-400"}`} />
      </div>
    );
  }

  const movies = completed.filter(e => e.movie).map(e => ({
    movie: e.movie!,
    badge: (
      <div className="absolute top-2 right-2 p-1.5 rounded-full bg-green-500">
        <Check className="w-3 h-3 text-white" />
      </div>
    )
  }));

  return (
    <MovieCarousel
      movies={movies}
      theme={theme}
      language={language}
      emptyIcon={Check}
      emptyText={language === "bg" ? "Няма завършени филми" : "No completed movies yet"}
    />
  );
}

// Watchlist Section (Planned + Watching)
function WatchlistSection({ theme, language }: { theme: string; language: string }) {
  const [watchlist, setWatchlist] = useState<WatchlistEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadWatchlist();
  }, []);

  const loadWatchlist = async () => {
    setLoading(true);
    try {
      const response = await api.get('/watchlist/');
      const all = response.data || [];
      setWatchlist(all.filter((e: WatchlistEntry) => e.status === 'planned' || e.status === 'watching'));
    } catch (err) {
      console.error("Failed to load watchlist:", err);
      setWatchlist([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className={`w-6 h-6 animate-spin ${theme === "dark" ? "text-gray-500" : "text-gray-400"}`} />
      </div>
    );
  }

  const movies = watchlist.filter(e => e.movie).map(e => ({
    movie: e.movie!,
    badge: (
      <div className={`absolute top-2 right-2 p-1.5 rounded-full ${e.status === 'watching' ? 'bg-yellow-500' : 'bg-blue-500'}`}>
        <Bookmark className="w-3 h-3 text-white" />
      </div>
    )
  }));

  return (
    <MovieCarousel
      movies={movies}
      theme={theme}
      language={language}
      emptyIcon={Bookmark}
      emptyText={language === "bg" ? "Списъкът е празен" : "Watchlist is empty"}
    />
  );
}

// Profile Settings
function ProfileSettings({ theme, language, user }: { theme: string; language: string; user: { name: string; email: string } }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword) return;
    setSaving(true);
    setMessage(null);
    try {
      await api.put('/users/me/password', { current_password: currentPassword, new_password: newPassword });
      setMessage({ type: 'success', text: language === "bg" ? "Паролата е сменена успешно" : "Password changed successfully" });
      setCurrentPassword("");
      setNewPassword("");
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.detail || (language === "bg" ? "Грешка при смяна на паролата" : "Failed to change password") });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-xl space-y-6">
      {/* Profile Info */}
      <div className={`rounded-xl p-6 ${theme === "dark" ? "bg-gray-900" : "bg-white border border-gray-200"}`}>
        <h3 className={`text-lg font-semibold mb-4 ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
          {language === "bg" ? "Информация за профила" : "Profile Information"}
        </h3>
        <div className="space-y-4">
          <div>
            <label className={`block text-sm font-medium mb-1 ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>
              {language === "bg" ? "Име" : "Name"}
            </label>
            <p className={`font-medium ${theme === "dark" ? "text-white" : "text-gray-900"}`}>{user.name}</p>
          </div>
          <div>
            <label className={`block text-sm font-medium mb-1 ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>
              {language === "bg" ? "Имейл" : "Email"}
            </label>
            <p className={`font-medium ${theme === "dark" ? "text-white" : "text-gray-900"}`}>{user.email}</p>
          </div>
        </div>
      </div>

      {/* Change Password */}
      <div className={`rounded-xl p-6 ${theme === "dark" ? "bg-gray-900" : "bg-white border border-gray-200"}`}>
        <h3 className={`text-lg font-semibold mb-4 ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
          {language === "bg" ? "Смяна на парола" : "Change Password"}
        </h3>
        
        {message && (
          <div className={`p-3 rounded-lg mb-4 ${message.type === 'success' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
            {message.text}
          </div>
        )}
        
        <div className="space-y-4">
          <div className="relative">
            <label className={`block text-sm font-medium mb-2 ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}>
              {language === "bg" ? "Текуща парола" : "Current Password"}
            </label>
            <input
              type={showCurrentPassword ? "text" : "password"}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className={`w-full px-4 py-3 pr-12 rounded-lg border focus:outline-none focus:ring-2 focus:ring-tmdb-light-blue ${
                theme === "dark" ? "bg-gray-800 border-gray-700 text-white" : "bg-gray-50 border-gray-300 text-gray-900"
              }`}
            />
            <button
              type="button"
              onClick={() => setShowCurrentPassword(!showCurrentPassword)}
              className={`absolute right-3 top-[38px] ${theme === "dark" ? "text-gray-500" : "text-gray-400"}`}
            >
              {showCurrentPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
          
          <div className="relative">
            <label className={`block text-sm font-medium mb-2 ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}>
              {language === "bg" ? "Нова парола" : "New Password"}
            </label>
            <input
              type={showNewPassword ? "text" : "password"}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className={`w-full px-4 py-3 pr-12 rounded-lg border focus:outline-none focus:ring-2 focus:ring-tmdb-light-blue ${
                theme === "dark" ? "bg-gray-800 border-gray-700 text-white" : "bg-gray-50 border-gray-300 text-gray-900"
              }`}
            />
            <button
              type="button"
              onClick={() => setShowNewPassword(!showNewPassword)}
              className={`absolute right-3 top-[38px] ${theme === "dark" ? "text-gray-500" : "text-gray-400"}`}
            >
              {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>

          <button
            onClick={handleChangePassword}
            disabled={saving || !currentPassword || !newPassword}
            className="px-6 py-2.5 bg-tmdb-light-blue text-tmdb-dark-blue font-semibold rounded-lg hover:bg-tmdb-light-blue/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {language === "bg" ? "Смени паролата" : "Change Password"}
          </button>
        </div>
      </div>
    </div>
  );
}

// Main Profile Page
export default function Profile() {
  const navigate = useNavigate();
  const { theme, language, user, isAuthenticated } = useApp();
  const [activeTab, setActiveTab] = useState<ProfileTab>('overview');

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login", { state: { from: "/profile" } });
    }
  }, [isAuthenticated, navigate]);

  if (!isAuthenticated || !user) {
    return null;
  }

  return (
    <div className={`min-h-screen ${theme === "dark" ? "bg-tmdb-dark" : "bg-gray-50"}`}>
      {/* Header */}
      <div className={`border-b ${theme === "dark" ? "bg-gray-900/50 border-gray-800" : "bg-white border-gray-200"}`}>
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-tmdb-light-green to-tmdb-light-blue flex items-center justify-center">
              <span className="text-2xl font-bold text-tmdb-dark-blue">
                {user.name?.charAt(0).toUpperCase() || "U"}
              </span>
            </div>
            <div>
              <h1 className={`text-2xl font-bold ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
                {user.name}
              </h1>
              <p className={theme === "dark" ? "text-gray-400" : "text-gray-500"}>
                {user.email}
              </p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mt-6">
            <button
              onClick={() => setActiveTab('overview')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-colors ${
                activeTab === 'overview'
                  ? "bg-tmdb-light-blue text-tmdb-dark-blue"
                  : theme === "dark"
                  ? "text-gray-400 hover:text-white hover:bg-white/10"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              }`}
            >
              <Film className="w-4 h-4" />
              {language === "bg" ? "Преглед" : "Overview"}
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-colors ${
                activeTab === 'settings'
                  ? "bg-tmdb-light-blue text-tmdb-dark-blue"
                  : theme === "dark"
                  ? "text-gray-400 hover:text-white hover:bg-white/10"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              }`}
            >
              <Settings className="w-4 h-4" />
              {language === "bg" ? "Настройки" : "Settings"}
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">
        {activeTab === 'overview' && (
          <div className="space-y-10">
            {/* Favorites */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-pink-500/10">
                    <Heart className="w-5 h-5 text-pink-500" />
                  </div>
                  <h2 className={`text-lg font-semibold ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
                    {language === "bg" ? "Любими филми" : "Favorite Movies"}
                  </h2>
                </div>
              </div>
              <FavoritesSection theme={theme} language={language} />
            </section>

            {/* Completed */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-green-500/10">
                    <Check className="w-5 h-5 text-green-500" />
                  </div>
                  <h2 className={`text-lg font-semibold ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
                    {language === "bg" ? "Изгледани филми" : "Completed Movies"}
                  </h2>
                </div>
                <Link 
                  to="/watchlist"
                  className="flex items-center gap-1 text-sm font-medium text-tmdb-light-blue hover:text-tmdb-light-blue/80 transition-colors"
                >
                  {language === "bg" ? "Виж всички" : "View All"}
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
              <CompletedSection theme={theme} language={language} />
            </section>

            {/* Watchlist (Planned + Watching) */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-blue-500/10">
                    <Bookmark className="w-5 h-5 text-blue-500" />
                  </div>
                  <h2 className={`text-lg font-semibold ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
                    {language === "bg" ? "За гледане" : "Watchlist"}
                  </h2>
                </div>
                <Link 
                  to="/watchlist"
                  className="flex items-center gap-1 text-sm font-medium text-tmdb-light-blue hover:text-tmdb-light-blue/80 transition-colors"
                >
                  {language === "bg" ? "Виж всички" : "View All"}
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
              <WatchlistSection theme={theme} language={language} />
            </section>
          </div>
        )}

        {activeTab === 'settings' && (
          <ProfileSettings theme={theme} language={language} user={user} />
        )}
      </div>
    </div>
  );
}