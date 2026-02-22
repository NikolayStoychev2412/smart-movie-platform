import { useState, useEffect } from "react";
import api from "../../../api/client";
import { Film, Clock, Star, Edit3, BarChart3, Sparkles, Calendar } from "lucide-react";
import { GENRES, MOOD_LABELS } from "../../../constants/preferences";
import type { ProfileStats } from "../types";

export default function ProfileStatsSection({ theme, language }: { theme: string; language: string }) {
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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className={`animate-pulse rounded-xl p-5 ${theme === "dark" ? "bg-surface-2/80" : "bg-white"}`}>
              <div className={`w-10 h-10 rounded-lg ${theme === "dark" ? "bg-border" : "bg-gray-200"} mb-3`} />
              <div className={`h-7 w-16 rounded ${theme === "dark" ? "bg-border" : "bg-gray-200"} mb-2`} />
              <div className={`h-3 w-24 rounded ${theme === "dark" ? "bg-border" : "bg-gray-200"}`} />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[1, 2].map((i) => (
            <div key={i} className={`animate-pulse rounded-xl p-6 ${theme === "dark" ? "bg-surface-2/80" : "bg-white"}`}>
              <div className={`h-5 w-40 rounded ${theme === "dark" ? "bg-border" : "bg-gray-200"} mb-4`} />
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((j) => (
                  <div key={j} className="flex items-center gap-3">
                    <div className={`h-4 w-12 rounded ${theme === "dark" ? "bg-border" : "bg-gray-200"}`} />
                    <div className={`h-3 flex-1 rounded ${theme === "dark" ? "bg-border" : "bg-gray-200"}`} />
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

  const genreEnToBg: Record<string, string> = {
    ...Object.fromEntries(GENRES.map(g => [g.en.toLowerCase(), g.bg])),
    // TMDB canonical names that differ from our display labels
    "science fiction": "Научна фантастика",
    "family": "Семеен",
    "history": "Исторически",
    "music": "Музикален",
    "mystery": "Мистерия",
    "war": "Военен",
    "western": "Уестърн",
  };
  const translateGenre = (g: string) => language === "bg" ? (genreEnToBg[g.toLowerCase()] || g) : g;

  const maxRatingCount = Math.max(...Object.values(stats.rating_distribution), 1);
  const totalRatings = Object.values(stats.rating_distribution).reduce((a, b) => a + b, 0);
  const moodInfo = stats.preferred_mood ? MOOD_LABELS[stats.preferred_mood] : null;
  const hoursWatched = Math.round(stats.minutes_watched / 60);
  const totalGenreCount = stats.top_genres.reduce((a, b) => a + b.count, 0);

  const cardClass = `rounded-xl border ${theme === "dark" ? "bg-surface-2/80 border-border" : "bg-white border-border shadow-sm"}`;

  const statCards = [
    {
      icon: Film,
      value: stats.total_completed,
      label: language === "bg" ? "Изгледани филми" : "Movies Watched",
      borderColor: "border-l-blue-500",
      iconBg: theme === "dark" ? "bg-blue-500/10" : "bg-blue-50",
      iconColor: "text-blue-500",
    },
    {
      icon: Clock,
      value: hoursWatched,
      label: language === "bg" ? "Часове гледане" : "Hours Watched",
      suffix: language === "bg" ? "ч" : "h",
      borderColor: "border-l-purple-500",
      iconBg: theme === "dark" ? "bg-purple-500/10" : "bg-purple-50",
      iconColor: "text-purple-500",
    },
    {
      icon: Star,
      value: stats.average_rating_given > 0 ? stats.average_rating_given : 0,
      label: language === "bg" ? "Средна оценка" : "Avg Rating",
      isDecimal: true,
      borderColor: "border-l-yellow-500",
      iconBg: theme === "dark" ? "bg-yellow-500/10" : "bg-yellow-50",
      iconColor: "text-yellow-500",
    },
    {
      icon: Edit3,
      value: stats.total_reviews,
      label: language === "bg" ? "Ревюта" : "Reviews",
      borderColor: "border-l-green-500",
      iconBg: theme === "dark" ? "bg-green-500/10" : "bg-green-50",
      iconColor: "text-green-500",
    },
  ];

  const genreColors = [
    "bg-blue-500", "bg-purple-500", "bg-pink-500", "bg-orange-500",
    "bg-cyan-500", "bg-green-500", "bg-red-500", "bg-yellow-500",
  ];

  return (
    <div className="space-y-6">
      {/* Top Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className={`${cardClass} p-5 border-l-[3px] ${card.borderColor}`}>
              <div className={`w-10 h-10 rounded-lg ${card.iconBg} flex items-center justify-center mb-3`}>
                <Icon className={`w-5 h-5 ${card.iconColor}`} />
              </div>
              <p className={`text-2xl md:text-3xl font-bold text-text`}>
                {card.isDecimal ? card.value.toFixed(1) : card.value}
                {card.suffix && <span className="text-lg font-medium ml-0.5">{card.suffix}</span>}
              </p>
              <p className={`text-sm mt-1 text-muted`}>
                {card.label}
              </p>
            </div>
          );
        })}
      </div>

      {/* Middle Row: Rating Distribution + Top Genres */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Rating Distribution */}
        <div className={`${cardClass} p-6`}>
          <div className="flex items-center gap-2 mb-5">
            <BarChart3 className="w-5 h-5 text-yellow-500" />
            <h3 className={`text-lg font-semibold text-text`}>
              {language === "bg" ? "Разпределение на оценки" : "Rating Distribution"}
            </h3>
            {totalRatings > 0 && (
              <span className={`text-xs px-2 py-0.5 rounded-full ml-auto ${theme === "dark" ? "bg-border text-muted" : "bg-gray-100 text-muted"}`}>
                {totalRatings} {language === "bg" ? "общо" : "total"}
              </span>
            )}
          </div>

          {totalRatings === 0 ? (
            <div className={`text-center py-8 text-muted`}>
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
                      <span className={`text-sm font-semibold text-text`}>{rating}</span>
                      <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
                    </div>
                    <div className={`flex-1 h-4 rounded-full overflow-hidden ${theme === "dark" ? "bg-border" : "bg-gray-100"}`}>
                      <div className="h-full rounded-full bg-yellow-500 transition-all duration-700 ease-out" style={{ width: `${percentage}%` }} />
                    </div>
                    <span className={`text-xs w-12 text-right font-medium text-muted`}>
                      {count} <span className="opacity-60">({percentOfTotal}%)</span>
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {stats.average_rating_given > 0 && (
            <div className={`mt-5 pt-4 border-t border-border`}>
              <div className="flex items-center justify-between">
                <span className={`text-sm text-muted`}>
                  {language === "bg" ? "Средна оценка" : "Average rating"}
                </span>
                <div className="flex items-center gap-1.5">
                  <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                  <span className={`text-lg font-bold text-text`}>
                    {stats.average_rating_given.toFixed(1)}
                  </span>
                  <span className={`text-sm text-muted`}>/5</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Top Genres */}
        <div className={`${cardClass} p-6`}>
          <div className="flex items-center gap-2 mb-5">
            <Sparkles className="w-5 h-5 text-primary" />
            <h3 className={`text-lg font-semibold text-text`}>
              {language === "bg" ? "Топ жанрове" : "Top Genres"}
            </h3>
          </div>

          {stats.top_genres.length === 0 ? (
            <div className={`text-center py-8 text-muted`}>
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
                      <span className={`text-sm font-medium text-text`}>
                        {translateGenre(genre.genre)}
                      </span>
                      <span className={`text-xs font-medium text-muted`}>
                        {genre.count} ({pct}%)
                      </span>
                    </div>
                    <div className={`h-3 rounded-full overflow-hidden ${theme === "dark" ? "bg-border" : "bg-gray-100"}`}>
                      <div className={`h-full rounded-full ${colorClass} transition-all duration-700 ease-out`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Bottom Row: Taste Insights */}
      <div className={`${cardClass} p-6`}>
        <div className="flex items-center gap-2 mb-5">
          <Sparkles className="w-5 h-5 text-primary" />
          <h3 className={`text-lg font-semibold text-text`}>
            {language === "bg" ? "Твоят вкус" : "Taste Insights"}
          </h3>
        </div>

        <div className="flex flex-wrap gap-3">
          {moodInfo && (
            <div className={`flex items-center gap-2 px-4 py-2.5 rounded-xl ${theme === "dark" ? "bg-secondary/10 border border-secondary/20" : "bg-secondary/5 border border-secondary/15"}`}>
              <div>
                <p className={`text-xs text-muted`}>
                  {language === "bg" ? "Настроение" : "Mood"}
                </p>
                <p className={`text-sm font-semibold text-text`}>
                  {language === "bg" ? moodInfo.bg : moodInfo.en}
                </p>
              </div>
            </div>
          )}

          {stats.top_decade && (
            <div className={`flex items-center gap-2 px-4 py-2.5 rounded-xl ${theme === "dark" ? "bg-primary/10 border border-primary/20" : "bg-primary/5 border border-primary/15"}`}>
              <Calendar className="w-4 h-4 text-primary" />
              <div>
                <p className={`text-xs text-muted`}>
                  {language === "bg" ? "Топ десетилетие" : "Top Decade"}
                </p>
                <p className={`text-sm font-semibold text-text`}>
                  {stats.top_decade}s
                </p>
              </div>
            </div>
          )}

          {stats.member_since && (
            <div className={`flex items-center gap-2 px-4 py-2.5 rounded-xl ${theme === "dark" ? "bg-green-500/10 border border-green-500/20" : "bg-green-50 border border-green-200"}`}>
              <Calendar className="w-4 h-4 text-green-500" />
              <div>
                <p className={`text-xs text-muted`}>
                  {language === "bg" ? "Член от" : "Member Since"}
                </p>
                <p className={`text-sm font-semibold text-text`}>
                  {new Date(stats.member_since).toLocaleDateString(language === "bg" ? "bg-BG" : "en-US", { year: "numeric", month: "short" })}
                </p>
              </div>
            </div>
          )}

          {stats.top_genres.slice(0, 4).map((g) => (
            <span
              key={g.genre}
              className={`px-4 py-2.5 rounded-xl text-sm font-medium ${
                theme === "dark"
                  ? "bg-primary/15 text-primary border border-primary/20"
                  : "bg-primary/10 text-primary border border-primary/15"
              }`}
            >
              {translateGenre(g.genre)}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
