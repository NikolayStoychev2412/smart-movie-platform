import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useApp } from "../context/AppContext";
import api from "../api/client";
import type { WatchlistEntry, Movie, Review } from "../types";
import {
  Settings, Film, Check, Star, Loader2, Eye, EyeOff,
  ArrowRight, ChevronLeft, ChevronRight, Heart, Bookmark,
  Play, Compass, MessageSquare, Edit3, Trash2, Calendar,
  TrendingUp, Clock, BarChart3, Sparkles, Sun, Moon,
  Globe, Shield, Download, AlertTriangle, RotateCcw,
  SlidersHorizontal, Palette, Lock, Database
} from "lucide-react";
import { GENRES, MOOD_LABELS } from "../constants/preferences";

type ProfileTab = "overview" | "reviews" | "settings";

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
  reviews: number;
}

// Profile stats from backend
interface ProfileStats {
  rating_distribution: Record<number, number>;
  top_genres: { genre: string; count: number }[];
  top_decade: number | null;
  total_reviews: number;
  total_favorites: number;
  total_completed: number;
  total_watchlist: number;
  minutes_watched: number;
  average_rating_given: number;
  preferred_genres: string[];
  preferred_mood: string | null;
  member_since: string | null;
}

// ============================================================================
// PROFILE STATS & TASTE CARD SECTION
// ============================================================================

