import { useNavigate } from "react-router-dom";
import { useApp } from "../../../context/AppContext";
import {
  Users, Film, MessageSquare, Heart, Bookmark,
  AlertTriangle, Clock, Loader2,
} from "lucide-react";
import StatCard from "../components/StatCard";
import AuditRow from "../components/AuditRow";
import { card, mutedText, headText } from "../constants";
import type { Stats } from "../types";

interface DashboardTabProps {
  stats: Stats | null;
  loading: boolean;
}

export default function DashboardTab({ stats, loading }: DashboardTabProps) {
  const { theme, language } = useApp();
  const navigate = useNavigate();

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-muted" /></div>;
  if (!stats) return <p className="text-muted text-center py-12">Failed to load stats</p>;

  const popularFallback = stats.popular_movies_fallback || [];
  const recentActions = stats.recent_actions || [];
  const hasReviews = stats.top_reviewed_movies.length > 0;

  return (
    <div className="space-y-8">
      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard label={language === "bg" ? "Потребители" : "Users"} value={stats.totals.users} icon={Users} color="bg-blue-500/20 text-blue-400" />
        <StatCard label={language === "bg" ? "Филми" : "Movies"} value={stats.totals.movies} icon={Film} color="bg-green-500/20 text-green-400" />
        <StatCard label={language === "bg" ? "Ревюта" : "Reviews"} value={stats.totals.reviews} icon={MessageSquare} color="bg-primary/20 text-primary" />
        <StatCard label="Watchlist" value={stats.totals.watchlist_entries} icon={Bookmark} color="bg-yellow-500/20 text-yellow-400" />
        <StatCard label={language === "bg" ? "Любими" : "Favorites"} value={stats.totals.favorites} icon={Heart} color="bg-secondary/20 text-secondary" />
      </div>

      {/* Data quality */}
      <div className={`rounded-xl p-5 ${card(theme)}`}>
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle className="w-5 h-5 text-amber-400" />
          <h3 className={`font-semibold ${headText(theme)}`}>
            {language === "bg" ? "Качество на данните" : "Data Quality"}
          </h3>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <p className={`text-2xl font-bold ${stats.quality.missing_bg_translation > 0 ? "text-amber-400" : "text-green-400"}`}>
              {stats.quality.missing_bg_translation}
            </p>
            <p className={`text-xs ${mutedText(theme)}`}>
              {language === "bg" ? "Без BG заглавие" : "Missing BG title"}
            </p>
          </div>
          <div>
            <p className={`text-2xl font-bold ${(stats.quality.missing_summary_bg || 0) > 0 ? "text-amber-400" : "text-green-400"}`}>
              {stats.quality.missing_summary_bg || 0}
            </p>
            <p className={`text-xs ${mutedText(theme)}`}>
              {language === "bg" ? "Без BG описание" : "Missing BG summary"}
            </p>
          </div>
          <div>
            <p className={`text-2xl font-bold ${stats.quality.missing_backdrop > 0 ? "text-amber-400" : "text-green-400"}`}>
              {stats.quality.missing_backdrop}
            </p>
            <p className={`text-xs ${mutedText(theme)}`}>
              {language === "bg" ? "Без фон" : "Missing backdrop"}
            </p>
          </div>
          <div>
            <p className={`text-2xl font-bold ${headText(theme)}`}>
              {stats.quality.avg_review_rating != null ? `${stats.quality.avg_review_rating.toFixed(1)}/5` : "—"}
            </p>
            <p className={`text-xs ${mutedText(theme)}`}>
              {language === "bg" ? "Среден рейтинг" : "Avg review rating"}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top reviewed / popular fallback */}
        <div className={`rounded-xl p-5 ${card(theme)}`}>
          <h3 className={`font-semibold mb-4 ${headText(theme)}`}>
            {hasReviews
              ? (language === "bg" ? "Най-ревюирани филми" : "Top Reviewed Movies")
              : (language === "bg" ? "Най-популярни филми" : "Most Popular Movies")}
          </h3>
          <div className="space-y-3">
            {hasReviews ? stats.top_reviewed_movies.map((m, i) => (
              <div key={m.id} className="flex items-center gap-3 cursor-pointer" onClick={() => navigate(`/movie/${m.id}`)}>
                <span className={`w-6 text-center font-bold text-sm ${mutedText(theme)}`}>{i + 1}</span>
                <div className="w-8 h-12 rounded overflow-hidden bg-gray-700 flex-shrink-0">
                  {m.poster_path && <img src={`https://image.tmdb.org/t/p/w92${m.poster_path}`} alt="" className="w-full h-full object-cover" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium truncate ${headText(theme)}`}>{m.title}</p>
                  <p className="text-xs text-muted">{m.review_count} reviews · {m.avg_rating?.toFixed(1)}/5</p>
                </div>
              </div>
            )) : popularFallback.map((m, i) => (
              <div key={m.id} className="flex items-center gap-3 cursor-pointer" onClick={() => navigate(`/movie/${m.id}`)}>
                <span className={`w-6 text-center font-bold text-sm ${mutedText(theme)}`}>{i + 1}</span>
                <div className="w-8 h-12 rounded overflow-hidden bg-gray-700 flex-shrink-0">
                  {m.poster_path && <img src={`https://image.tmdb.org/t/p/w92${m.poster_path}`} alt="" className="w-full h-full object-cover" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium truncate ${headText(theme)}`}>{m.title}</p>
                  <p className="text-xs text-muted">Popularity: {m.popularity}</p>
                </div>
              </div>
            ))}
            {!hasReviews && popularFallback.length === 0 && (
              <p className="text-muted text-sm text-center py-4">{language === "bg" ? "Няма данни" : "No data yet"}</p>
            )}
          </div>
        </div>

        {/* Most active users */}
        <div className={`rounded-xl p-5 ${card(theme)}`}>
          <h3 className={`font-semibold mb-4 ${headText(theme)}`}>
            {language === "bg" ? "Най-активни потребители" : "Most Active Users"}
          </h3>
          <div className="space-y-3">
            {stats.top_active_users.map((u, i) => (
              <div key={u.id} className="flex items-center gap-3">
                <span className={`w-6 text-center font-bold text-sm ${mutedText(theme)}`}>{i + 1}</span>
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#A78BFA] to-[#2DD4BF] flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-bold text-xs">{u.name?.charAt(0).toUpperCase()}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium truncate ${headText(theme)}`}>{u.name}</p>
                  <p className="text-xs text-muted">{u.email}</p>
                </div>
                <span className={`text-xs font-medium px-2 py-1 rounded ${theme === "dark" ? "bg-primary/20 text-primary" : "bg-primary/10 text-primary"}`}>
                  {u.review_count} reviews
                </span>
              </div>
            ))}
            {stats.top_active_users.length === 0 && (
              <p className="text-muted text-sm text-center py-4">{language === "bg" ? "Няма активност" : "No activity yet"}</p>
            )}
          </div>
        </div>
      </div>

      {/* Recent admin actions */}
      {recentActions.length > 0 && (
        <div className={`rounded-xl p-5 ${card(theme)}`}>
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-5 h-5 text-blue-400" />
            <h3 className={`font-semibold ${headText(theme)}`}>
              {language === "bg" ? "Последни действия" : "Recent Actions"}
            </h3>
          </div>
          <div className={`divide-y ${theme === "dark" ? "divide-gray-800" : "divide-gray-100"}`}>
            {recentActions.slice(0, 8).map((ev, i) => (
              <AuditRow key={i} event={ev} compact />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