function ProfileStatsSection({ theme, language }: { theme: string; language: string }) {
  const [stats, setStats] = useState<ProfileStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/users/me/stats")
      .then((res) => setStats(res.data))
      .catch(() => setStats(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Stats cards skeleton */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className={`animate-pulse rounded-xl p-5 ${theme === "dark" ? "bg-[#1A1A33]/80" : "bg-white"}`}>
              <div className={`w-10 h-10 rounded-lg ${theme === "dark" ? "bg-[#2A2A4A]" : "bg-gray-200"} mb-3`} />
              <div className={`h-7 w-16 rounded ${theme === "dark" ? "bg-[#2A2A4A]" : "bg-gray-200"} mb-2`} />
              <div className={`h-3 w-24 rounded ${theme === "dark" ? "bg-[#2A2A4A]" : "bg-gray-200"}`} />
            </div>
          ))}
        </div>
        {/* Middle row skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[1, 2].map((i) => (
            <div key={i} className={`animate-pulse rounded-xl p-6 ${theme === "dark" ? "bg-[#1A1A33]/80" : "bg-white"}`}>
              <div className={`h-5 w-40 rounded ${theme === "dark" ? "bg-[#2A2A4A]" : "bg-gray-200"} mb-4`} />
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((j) => (
                  <div key={j} className="flex items-center gap-3">
                    <div className={`h-4 w-12 rounded ${theme === "dark" ? "bg-[#2A2A4A]" : "bg-gray-200"}`} />
                    <div className={`h-3 flex-1 rounded ${theme === "dark" ? "bg-[#2A2A4A]" : "bg-gray-200"}`} />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!stats) return null;

  const maxRatingCount = Math.max(...Object.values(stats.rating_distribution), 1);
  const totalRatings = Object.values(stats.rating_distribution).reduce((a, b) => a + b, 0);
  const moodInfo = stats.preferred_mood ? MOOD_LABELS[stats.preferred_mood] : null;
  const hoursWatched = Math.round(stats.minutes_watched / 60);
  const totalGenreCount = stats.top_genres.reduce((a, b) => a + b.count, 0);

  const cardClass = `rounded-xl border ${theme === "dark" ? "bg-[#1A1A33]/80 border-[#2A2A4A]" : "bg-white border-[#E2E4F0] shadow-sm"}`;

  const statCards = [
    {
      icon: Film,
      value: stats.total_completed,
      label: language === "bg" ? "Изгледани филми" : "Movies Watched",
      gradient: "from-blue-500 to-cyan-400",
      iconBg: theme === "dark" ? "bg-blue-500/10" : "bg-blue-50",
      iconColor: "text-blue-500",
    },
    {
      icon: Clock,
      value: hoursWatched,
      label: language === "bg" ? "Часове гледане" : "Hours Watched",
      suffix: language === "bg" ? "ч" : "h",
      gradient: "from-purple-500 to-pink-400",
      iconBg: theme === "dark" ? "bg-purple-500/10" : "bg-purple-50",
      iconColor: "text-purple-500",
    },
    {
      icon: Star,
      value: stats.average_rating_given > 0 ? stats.average_rating_given : 0,
      label: language === "bg" ? "Средна оценка" : "Avg Rating",
      isDecimal: true,
      gradient: "from-yellow-500 to-orange-400",
      iconBg: theme === "dark" ? "bg-yellow-500/10" : "bg-yellow-50",
      iconColor: "text-yellow-500",
    },
    {
      icon: Edit3,
      value: stats.total_reviews,
      label: language === "bg" ? "Ревюта" : "Reviews",
      gradient: "from-green-500 to-emerald-400",
      iconBg: theme === "dark" ? "bg-green-500/10" : "bg-green-50",
      iconColor: "text-green-500",
    },
  ];

  const genreColors = [
    "from-blue-500 to-blue-400",
    "from-purple-500 to-purple-400",
    "from-pink-500 to-pink-400",
    "from-orange-500 to-orange-400",
    "from-cyan-500 to-cyan-400",
    "from-green-500 to-green-400",
    "from-red-500 to-red-400",
    "from-yellow-500 to-yellow-400",
  ];

  return (
    <div className="space-y-6">
      {/* ── Top Stats Row ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className={`${cardClass} p-5 relative overflow-hidden group hover:scale-[1.02] transition-transform duration-200`}
            >
              {/* Subtle gradient accent at top */}
              <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${card.gradient}`} />
              <div className={`w-10 h-10 rounded-lg ${card.iconBg} flex items-center justify-center mb-3`}>
                <Icon className={`w-5 h-5 ${card.iconColor}`} />
              </div>
              <p className={`text-2xl md:text-3xl font-bold ${theme === "dark" ? "text-white" : "text-[#1A1B2E]"}`}>
                {card.isDecimal ? card.value.toFixed(1) : card.value}
                {card.suffix && <span className="text-lg font-medium ml-0.5">{card.suffix}</span>}
              </p>
              <p className={`text-sm mt-1 ${theme === "dark" ? "text-[#A7A7C7]" : "text-[#5B5D78]"}`}>
                {card.label}
              </p>
            </div>
          );
        })}
      </div>

      {/* ── Middle Row: Rating Distribution + Top Genres ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Rating Distribution */}
        <div className={`${cardClass} p-6`}>
          <div className="flex items-center gap-2 mb-5">
            <BarChart3 className="w-5 h-5 text-yellow-500" />
            <h3 className={`text-lg font-semibold ${theme === "dark" ? "text-white" : "text-[#1A1B2E]"}`}>
              {language === "bg" ? "Разпределение на оценки" : "Rating Distribution"}
            </h3>
            {totalRatings > 0 && (
              <span className={`text-xs px-2 py-0.5 rounded-full ml-auto ${theme === "dark" ? "bg-[#2A2A4A] text-[#A7A7C7]" : "bg-gray-100 text-[#5B5D78]"}`}>
                {totalRatings} {language === "bg" ? "общо" : "total"}
              </span>
            )}
          </div>

          {totalRatings === 0 ? (
            <div className={`text-center py-8 ${theme === "dark" ? "text-[#5B5D78]" : "text-[#A7A7C7]"}`}>
              <BarChart3 className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p className="text-sm">{language === "bg" ? "Все още няма оценки" : "No ratings yet"}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {[5, 4, 3, 2, 1].map((rating) => {
                const count = stats.rating_distribution[rating] || 0;
                const percentage = (count / maxRatingCount) * 100;
                const percentOfTotal = totalRatings > 0 ? Math.round((count / totalRatings) * 100) : 0;

                return (
                  <div key={rating} className="flex items-center gap-3">
                    <div className="flex items-center gap-1 w-14">
                      <span className={`text-sm font-semibold ${theme === "dark" ? "text-white" : "text-[#1A1B2E]"}`}>
                        {rating}
                      </span>
                      <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
                    </div>
                    <div className={`flex-1 h-4 rounded-full overflow-hidden ${theme === "dark" ? "bg-[#2A2A4A]" : "bg-gray-100"}`}>
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-yellow-400 to-yellow-500 transition-all duration-700 ease-out"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <span className={`text-xs w-12 text-right font-medium ${theme === "dark" ? "text-[#A7A7C7]" : "text-[#5B5D78]"}`}>
                      {count} <span className="opacity-60">({percentOfTotal}%)</span>
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Average Rating Footer */}
          {stats.average_rating_given > 0 && (
            <div className={`mt-5 pt-4 border-t ${theme === "dark" ? "border-[#2A2A4A]" : "border-[#E2E4F0]"}`}>
              <div className="flex items-center justify-between">
                <span className={`text-sm ${theme === "dark" ? "text-[#A7A7C7]" : "text-[#5B5D78]"}`}>
                  {language === "bg" ? "Средна оценка" : "Average rating"}
                </span>
                <div className="flex items-center gap-1.5">
                  <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                  <span className={`text-lg font-bold ${theme === "dark" ? "text-white" : "text-[#1A1B2E]"}`}>
                    {stats.average_rating_given.toFixed(1)}
                  </span>
                  <span className={`text-sm ${theme === "dark" ? "text-[#5B5D78]" : "text-[#A7A7C7]"}`}>/5</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Top Genres */}
        <div className={`${cardClass} p-6`}>
          <div className="flex items-center gap-2 mb-5">
            <Sparkles className="w-5 h-5 text-primary" />
            <h3 className={`text-lg font-semibold ${theme === "dark" ? "text-white" : "text-[#1A1B2E]"}`}>
              {language === "bg" ? "Топ жанрове" : "Top Genres"}
            </h3>
          </div>

          {stats.top_genres.length === 0 ? (
            <div className={`text-center py-8 ${theme === "dark" ? "text-[#5B5D78]" : "text-[#A7A7C7]"}`}>
              <Sparkles className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p className="text-sm">{language === "bg" ? "Няма данни за жанрове" : "No genre data yet"}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {stats.top_genres.slice(0, 6).map((genre, idx) => {
                const pct = totalGenreCount > 0 ? Math.round((genre.count / totalGenreCount) * 100) : 0;
                const colorClass = genreColors[idx % genreColors.length];

                return (
                  <div key={genre.genre}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className={`text-sm font-medium ${theme === "dark" ? "text-white" : "text-[#1A1B2E]"}`}>
                        {genre.genre}
                      </span>
                      <span className={`text-xs font-medium ${theme === "dark" ? "text-[#A7A7C7]" : "text-[#5B5D78]"}`}>
                        {genre.count} ({pct}%)
                      </span>
                    </div>
                    <div className={`h-3 rounded-full overflow-hidden ${theme === "dark" ? "bg-[#2A2A4A]" : "bg-gray-100"}`}>
                      <div
                        className={`h-full rounded-full bg-gradient-to-r ${colorClass} transition-all duration-700 ease-out`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Bottom Row: Taste Insights ── */}
      <div className={`${cardClass} p-6`}>
        <div className="flex items-center gap-2 mb-5">
          <Sparkles className="w-5 h-5 text-primary" />
          <h3 className={`text-lg font-semibold ${theme === "dark" ? "text-white" : "text-[#1A1B2E]"}`}>
            {language === "bg" ? "Твоят вкус" : "Taste Insights"}
          </h3>
        </div>

        <div className="flex flex-wrap gap-3">
          {/* Preferred Mood */}
          {moodInfo && (
            <div className={`flex items-center gap-2 px-4 py-2.5 rounded-xl ${theme === "dark" ? "bg-secondary/10 border border-secondary/20" : "bg-secondary/5 border border-secondary/15"}`}>
              <div>
                <p className={`text-xs ${theme === "dark" ? "text-[#5B5D78]" : "text-[#A7A7C7]"}`}>
                  {language === "bg" ? "Настроение" : "Mood"}
                </p>
                <p className={`text-sm font-semibold ${theme === "dark" ? "text-white" : "text-[#1A1B2E]"}`}>
                  {language === "bg" ? moodInfo.bg : moodInfo.en}
                </p>
              </div>
            </div>
          )}

          {/* Top Decade */}
          {stats.top_decade && (
            <div className={`flex items-center gap-2 px-4 py-2.5 rounded-xl ${theme === "dark" ? "bg-primary/10 border border-primary/20" : "bg-primary/5 border border-primary/15"}`}>
              <Calendar className="w-4 h-4 text-primary" />
              <div>
                <p className={`text-xs ${theme === "dark" ? "text-[#5B5D78]" : "text-[#A7A7C7]"}`}>
                  {language === "bg" ? "Топ десетилетие" : "Top Decade"}
                </p>
                <p className={`text-sm font-semibold ${theme === "dark" ? "text-white" : "text-[#1A1B2E]"}`}>
                  {stats.top_decade}s
                </p>
              </div>
            </div>
          )}

          {/* Member Since */}
          {stats.member_since && (
            <div className={`flex items-center gap-2 px-4 py-2.5 rounded-xl ${theme === "dark" ? "bg-green-500/10 border border-green-500/20" : "bg-green-50 border border-green-200"}`}>
              <Calendar className="w-4 h-4 text-green-500" />
              <div>
                <p className={`text-xs ${theme === "dark" ? "text-[#5B5D78]" : "text-[#A7A7C7]"}`}>
                  {language === "bg" ? "Член от" : "Member Since"}
                </p>
                <p className={`text-sm font-semibold ${theme === "dark" ? "text-white" : "text-[#1A1B2E]"}`}>
                  {new Date(stats.member_since).toLocaleDateString(language === "bg" ? "bg-BG" : "en-US", { year: "numeric", month: "short" })}
                </p>
              </div>
            </div>
          )}

          {/* Favorite Genre Pills */}
          {stats.top_genres.slice(0, 4).map((g) => (
            <span
              key={g.genre}
              className={`px-4 py-2.5 rounded-xl text-sm font-medium ${
                theme === "dark"
                  ? "bg-primary/15 text-primary border border-primary/20"
                  : "bg-primary/10 text-primary border border-primary/15"
              }`}
            >
              {g.genre}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
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
// PROFILE SETTINGS (Enhanced)
// ============================================================================

function ProfileSettings({
  theme,
  language,
  user,
  setTheme,
  setLanguage,
}: {
  theme: string;
  language: string;
  user: { name: string; email: string };
  setTheme: (t: "dark" | "light") => void;
  setLanguage: (l: "en" | "bg") => void;
}) {
  // Password state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Preferences state
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [prefsMessage, setPrefsMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);


  // Privacy state
  const [profilePublic, setProfilePublic] = useState(true);
  const [showActivity, setShowActivity] = useState(true);

  // Load user preferences on mount
  useEffect(() => {
    api.get("/users/preferences")
      .then((res) => {
        setSelectedGenres(res.data.preferred_genres || []);
        setSelectedMood(res.data.preferred_mood || null);
      })
      .catch(() => {});
  }, []);

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword) return;
    setSavingPassword(true);
    setPasswordMessage(null);
    try {
      await api.put("/users/me/password", { current_password: currentPassword, new_password: newPassword });
      setPasswordMessage({ type: "success", text: language === "bg" ? "Паролата е сменена успешно" : "Password changed successfully" });
      setCurrentPassword("");
      setNewPassword("");
    } catch (err: any) {
      setPasswordMessage({ type: "error", text: err.response?.data?.detail || (language === "bg" ? "Грешка при смяна на паролата" : "Failed to change password") });
    } finally {
      setSavingPassword(false);
    }
  };

  const toggleGenre = (genreId: string) => {
    setSelectedGenres((prev) =>
      prev.includes(genreId)
        ? prev.filter((g) => g !== genreId)
        : prev.length < 5 ? [...prev, genreId] : prev
    );
  };

  const handleSavePreferences = async () => {
    setSavingPrefs(true);
    setPrefsMessage(null);
    try {
      await api.post("/users/preferences", {
        preferred_genres: selectedGenres,
        preferred_mood: selectedMood,
      });
      setPrefsMessage({ type: "success", text: language === "bg" ? "Предпочитанията са запазени" : "Preferences saved" });
    } catch {
      setPrefsMessage({ type: "error", text: language === "bg" ? "Грешка при запазване" : "Failed to save preferences" });
    } finally {
      setSavingPrefs(false);
    }
  };

  const handleClearHistory = () => {
    if (confirm(language === "bg" ? "Сигурни ли сте? Това ще нулира препоръките." : "Are you sure? This will reset your recommendations.")) {
      // Future: implement clear history API
      alert(language === "bg" ? "Функцията ще бъде налична скоро" : "Feature coming soon");
    }
  };

  const handleDeleteAccount = () => {
    if (confirm(language === "bg" ? "Сигурни ли сте? Това действие е необратимо!" : "Are you sure? This action cannot be undone!")) {
      // Future: implement delete account API
      alert(language === "bg" ? "Функцията ще бъде налична скоро" : "Feature coming soon");
    }
  };

  const cardClass = `rounded-xl p-6 ${theme === "dark" ? "bg-[#1A1A33]/80 border border-[#2A2A4A]" : "bg-white border border-[#E2E4F0] shadow-sm"}`;
  const labelClass = `block text-sm font-medium mb-2 ${theme === "dark" ? "text-[#A7A7C7]" : "text-[#5B5D78]"}`;
  const headingClass = `text-lg font-semibold mb-4 flex items-center gap-2 ${theme === "dark" ? "text-white" : "text-[#1A1B2E]"}`;

  return (
    <div className="max-w-2xl space-y-6">
      {/* ==================== A) Preferences ==================== */}
      <div className={cardClass}>
        <h3 className={headingClass}>
          <SlidersHorizontal className="w-5 h-5 text-primary" />
          {language === "bg" ? "Предпочитания" : "Preferences"}
        </h3>

        {/* Preferred Genres */}
        <div className="mb-6">
          <label className={labelClass}>
            {language === "bg" ? "Предпочитани жанрове" : "Preferred Genres"}
            <span className={`ml-2 text-xs font-normal ${theme === "dark" ? "text-[#5B5D78]" : "text-[#A7A7C7]"}`}>
              ({selectedGenres.length}/5)
            </span>
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {GENRES.map((genre) => (
              <button
                key={genre.id}
                onClick={() => toggleGenre(genre.id)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                  selectedGenres.includes(genre.id)
                    ? "bg-primary text-white"
                    : theme === "dark"
                    ? "bg-[#2A2A4A] text-[#A7A7C7] hover:bg-[#3A3A5A]"
                    : "bg-gray-100 text-[#5B5D78] hover:bg-gray-200"
                }`}
              >
                {language === "bg" ? genre.bg : genre.en}
              </button>
            ))}
          </div>
        </div>

        {/* Preferred Mood */}
        <div className="mb-6">
          <label className={labelClass}>
            {language === "bg" ? "Предпочитано настроение" : "Preferred Mood"}
          </label>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(MOOD_LABELS).map(([id, label]) => (
              <button
                key={id}
                onClick={() => setSelectedMood(selectedMood === id ? null : id)}
                className={`px-3 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                  selectedMood === id
                    ? "bg-secondary text-white"
                    : theme === "dark"
                    ? "bg-[#2A2A4A] text-[#A7A7C7] hover:bg-[#3A3A5A]"
                    : "bg-gray-100 text-[#5B5D78] hover:bg-gray-200"
                }`}
              >
                {language === "bg" ? label.bg : label.en}
              </button>
            ))}
          </div>
        </div>

        {prefsMessage && (
          <div className={`p-3 rounded-lg mb-4 ${prefsMessage.type === "success" ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"}`}>
            {prefsMessage.text}
          </div>
        )}

        <button
          onClick={handleSavePreferences}
          disabled={savingPrefs}
          className="px-6 py-2.5 bg-primary text-white font-semibold rounded-lg hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2"
        >
          {savingPrefs && <Loader2 className="w-4 h-4 animate-spin" />}
          {language === "bg" ? "Запази предпочитания" : "Save Preferences"}
        </button>
      </div>


      {/* ==================== C) Appearance ==================== */}
      <div className={cardClass}>
        <h3 className={headingClass}>
          <Palette className="w-5 h-5 text-purple-500" />
          {language === "bg" ? "Външен вид" : "Appearance"}
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Theme */}
          <div>
            <label className={labelClass}>
              {language === "bg" ? "Тема" : "Theme"}
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => setTheme("light")}
                className={`flex-1 px-3 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                  theme === "light"
                    ? "bg-primary text-white"
                    : theme === "dark"
                    ? "bg-[#2A2A4A] text-[#A7A7C7]"
                    : "bg-gray-100 text-[#5B5D78]"
                }`}
              >
                <Sun className="w-4 h-4" />
                {language === "bg" ? "Светла" : "Light"}
              </button>
              <button
                onClick={() => setTheme("dark")}
                className={`flex-1 px-3 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                  theme === "dark"
                    ? "bg-primary text-white"
                    : "bg-gray-100 text-[#5B5D78]"
                }`}
              >
                <Moon className="w-4 h-4" />
                {language === "bg" ? "Тъмна" : "Dark"}
              </button>
            </div>
          </div>

          {/* Language */}
          <div>
            <label className={labelClass}>
              {language === "bg" ? "Език" : "Language"}
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => setLanguage("en")}
                className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                  language === "en"
                    ? "bg-primary text-white"
                    : theme === "dark"
                    ? "bg-[#2A2A4A] text-[#A7A7C7]"
                    : "bg-gray-100 text-[#5B5D78]"
                }`}
              >
                <Globe className="w-4 h-4" />
                English
              </button>
              <button
                onClick={() => setLanguage("bg")}
                className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                  language === "bg"
                    ? "bg-primary text-white"
                    : theme === "dark"
                    ? "bg-[#2A2A4A] text-[#A7A7C7]"
                    : "bg-gray-100 text-[#5B5D78]"
                }`}
              >
                <Globe className="w-4 h-4" />
                Български
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ==================== D) Privacy & Security ==================== */}
      <div className={cardClass}>
        <h3 className={headingClass}>
          <Shield className="w-5 h-5 text-green-500" />
          {language === "bg" ? "Поверителност и сигурност" : "Privacy & Security"}
        </h3>

        {/* Privacy Toggles */}
        <div className="space-y-4 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <p className={`font-medium ${theme === "dark" ? "text-white" : "text-[#1A1B2E]"}`}>
                {language === "bg" ? "Публичен профил" : "Public Profile"}
              </p>
              <p className={`text-xs ${theme === "dark" ? "text-[#5B5D78]" : "text-[#A7A7C7]"}`}>
                {language === "bg" ? "Другите могат да виждат профила ти" : "Others can see your profile"}
              </p>
            </div>
            <button
              onClick={() => setProfilePublic(!profilePublic)}
              className={`w-12 h-6 rounded-full transition-all ${
                profilePublic ? "bg-primary" : theme === "dark" ? "bg-[#2A2A4A]" : "bg-gray-300"
              }`}
            >
              <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${profilePublic ? "translate-x-6" : "translate-x-0.5"}`} />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className={`font-medium ${theme === "dark" ? "text-white" : "text-[#1A1B2E]"}`}>
                {language === "bg" ? "Показвай активност" : "Show Activity"}
              </p>
              <p className={`text-xs ${theme === "dark" ? "text-[#5B5D78]" : "text-[#A7A7C7]"}`}>
                {language === "bg" ? "Показвай какво гледаш и харесваш" : "Show what you watch and like"}
              </p>
            </div>
            <button
              onClick={() => setShowActivity(!showActivity)}
              className={`w-12 h-6 rounded-full transition-all ${
                showActivity ? "bg-primary" : theme === "dark" ? "bg-[#2A2A4A]" : "bg-gray-300"
              }`}
            >
              <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${showActivity ? "translate-x-6" : "translate-x-0.5"}`} />
            </button>
          </div>
        </div>

        {/* Change Password */}
        <div className={`pt-4 border-t ${theme === "dark" ? "border-[#2A2A4A]" : "border-[#E2E4F0]"}`}>
          <div className="flex items-center gap-2 mb-4">
            <Lock className="w-4 h-4 text-[#A7A7C7]" />
            <h4 className={`font-medium ${theme === "dark" ? "text-white" : "text-[#1A1B2E]"}`}>
              {language === "bg" ? "Смяна на парола" : "Change Password"}
            </h4>
          </div>

          {passwordMessage && (
            <div className={`p-3 rounded-lg mb-4 ${passwordMessage.type === "success" ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"}`}>
              {passwordMessage.text}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div className="relative">
              <input
                type={showCurrentPassword ? "text" : "password"}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder={language === "bg" ? "Текуща парола" : "Current password"}
                className={`w-full px-4 py-2.5 pr-10 rounded-lg border focus:outline-none focus:ring-2 focus:ring-primary ${
                  theme === "dark"
                    ? "bg-[#2A2A4A] border-[#2A2A4A] text-white placeholder-[#5B5D78]"
                    : "bg-[#F8F9FC] border-[#E2E4F0] text-[#1A1B2E] placeholder-[#A7A7C7]"
                }`}
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                className={`absolute right-3 top-1/2 -translate-y-1/2 ${theme === "dark" ? "text-[#5B5D78]" : "text-[#A7A7C7]"}`}
              >
                {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <div className="relative">
              <input
                type={showNewPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder={language === "bg" ? "Нова парола" : "New password"}
                className={`w-full px-4 py-2.5 pr-10 rounded-lg border focus:outline-none focus:ring-2 focus:ring-primary ${
                  theme === "dark"
                    ? "bg-[#2A2A4A] border-[#2A2A4A] text-white placeholder-[#5B5D78]"
                    : "bg-[#F8F9FC] border-[#E2E4F0] text-[#1A1B2E] placeholder-[#A7A7C7]"
                }`}
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className={`absolute right-3 top-1/2 -translate-y-1/2 ${theme === "dark" ? "text-[#5B5D78]" : "text-[#A7A7C7]"}`}
              >
                {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          {newPassword && <PasswordStrength password={newPassword} language={language} />}
          <button
            onClick={handleChangePassword}
            disabled={savingPassword || !currentPassword || !newPassword}
            className="mt-4 px-5 py-2 bg-primary text-white font-medium rounded-lg hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2"
          >
            {savingPassword && <Loader2 className="w-4 h-4 animate-spin" />}
            {language === "bg" ? "Смени паролата" : "Change Password"}
          </button>
        </div>
      </div>

      {/* ==================== E) Data ==================== */}
      <div className={cardClass}>
        <h3 className={headingClass}>
          <Database className="w-5 h-5 text-orange-500" />
          {language === "bg" ? "Данни" : "Data"}
        </h3>

        <div className="space-y-4">
          {/* Export Data */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${theme === "dark" ? "bg-blue-500/10" : "bg-blue-50"}`}>
                <Download className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className={`font-medium ${theme === "dark" ? "text-white" : "text-[#1A1B2E]"}`}>
                  {language === "bg" ? "Експортирай данни" : "Export My Data"}
                </p>
                <p className={`text-xs ${theme === "dark" ? "text-[#5B5D78]" : "text-[#A7A7C7]"}`}>
                  {language === "bg" ? "Изтегли всички твои данни" : "Download all your data"}
                </p>
              </div>
            </div>
            <button className={`px-4 py-2 rounded-lg text-sm font-medium ${
              theme === "dark" ? "bg-[#2A2A4A] text-white hover:bg-[#3A3A5A]" : "bg-gray-100 text-[#1A1B2E] hover:bg-gray-200"
            }`}>
              {language === "bg" ? "Скоро" : "Coming Soon"}
            </button>
          </div>

          {/* Clear History */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${theme === "dark" ? "bg-yellow-500/10" : "bg-yellow-50"}`}>
                <RotateCcw className="w-5 h-5 text-yellow-500" />
              </div>
              <div>
                <p className={`font-medium ${theme === "dark" ? "text-white" : "text-[#1A1B2E]"}`}>
                  {language === "bg" ? "Изчисти история" : "Clear History"}
                </p>
                <p className={`text-xs ${theme === "dark" ? "text-[#5B5D78]" : "text-[#A7A7C7]"}`}>
                  {language === "bg" ? "Нулирай препоръките" : "Reset your recommendations"}
                </p>
              </div>
            </div>
            <button
              onClick={handleClearHistory}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                theme === "dark" ? "bg-[#2A2A4A] text-white hover:bg-[#3A3A5A]" : "bg-gray-100 text-[#1A1B2E] hover:bg-gray-200"
              }`}
            >
              {language === "bg" ? "Изчисти" : "Clear"}
            </button>
          </div>

          {/* Delete Account */}
          <div className={`flex items-center justify-between pt-4 border-t ${theme === "dark" ? "border-[#2A2A4A]" : "border-[#E2E4F0]"}`}>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-500/10">
                <AlertTriangle className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <p className="font-medium text-red-500">
                  {language === "bg" ? "Изтрий акаунт" : "Delete Account"}
                </p>
                <p className={`text-xs ${theme === "dark" ? "text-[#5B5D78]" : "text-[#A7A7C7]"}`}>
                  {language === "bg" ? "Това действие е необратимо" : "This action cannot be undone"}
                </p>
              </div>
            </div>
            <button
              onClick={handleDeleteAccount}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-red-500/10 text-red-500 hover:bg-red-500/20"
            >
              {language === "bg" ? "Изтрий" : "Delete"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// MY REVIEWS SECTION
// ============================================================================

function MyReviewsSection({
  theme,
  language,
  onCount,
}: {
  theme: string;
  language: string;
  onCount: (n: number) => void;
}) {
  const navigate = useNavigate();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editRating, setEditRating] = useState(0);
  const [editComment, setEditComment] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);

  useEffect(() => {
    fetchReviews();
  }, []);

  const fetchReviews = async () => {
    try {
      const res = await api.get("/reviews/my-reviews");
      setReviews(res.data || []);
      onCount((res.data || []).length);
    } catch {
      setReviews([]);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (review: Review) => {
    setEditingId(review.id);
    setEditRating(review.rating || 0);
    setEditComment(review.comment || "");
  };

  const handleSaveEdit = async (reviewId: number) => {
    if (!editComment || editComment.length < 10) return;
    setSaving(true);
    try {
      await api.put(`/reviews/${reviewId}`, {
        rating: editRating,
        comment: editComment,
      });
      setEditingId(null);
      fetchReviews();
    } catch (err) {
      console.error("Failed to update review:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (reviewId: number) => {
    if (!confirm(language === "bg" ? "Сигурни ли сте, че искате да изтриете това ревю?" : "Are you sure you want to delete this review?")) {
      return;
    }
    setDeleting(reviewId);
    try {
      await api.delete(`/reviews/${reviewId}`);
      fetchReviews();
    } catch (err) {
      console.error("Failed to delete review:", err);
    } finally {
      setDeleting(null);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(language === "bg" ? "bg-BG" : "en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Loading skeletons
  if (loading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 2 }).map((_, i) => (
          <div
            key={i}
            className={`animate-pulse rounded-xl p-4 flex gap-4 ${
              theme === "dark" ? "bg-[#1A1A33]/50" : "bg-gray-100"
            }`}
          >
            <div className={`w-16 h-24 rounded-lg ${theme === "dark" ? "bg-[#2A2A4A]" : "bg-gray-200"}`} />
            <div className="flex-1 space-y-2">
              <div className={`h-4 rounded ${theme === "dark" ? "bg-[#2A2A4A]" : "bg-gray-200"} w-1/3`} />
              <div className={`h-3 rounded ${theme === "dark" ? "bg-[#2A2A4A]" : "bg-gray-200"} w-1/4`} />
              <div className={`h-3 rounded ${theme === "dark" ? "bg-[#2A2A4A]" : "bg-gray-200"} w-full`} />
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Empty state
  if (reviews.length === 0) {
    return (
      <div className={`text-center py-12 rounded-xl ${theme === "dark" ? "bg-[#1A1A33]/50" : "bg-[#F3F4FF]"}`}>
        <MessageSquare className={`w-12 h-12 mx-auto mb-3 ${theme === "dark" ? "text-[#5B5D78]" : "text-[#A7A7C7]"}`} />
        <p className={`text-sm mb-4 ${theme === "dark" ? "text-[#A7A7C7]" : "text-[#5B5D78]"}`}>
          {language === "bg" ? "Нямате ревюта все още" : "No reviews yet"}
        </p>
        <Link
          to="/browse"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary text-white font-semibold text-sm hover:brightness-110 transition"
        >
          <Compass className="w-4 h-4" />
          {language === "bg" ? "Разгледай филми" : "Browse Movies"}
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {reviews.map((review) => {
        const movie = review.movie;
        const posterUrl = movie?.poster_url || (movie?.poster_path ? `https://image.tmdb.org/t/p/w154${movie.poster_path}` : null);
        const title = language === "bg" ? movie?.title_bg || movie?.title : movie?.title;
        const isEditing = editingId === review.id;

        return (
          <div
            key={review.id}
            className={`rounded-xl p-4 ${
              theme === "dark"
                ? "bg-[#1A1A33]/80 border border-[#2A2A4A]"
                : "bg-white border border-[#E2E4F0] shadow-sm"
            }`}
          >
            <div className="flex gap-4">
              {/* Movie Poster */}
              {movie && (
                <div
                  onClick={() => navigate(`/movie/${movie.id}`)}
                  className="flex-shrink-0 cursor-pointer group"
                >
                  {posterUrl ? (
                    <img
                      src={posterUrl}
                      alt={title}
                      className="w-16 h-24 rounded-lg object-cover group-hover:ring-2 ring-primary transition"
                      loading="lazy"
                    />
                  ) : (
                    <div className={`w-16 h-24 rounded-lg flex items-center justify-center ${
                      theme === "dark" ? "bg-[#2A2A4A]" : "bg-gray-200"
                    }`}>
                      <Film className="w-6 h-6 text-[#A7A7C7]" />
                    </div>
                  )}
                </div>
              )}

              {/* Review Content */}
              <div className="flex-1 min-w-0">
                {/* Header: Title + Rating */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <h4
                      onClick={() => movie && navigate(`/movie/${movie.id}`)}
                      className={`font-semibold cursor-pointer hover:text-primary transition ${
                        theme === "dark" ? "text-white" : "text-[#1A1B2E]"
                      }`}
                    >
                      {title || "Unknown Movie"}
                    </h4>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`w-3.5 h-3.5 ${
                              star <= (review.rating || 0)
                                ? "text-yellow-400 fill-yellow-400"
                                : theme === "dark"
                                ? "text-[#2A2A4A]"
                                : "text-gray-300"
                            }`}
                          />
                        ))}
                      </div>
                      <span className={`text-xs ${theme === "dark" ? "text-[#A7A7C7]" : "text-[#5B5D78]"}`}>
                        {(review.rating || 0).toFixed(1)}/5
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  {!isEditing && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleEdit(review)}
                        className={`p-1.5 rounded-lg transition ${
                          theme === "dark"
                            ? "hover:bg-[#2A2A4A] text-[#A7A7C7] hover:text-white"
                            : "hover:bg-gray-100 text-[#5B5D78] hover:text-[#1A1B2E]"
                        }`}
                        title={language === "bg" ? "Редактирай" : "Edit"}
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(review.id)}
                        disabled={deleting === review.id}
                        className={`p-1.5 rounded-lg transition ${
                          theme === "dark"
                            ? "hover:bg-red-500/20 text-[#A7A7C7] hover:text-red-400"
                            : "hover:bg-red-50 text-[#5B5D78] hover:text-red-500"
                        }`}
                        title={language === "bg" ? "Изтрий" : "Delete"}
                      >
                        {deleting === review.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  )}
                </div>

                {/* Review Text or Edit Form */}
                {isEditing ? (
                  <div className="space-y-3">
                    {/* Rating Editor */}
                    <div className="flex items-center gap-2">
                      <span className={`text-sm ${theme === "dark" ? "text-[#A7A7C7]" : "text-[#5B5D78]"}`}>
                        {language === "bg" ? "Оценка:" : "Rating:"}
                      </span>
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            onClick={() => setEditRating(star)}
                            className="p-0.5"
                          >
                            <Star
                              className={`w-5 h-5 transition ${
                                star <= editRating
                                  ? "text-yellow-400 fill-yellow-400"
                                  : theme === "dark"
                                  ? "text-[#2A2A4A] hover:text-yellow-400/50"
                                  : "text-gray-300 hover:text-yellow-400/50"
                              }`}
                            />
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Comment Editor */}
                    <textarea
                      value={editComment}
                      onChange={(e) => setEditComment(e.target.value)}
                      rows={3}
                      className={`w-full px-3 py-2 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary ${
                        theme === "dark"
                          ? "bg-[#2A2A4A] border-[#2A2A4A] text-white"
                          : "bg-[#F8F9FC] border-[#E2E4F0] text-[#1A1B2E]"
                      }`}
                      placeholder={language === "bg" ? "Напиши ревю (мин. 10 символа)" : "Write a review (min 10 characters)"}
                    />

                    {/* Edit Actions */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleSaveEdit(review.id)}
                        disabled={saving || editComment.length < 10}
                        className="px-4 py-1.5 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                      >
                        {saving && <Loader2 className="w-3 h-3 animate-spin" />}
                        {language === "bg" ? "Запази" : "Save"}
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className={`px-4 py-1.5 text-sm font-medium rounded-lg ${
                          theme === "dark"
                            ? "bg-[#2A2A4A] text-white hover:bg-[#3A3A5A]"
                            : "bg-gray-100 text-[#1A1B2E] hover:bg-gray-200"
                        }`}
                      >
                        {language === "bg" ? "Отказ" : "Cancel"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className={`text-sm line-clamp-3 ${theme === "dark" ? "text-[#A7A7C7]" : "text-[#5B5D78]"}`}>
                      {review.comment}
                    </p>
                    {review.created_at && (
                      <div className={`flex items-center gap-1 mt-2 text-xs ${
                        theme === "dark" ? "text-[#5B5D78]" : "text-[#A7A7C7]"
                      }`}>
                        <Calendar className="w-3 h-3" />
                        {formatDate(review.created_at)}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ============================================================================
// MAIN PROFILE PAGE
// ============================================================================

export default function Profile() {
  const navigate = useNavigate();
  const { theme, language, user, isAuthenticated, setTheme, setLanguage } = useApp();
  const [activeTab, setActiveTab] = useState<ProfileTab>("overview");
  const [counts, setCounts] = useState<ProfileCounts>({ favorites: 0, completed: 0, watchlist: 0, watching: 0, reviews: 0 });

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
              <div className={`flex items-center gap-2 px-4 py-2.5 rounded-xl ${theme === "dark" ? "bg-white/5 border border-white/10" : "bg-white/10 border border-white/20"}`}>
                <MessageSquare className="w-4 h-4 text-purple-400" />
                <span className="text-white font-semibold text-lg">{counts.reviews}</span>
                <span className="text-[#A7A7C7] text-sm hidden sm:inline">{language === "bg" ? "Ревюта" : "Reviews"}</span>
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
              onClick={() => setActiveTab("reviews")}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium text-sm transition-all ${
                activeTab === "reviews"
                  ? "bg-primary text-white shadow-sm"
                  : "text-[#A7A7C7] hover:text-[#EDEDF7]"
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              {language === "bg" ? "Ревюта" : "Reviews"}
              {counts.reviews > 0 && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                  activeTab === "reviews" ? "bg-white/20" : "bg-white/10"
                }`}>
                  {counts.reviews}
                </span>
              )}
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
            {/* Stats Dashboard */}
            <section>
              <SectionHeader
                icon={TrendingUp} iconColor="bg-primary/10 text-primary"
                label={language === "bg" ? "Табло" : "Dashboard"}
                theme={theme}
              />
              <ProfileStatsSection theme={theme} language={language} />
            </section>

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

        {activeTab === "reviews" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-500/10">
                  <MessageSquare className="w-6 h-6 text-purple-500" />
                </div>
                <div>
                  <h2 className={`text-xl font-semibold ${theme === "dark" ? "text-white" : "text-[#1A1B2E]"}`}>
                    {language === "bg" ? "Моите ревюта" : "My Reviews"}
                  </h2>
                  <p className={`text-sm ${theme === "dark" ? "text-[#A7A7C7]" : "text-[#5B5D78]"}`}>
                    {language === "bg" ? "Всички ревюта, които си написал" : "All reviews you've written"}
                  </p>
                </div>
              </div>
            </div>
            <MyReviewsSection theme={theme} language={language} onCount={updateCount("reviews")} />
          </div>
        )}

        {activeTab === "settings" && (
          <ProfileSettings
            theme={theme}
            language={language}
            user={user}
            setTheme={setTheme}
            setLanguage={setLanguage}
          />
        )}
      </div>
    </div>
  );
}