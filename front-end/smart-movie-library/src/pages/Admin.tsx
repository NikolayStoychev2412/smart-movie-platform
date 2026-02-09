import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import api from "../api/client";
import {
  BarChart3, Users, Film, MessageSquare, Trash2, Shield, ShieldCheck,
  Search, ChevronLeft, ChevronRight, AlertTriangle, Star, Eye,
  Heart, Bookmark, Loader2, X, Pencil, Check, Clock, Activity,
  ShieldOff
} from "lucide-react";

// ============================================================================
// TYPES
// ============================================================================

interface Stats {
  totals: { users: number; movies: number; reviews: number; watchlist_entries: number; favorites: number };
  quality: { missing_bg_translation: number; missing_summary_bg?: number; missing_backdrop: number; avg_review_rating: number | null };
  top_reviewed_movies: { id: number; title: string; poster_path: string; review_count: number; avg_rating: number | null }[];
  popular_movies_fallback?: { id: number; title: string; poster_path: string; popularity: number }[];
  top_active_users: { id: number; name: string; email: string; review_count: number }[];
  recent_actions?: AuditEvent[];
}

interface UserItem {
  id: number; name: string; email: string; is_admin: boolean; created_at?: string;
  preferred_genres?: string[]; preferred_mood?: string;
}

interface ReviewItem {
  id: number; user_id: number; user_name: string; user_email: string;
  movie_id: number; movie_title: string; rating: number; comment: string | null; created_at: string | null;
}

interface MovieItem {
  id: number; title: string; title_bg?: string; genre?: string; genre_bg?: string;
  tmdb_rating?: number; average_rating?: number; review_count?: number;
  poster_path?: string; poster_url?: string; backdrop_path?: string; backdrop_url?: string;
  release_date?: string; release_year?: number; runtime?: number;
  summary?: string; summary_bg?: string; popularity?: number;
}

interface AuditEvent {
  timestamp: string;
  event_type: string;
  user_id?: number;
  user_email?: string;
  ip_address?: string;
  success?: boolean;
  details?: Record<string, any>;
}

interface MovieEditForm {
  title: string; title_bg: string;
  genre: string; genre_bg: string;
  summary: string; summary_bg: string;
  release_date: string; runtime: string;
  poster_path: string; backdrop_path: string;
}

type Tab = "dashboard" | "users" | "movies" | "reviews" | "activity";

// ============================================================================
// STAT CARD
// ============================================================================

function StatCard({ label, value, icon: Icon, color }: { label: string; value: number | string; icon: React.ComponentType<{ className?: string }>; color: string }) {
  const { theme } = useApp();
  return (
    <div className={`p-5 rounded-xl ${theme === "dark" ? "bg-[#2A2A4A]/60 border border-[#2A2A4A]/50" : "bg-white border border-[#E2E4F0] shadow-sm"}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className={`text-sm font-medium ${theme === "dark" ? "text-[#A7A7C7]" : "text-[#5B5D78]"}`}>{label}</p>
          <p className={`text-2xl font-bold mt-1 ${theme === "dark" ? "text-white" : "text-[#1A1B2E]"}`}>{value}</p>
        </div>
        <div className={`p-3 rounded-lg ${color}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// AUDIT EVENT ROW (shared between dashboard and activity tab)
// ============================================================================

const eventLabels: Record<string, { label: string; color: string }> = {
  delete_review: { label: "Deleted review", color: "text-red-400" },
  delete_movie: { label: "Deleted movie", color: "text-red-400" },
  update_movie: { label: "Edited movie", color: "text-yellow-400" },
  review_deleted: { label: "Deleted review", color: "text-red-400" },
  movie_deleted: { label: "Deleted movie", color: "text-red-400" },
  movie_created: { label: "Edited movie", color: "text-yellow-400" },
  user_deleted: { label: "Deleted user", color: "text-red-400" },
  user_created: { label: "New user", color: "text-green-400" },
  admin_promoted: { label: "Promoted to admin", color: "text-amber-400" },
  admin_demoted: { label: "Demoted from admin", color: "text-orange-400" },
  password_changed: { label: "Password changed", color: "text-blue-400" },
  login_success: { label: "Login", color: "text-blue-400" },
  login_failed: { label: "Failed login", color: "text-red-400" },
  admin_action: { label: "Admin action", color: "text-amber-400" },
};

function AuditRow({ event, compact = false }: { event: AuditEvent; compact?: boolean }) {
  const { theme } = useApp();
  const action = event.details?.action || event.event_type;
  const config = eventLabels[action] || eventLabels[event.event_type] || { label: action, color: "text-[#A7A7C7]" };

  const detail = event.details?.movie_title || event.details?.deleted_user_email || event.details?.reviewer_email || "";
  const time = event.timestamp ? new Date(event.timestamp).toLocaleString() : "";

  if (compact) {
    return (
      <div className={`flex items-center gap-3 py-2 ${theme === "dark" ? "border-[#2A2A4A]" : "border-gray-100"}`}>
        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${config.color.replace("text-", "bg-")}`} />
        <div className="flex-1 min-w-0">
          <span className={`text-sm font-medium ${config.color}`}>{config.label}</span>
          {detail && <span className={`text-sm ml-1.5 ${theme === "dark" ? "text-[#A7A7C7]" : "text-[#5B5D78]"}`}>· {detail}</span>}
        </div>
        <span className={`text-xs flex-shrink-0 ${theme === "dark" ? "text-[#5B5D78]" : "text-[#A7A7C7]"}`}>{time}</span>
      </div>
    );
  }

  return (
    <tr className={theme === "dark" ? "hover:bg-[#2A2A4A]/40" : "hover:bg-[#F8F9FC]"}>
      <td className="px-4 py-3">
        <span className={`text-sm font-medium ${config.color}`}>{config.label}</span>
      </td>
      <td className={`px-4 py-3 text-sm ${theme === "dark" ? "text-[#A7A7C7]" : "text-[#5B5D78]"}`}>
        {detail || "—"}
      </td>
      <td className={`px-4 py-3 text-sm ${theme === "dark" ? "text-[#A7A7C7]" : "text-[#5B5D78]"}`}>
        {event.user_email || "—"}
      </td>
      <td className={`px-4 py-3 text-xs ${theme === "dark" ? "text-[#A7A7C7]" : "text-[#5B5D78]"}`}>
        {time}
      </td>
      <td className={`px-4 py-3 text-xs ${theme === "dark" ? "text-[#5B5D78]" : "text-[#A7A7C7]"}`}>
        {event.ip_address || "—"}
      </td>
    </tr>
  );
}

// ============================================================================
// DASHBOARD TAB
// ============================================================================

function DashboardTab({ stats, loading }: { stats: Stats | null; loading: boolean }) {
  const { theme, language } = useApp();
  const navigate = useNavigate();

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-[#A7A7C7]" /></div>;
  if (!stats) return <p className="text-[#A7A7C7] text-center py-12">Failed to load stats</p>;

  // Use top_reviewed if available, else popular fallback
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
      <div className={`rounded-xl p-5 ${theme === "dark" ? "bg-[#2A2A4A]/60 border border-[#2A2A4A]/50" : "bg-white border border-[#E2E4F0] shadow-sm"}`}>
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle className="w-5 h-5 text-amber-400" />
          <h3 className={`font-semibold ${theme === "dark" ? "text-white" : "text-[#1A1B2E]"}`}>
            {language === "bg" ? "Качество на данните" : "Data Quality"}
          </h3>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <p className={`text-2xl font-bold ${stats.quality.missing_bg_translation > 0 ? "text-amber-400" : "text-green-400"}`}>
              {stats.quality.missing_bg_translation}
            </p>
            <p className={`text-xs ${theme === "dark" ? "text-[#A7A7C7]" : "text-[#5B5D78]"}`}>
              {language === "bg" ? "Без BG заглавие" : "Missing BG title"}
            </p>
          </div>
          <div>
            <p className={`text-2xl font-bold ${(stats.quality.missing_summary_bg || 0) > 0 ? "text-amber-400" : "text-green-400"}`}>
              {stats.quality.missing_summary_bg || 0}
            </p>
            <p className={`text-xs ${theme === "dark" ? "text-[#A7A7C7]" : "text-[#5B5D78]"}`}>
              {language === "bg" ? "Без BG описание" : "Missing BG summary"}
            </p>
          </div>
          <div>
            <p className={`text-2xl font-bold ${stats.quality.missing_backdrop > 0 ? "text-amber-400" : "text-green-400"}`}>
              {stats.quality.missing_backdrop}
            </p>
            <p className={`text-xs ${theme === "dark" ? "text-[#A7A7C7]" : "text-[#5B5D78]"}`}>
              {language === "bg" ? "Без фон" : "Missing backdrop"}
            </p>
          </div>
          <div>
            <p className={`text-2xl font-bold ${theme === "dark" ? "text-white" : "text-[#1A1B2E]"}`}>
              {stats.quality.avg_review_rating ? `${stats.quality.avg_review_rating}/5` : "—"}
            </p>
            <p className={`text-xs ${theme === "dark" ? "text-[#A7A7C7]" : "text-[#5B5D78]"}`}>
              {language === "bg" ? "Среден рейтинг" : "Avg review rating"}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top reviewed / popular fallback */}
        <div className={`rounded-xl p-5 ${theme === "dark" ? "bg-[#2A2A4A]/60 border border-[#2A2A4A]/50" : "bg-white border border-[#E2E4F0] shadow-sm"}`}>
          <h3 className={`font-semibold mb-4 ${theme === "dark" ? "text-white" : "text-[#1A1B2E]"}`}>
            {hasReviews
              ? (language === "bg" ? "Най-ревюирани филми" : "Top Reviewed Movies")
              : (language === "bg" ? "Най-популярни филми" : "Most Popular Movies")}
          </h3>
          <div className="space-y-3">
            {hasReviews ? stats.top_reviewed_movies.map((m, i) => (
              <div key={m.id} className="flex items-center gap-3 cursor-pointer" onClick={() => navigate(`/movie/${m.id}`)}>
                <span className={`w-6 text-center font-bold text-sm ${theme === "dark" ? "text-[#A7A7C7]" : "text-[#5B5D78]"}`}>{i + 1}</span>
                <div className="w-8 h-12 rounded overflow-hidden bg-gray-700 flex-shrink-0">
                  {m.poster_path && <img src={`https://image.tmdb.org/t/p/w92${m.poster_path}`} alt="" className="w-full h-full object-cover" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium truncate ${theme === "dark" ? "text-white" : "text-[#1A1B2E]"}`}>{m.title}</p>
                  <p className="text-xs text-[#A7A7C7]">{m.review_count} reviews · {m.avg_rating?.toFixed(1)}/5</p>
                </div>
              </div>
            )) : popularFallback.map((m, i) => (
              <div key={m.id} className="flex items-center gap-3 cursor-pointer" onClick={() => navigate(`/movie/${m.id}`)}>
                <span className={`w-6 text-center font-bold text-sm ${theme === "dark" ? "text-[#A7A7C7]" : "text-[#5B5D78]"}`}>{i + 1}</span>
                <div className="w-8 h-12 rounded overflow-hidden bg-gray-700 flex-shrink-0">
                  {m.poster_path && <img src={`https://image.tmdb.org/t/p/w92${m.poster_path}`} alt="" className="w-full h-full object-cover" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium truncate ${theme === "dark" ? "text-white" : "text-[#1A1B2E]"}`}>{m.title}</p>
                  <p className="text-xs text-[#A7A7C7]">Popularity: {m.popularity}</p>
                </div>
              </div>
            ))}
            {!hasReviews && popularFallback.length === 0 && (
              <p className="text-[#A7A7C7] text-sm text-center py-4">{language === "bg" ? "Няма данни" : "No data yet"}</p>
            )}
          </div>
        </div>

        {/* Most active users */}
        <div className={`rounded-xl p-5 ${theme === "dark" ? "bg-[#2A2A4A]/60 border border-[#2A2A4A]/50" : "bg-white border border-[#E2E4F0] shadow-sm"}`}>
          <h3 className={`font-semibold mb-4 ${theme === "dark" ? "text-white" : "text-[#1A1B2E]"}`}>
            {language === "bg" ? "Най-активни потребители" : "Most Active Users"}
          </h3>
          <div className="space-y-3">
            {stats.top_active_users.map((u, i) => (
              <div key={u.id} className="flex items-center gap-3">
                <span className={`w-6 text-center font-bold text-sm ${theme === "dark" ? "text-[#A7A7C7]" : "text-[#5B5D78]"}`}>{i + 1}</span>
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#A78BFA] to-[#2DD4BF] flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-bold text-xs">{u.name?.charAt(0).toUpperCase()}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium truncate ${theme === "dark" ? "text-white" : "text-[#1A1B2E]"}`}>{u.name}</p>
                  <p className="text-xs text-[#A7A7C7]">{u.email}</p>
                </div>
                <span className={`text-xs font-medium px-2 py-1 rounded ${theme === "dark" ? "bg-primary/20 text-primary" : "bg-primary/10 text-primary"}`}>
                  {u.review_count} reviews
                </span>
              </div>
            ))}
            {stats.top_active_users.length === 0 && <p className="text-[#A7A7C7] text-sm text-center py-4">{language === "bg" ? "Няма активност" : "No activity yet"}</p>}
          </div>
        </div>
      </div>

      {/* Recent admin actions */}
      {recentActions.length > 0 && (
        <div className={`rounded-xl p-5 ${theme === "dark" ? "bg-[#2A2A4A]/60 border border-[#2A2A4A]/50" : "bg-white border border-[#E2E4F0] shadow-sm"}`}>
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-5 h-5 text-blue-400" />
            <h3 className={`font-semibold ${theme === "dark" ? "text-white" : "text-[#1A1B2E]"}`}>
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

// ============================================================================
// USERS TAB
// ============================================================================

function UsersTab() {
  const { theme, language, user: currentUser } = useApp();
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 20;

  useEffect(() => {
    api.get("/users/").then(r => { setUsers(r.data); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const handleDelete = async (userId: number, userName: string) => {
    if (!confirm(language === "bg" ? `Изтрий потребител "${userName}"?` : `Delete user "${userName}"?`)) return;
    setActionLoading(userId);
    try {
      await api.delete(`/users/${userId}`);
      setUsers(prev => prev.filter(u => u.id !== userId));
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed");
    }
    setActionLoading(null);
  };

  const handleToggleAdmin = async (userId: number, currentlyAdmin: boolean) => {
    const endpoint = currentlyAdmin ? "remove-admin" : "make-admin";
    const confirmMsg = currentlyAdmin
      ? (language === "bg" ? "Премахни админ права?" : "Remove admin privileges?")
      : (language === "bg" ? "Направи админ?" : "Make this user an admin?");
    if (!confirm(confirmMsg)) return;
    setActionLoading(userId);
    try {
      await api.patch(`/users/${userId}/${endpoint}`);
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, is_admin: !currentlyAdmin } : u));
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed");
    }
    setActionLoading(null);
  };

  const filtered = users.filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  // Paginate the filtered results
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  // Reset page when search changes
  useEffect(() => { setPage(0); }, [search]);

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-[#A7A7C7]" /></div>;

  return (
    <div className="space-y-4">
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A7A7C7]" />
        <input type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder={language === "bg" ? "Търси по име или имейл..." : "Search by name or email..."}
          className={`w-full pl-10 pr-4 py-2.5 rounded-lg border ${theme === "dark" ? "bg-[#2A2A4A] border-[#2A2A4A] text-white placeholder:text-[#A7A7C7]" : "bg-white border-[#E2E4F0] text-[#1A1B2E] placeholder:text-[#A7A7C7]"} focus:outline-none focus:ring-2 focus:ring-primary`}
        />
      </div>

      <div className={`rounded-xl overflow-hidden border ${theme === "dark" ? "border-[#2A2A4A]/50" : "border-[#E2E4F0]"}`}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className={theme === "dark" ? "bg-[#2A2A4A]/80" : "bg-[#F8F9FC]"}>
                <th className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider ${theme === "dark" ? "text-[#A7A7C7]" : "text-[#5B5D78]"}`}>ID</th>
                <th className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider ${theme === "dark" ? "text-[#A7A7C7]" : "text-[#5B5D78]"}`}>{language === "bg" ? "Потребител" : "User"}</th>
                <th className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider ${theme === "dark" ? "text-[#A7A7C7]" : "text-[#5B5D78]"}`}>Email</th>
                <th className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider ${theme === "dark" ? "text-[#A7A7C7]" : "text-[#5B5D78]"}`}>{language === "bg" ? "Дата" : "Joined"}</th>
                <th className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider ${theme === "dark" ? "text-[#A7A7C7]" : "text-[#5B5D78]"}`}>{language === "bg" ? "Роля" : "Role"}</th>
                <th className={`px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider ${theme === "dark" ? "text-[#A7A7C7]" : "text-[#5B5D78]"}`}>{language === "bg" ? "Действия" : "Actions"}</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${theme === "dark" ? "divide-gray-700/50" : "divide-gray-100"}`}>
              {paginated.map(u => (
                <tr key={u.id} className={theme === "dark" ? "hover:bg-[#2A2A4A]/40" : "hover:bg-[#F8F9FC]"}>
                  <td className={`px-4 py-3 text-sm ${theme === "dark" ? "text-[#A7A7C7]" : "text-[#5B5D78]"}`}>{u.id}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#A78BFA] to-[#2DD4BF] flex items-center justify-center flex-shrink-0">
                        <span className="text-white font-bold text-xs">{u.name?.charAt(0).toUpperCase()}</span>
                      </div>
                      <span className={`text-sm font-medium ${theme === "dark" ? "text-white" : "text-[#1A1B2E]"}`}>{u.name}</span>
                    </div>
                  </td>
                  <td className={`px-4 py-3 text-sm ${theme === "dark" ? "text-[#A7A7C7]" : "text-[#5B5D78]"}`}>{u.email}</td>
                  <td className={`px-4 py-3 text-xs ${theme === "dark" ? "text-[#A7A7C7]" : "text-[#5B5D78]"}`}>
                    {u.created_at ? new Date(u.created_at).toLocaleDateString(language === "bg" ? "bg-BG" : "en-US", { year: "numeric", month: "short", day: "numeric" }) : "—"}
                  </td>
                  <td className="px-4 py-3">
                    {u.is_admin ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full bg-amber-500/20 text-amber-400">
                        <ShieldCheck className="w-3 h-3" /> Admin
                      </span>
                    ) : (
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${theme === "dark" ? "bg-gray-700 text-[#A7A7C7]" : "bg-[#F3F4FF] text-[#A7A7C7]"}`}>User</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      {u.id !== currentUser?.id && (
                        <button onClick={() => handleToggleAdmin(u.id, u.is_admin)} disabled={actionLoading === u.id}
                          className={`p-2 rounded-lg transition-colors ${
                            u.is_admin
                              ? (theme === "dark" ? "hover:bg-red-500/20 text-amber-400 hover:text-red-400" : "hover:bg-red-50 text-amber-600 hover:text-red-600")
                              : (theme === "dark" ? "hover:bg-amber-500/20 text-[#A7A7C7] hover:text-amber-400" : "hover:bg-amber-50 text-[#A7A7C7] hover:text-amber-600")
                          }`}
                          title={u.is_admin ? (language === "bg" ? "Премахни админ" : "Remove admin") : (language === "bg" ? "Направи админ" : "Make admin")}>
                          {actionLoading === u.id ? <Loader2 className="w-4 h-4 animate-spin" /> : u.is_admin ? <ShieldOff className="w-4 h-4" /> : <Shield className="w-4 h-4" />}
                        </button>
                      )}
                      {u.id !== currentUser?.id && (
                        <button onClick={() => handleDelete(u.id, u.name)} disabled={actionLoading === u.id}
                          className={`p-2 rounded-lg transition-colors ${theme === "dark" ? "hover:bg-red-500/20 text-[#A7A7C7] hover:text-red-400" : "hover:bg-red-50 text-[#A7A7C7] hover:text-red-600"}`}
                          title={language === "bg" ? "Изтрий" : "Delete"}>
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {paginated.length === 0 && (
          <p className={`text-center py-8 text-sm ${theme === "dark" ? "text-[#A7A7C7]" : "text-[#5B5D78]"}`}>
            {search ? (language === "bg" ? "Няма резултати" : "No results") : (language === "bg" ? "Няма потребители" : "No users")}
          </p>
        )}
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <p className={`text-xs ${theme === "dark" ? "text-[#5B5D78]" : "text-[#A7A7C7]"}`}>
          {language === "bg"
            ? `${filtered.length} от ${users.length} потребители${totalPages > 1 ? ` · Стр. ${page + 1} от ${totalPages}` : ""}`
            : `${filtered.length} of ${users.length} users${totalPages > 1 ? ` · Page ${page + 1} of ${totalPages}` : ""}`}
        </p>
        {totalPages > 1 && (
          <div className="flex gap-2">
            <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
              className={`p-2 rounded-lg border ${theme === "dark" ? "border-[#2A2A4A] text-[#A7A7C7] hover:bg-[#2A2A4A] disabled:opacity-30" : "border-[#E2E4F0] text-[#A7A7C7] hover:bg-[#F8F9FC] disabled:opacity-30"}`}>
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
              className={`p-2 rounded-lg border ${theme === "dark" ? "border-[#2A2A4A] text-[#A7A7C7] hover:bg-[#2A2A4A] disabled:opacity-30" : "border-[#E2E4F0] text-[#A7A7C7] hover:bg-[#F8F9FC] disabled:opacity-30"}`}>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// MOVIES TAB — server-side search + pagination
// ============================================================================

function MoviesTab() {
  const { theme, language } = useApp();
  const navigate = useNavigate();
  const [movies, setMovies] = useState<MovieItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [page, setPage] = useState(0);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<MovieEditForm>({
    title: "", title_bg: "", genre: "", genre_bg: "",
    summary: "", summary_bg: "", release_date: "", runtime: "",
    poster_path: "", backdrop_path: "",
  });
  const PAGE_SIZE = 20;

  const fetchMovies = useCallback((pg: number, q: string) => {
    setLoading(true);
    api.get("/admin/movies", { params: { search: q, skip: pg * PAGE_SIZE, limit: PAGE_SIZE } })
      .then(r => {
        setMovies(r.data.movies);
        setTotal(r.data.total);
        setLoading(false);
      })
      .catch(() => {
        // Fallback to public endpoint if admin endpoint not registered yet
        api.get("/movies/", { params: { limit: 500 } })
          .then(r => {
            const all: MovieItem[] = r.data;
            const filtered = q
              ? all.filter(m => (m.title || "").toLowerCase().includes(q.toLowerCase()) || (m.title_bg || "").toLowerCase().includes(q.toLowerCase()))
              : all;
            setTotal(filtered.length);
            setMovies(filtered.slice(pg * PAGE_SIZE, (pg + 1) * PAGE_SIZE));
            setLoading(false);
          })
          .catch(() => setLoading(false));
      });
  }, []);

  useEffect(() => { fetchMovies(page, search); }, [page, search, fetchMovies]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput.trim());
    setPage(0);
  };

  const handleDelete = async (movieId: number, title: string) => {
    if (!confirm(language === "bg" ? `Изтрий филм "${title}" и всички свързани данни?` : `Delete movie "${title}" and all related data?`)) return;
    setActionLoading(movieId);
    try {
      await api.delete(`/admin/movies/${movieId}`);
      setMovies(prev => prev.filter(m => m.id !== movieId));
      setTotal(t => t - 1);
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed");
    }
    setActionLoading(null);
  };

  const startEdit = (m: MovieItem) => {
    setEditingId(m.id);
    setEditForm({
      title: m.title || "", title_bg: m.title_bg || "",
      genre: m.genre || "", genre_bg: m.genre_bg || "",
      summary: m.summary || "", summary_bg: m.summary_bg || "",
      release_date: m.release_date || "", runtime: m.runtime != null ? String(m.runtime) : "",
      poster_path: m.poster_path || "", backdrop_path: m.backdrop_path || "",
    });
  };

  const saveEdit = async (movieId: number) => {
    setActionLoading(movieId);
    try {
      const payload: Record<string, any> = { ...editForm };
      // Convert runtime to int for the backend
      if (payload.runtime) payload.runtime = parseInt(payload.runtime, 10) || null;
      else payload.runtime = null;

      await api.put(`/admin/movies/${movieId}`, payload);
      setMovies(prev => prev.map(m => m.id === movieId ? {
        ...m,
        title: editForm.title, title_bg: editForm.title_bg,
        genre: editForm.genre, genre_bg: editForm.genre_bg,
        summary: editForm.summary, summary_bg: editForm.summary_bg,
        release_date: editForm.release_date,
        runtime: editForm.runtime ? parseInt(editForm.runtime, 10) : undefined,
        poster_path: editForm.poster_path, backdrop_path: editForm.backdrop_path,
      } : m));
      setEditingId(null);
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to save");
    }
    setActionLoading(null);
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const inputCls = `w-full px-2 py-1 rounded text-sm border ${theme === "dark" ? "bg-gray-700 border-gray-600 text-white placeholder:text-[#A7A7C7]" : "bg-white border-[#E2E4F0] placeholder:text-[#A7A7C7]"}`;

  if (loading && movies.length === 0) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-[#A7A7C7]" /></div>;

  return (
    <div className="space-y-4">
      {/* Search */}
      <form onSubmit={handleSearch} className="flex gap-2 max-w-lg">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A7A7C7]" />
          <input type="text" value={searchInput} onChange={e => setSearchInput(e.target.value)}
            placeholder={language === "bg" ? "Търси филми..." : "Search movies..."}
            className={`w-full pl-10 pr-4 py-2.5 rounded-lg border ${theme === "dark" ? "bg-[#2A2A4A] border-[#2A2A4A] text-white placeholder:text-[#A7A7C7]" : "bg-white border-[#E2E4F0] text-[#1A1B2E] placeholder:text-[#A7A7C7]"} focus:outline-none focus:ring-2 focus:ring-primary`}
          />
        </div>
        <button type="submit" className="px-4 py-2.5 bg-primary text-white rounded-lg font-medium hover:brightness-110 transition">
          {language === "bg" ? "Търси" : "Search"}
        </button>
        {search && (
          <button type="button" onClick={() => { setSearchInput(""); setSearch(""); setPage(0); }}
            className={`p-2.5 rounded-lg border ${theme === "dark" ? "border-[#2A2A4A] text-[#A7A7C7] hover:bg-[#2A2A4A]" : "border-[#E2E4F0] text-[#A7A7C7] hover:bg-[#F8F9FC]"}`}>
            <X className="w-5 h-5" />
          </button>
        )}
      </form>

      {/* Table */}
      <div className={`rounded-xl overflow-hidden border ${theme === "dark" ? "border-[#2A2A4A]/50" : "border-[#E2E4F0]"}`}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className={theme === "dark" ? "bg-[#2A2A4A]/80" : "bg-[#F8F9FC]"}>
                <th className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider ${theme === "dark" ? "text-[#A7A7C7]" : "text-[#5B5D78]"}`}>ID</th>
                <th className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider ${theme === "dark" ? "text-[#A7A7C7]" : "text-[#5B5D78]"}`}>{language === "bg" ? "Филм" : "Movie"}</th>
                <th className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider ${theme === "dark" ? "text-[#A7A7C7]" : "text-[#5B5D78]"}`}>{language === "bg" ? "Жанр" : "Genre"}</th>
                <th className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider ${theme === "dark" ? "text-[#A7A7C7]" : "text-[#5B5D78]"}`}>{language === "bg" ? "Рейтинг" : "Rating"}</th>
                <th className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider ${theme === "dark" ? "text-[#A7A7C7]" : "text-[#5B5D78]"}`}>{language === "bg" ? "Година" : "Year"}</th>
                <th className={`px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider ${theme === "dark" ? "text-[#A7A7C7]" : "text-[#5B5D78]"}`}>{language === "bg" ? "Действия" : "Actions"}</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${theme === "dark" ? "divide-gray-700/50" : "divide-gray-100"}`}>
              {movies.map(m => (
                <tr key={m.id} className={theme === "dark" ? "hover:bg-[#2A2A4A]/40" : "hover:bg-[#F8F9FC]"}>
                  <td className={`px-4 py-3 text-sm ${theme === "dark" ? "text-[#A7A7C7]" : "text-[#5B5D78]"}`}>{m.id}</td>
                  <td className="px-4 py-3">
                    {editingId === m.id ? (
                      <div className="space-y-1">
                        <input value={editForm.title} onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))} className={inputCls} placeholder="Title (EN)" />
                        <input value={editForm.title_bg} onChange={e => setEditForm(f => ({ ...f, title_bg: e.target.value }))} className={inputCls} placeholder="Title (BG)" />
                      </div>
                    ) : (
                      <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate(`/movie/${m.id}`)}>
                        <div className="w-8 h-12 rounded overflow-hidden bg-gray-700 flex-shrink-0">
                          {(m.poster_path || m.poster_url) && (
                            <img src={m.poster_path ? `https://image.tmdb.org/t/p/w92${m.poster_path}` : m.poster_url} alt="" className="w-full h-full object-cover" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className={`text-sm font-medium truncate ${theme === "dark" ? "text-white" : "text-[#1A1B2E]"}`}>{m.title}</p>
                          {m.title_bg && <p className="text-xs text-[#A7A7C7] truncate">{m.title_bg}</p>}
                        </div>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {editingId === m.id ? (
                      <div className="space-y-1">
                        <input value={editForm.genre} onChange={e => setEditForm(f => ({ ...f, genre: e.target.value }))} className={inputCls} placeholder="Genre (EN)" />
                        <input value={editForm.genre_bg} onChange={e => setEditForm(f => ({ ...f, genre_bg: e.target.value }))} className={inputCls} placeholder="Genre (BG)" />
                      </div>
                    ) : (
                      <span className={`text-sm ${theme === "dark" ? "text-[#A7A7C7]" : "text-[#5B5D78]"}`}>{m.genre || "—"}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {m.tmdb_rating ? (
                        <span className={`text-sm font-medium ${theme === "dark" ? "text-white" : "text-[#1A1B2E]"}`}>{m.tmdb_rating.toFixed(1)}</span>
                      ) : <span className="text-[#A7A7C7] text-sm">—</span>}
                      {(m.review_count || 0) > 0 && (
                        <span className="text-xs text-[#A7A7C7]">({m.review_count})</span>
                      )}
                    </div>
                  </td>
                  <td className={`px-4 py-3 text-sm ${theme === "dark" ? "text-[#A7A7C7]" : "text-[#5B5D78]"}`}>{m.release_year || "—"}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      {editingId === m.id ? (
                        <>
                          <button onClick={() => saveEdit(m.id)} disabled={actionLoading === m.id}
                            className="p-2 rounded-lg hover:bg-green-500/20 text-green-400" title="Save">
                            {actionLoading === m.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                          </button>
                          <button onClick={() => setEditingId(null)} className="p-2 rounded-lg hover:bg-[#2A2A4A]/20 text-[#A7A7C7]" title="Cancel">
                            <X className="w-4 h-4" />
                          </button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => navigate(`/movie/${m.id}`)}
                            className={`p-2 rounded-lg transition-colors ${theme === "dark" ? "hover:bg-blue-500/20 text-[#A7A7C7] hover:text-blue-400" : "hover:bg-blue-50 text-[#A7A7C7] hover:text-blue-600"}`} title="View">
                            <Eye className="w-4 h-4" />
                          </button>
                          <button onClick={() => startEdit(m)}
                            className={`p-2 rounded-lg transition-colors ${theme === "dark" ? "hover:bg-yellow-500/20 text-[#A7A7C7] hover:text-yellow-400" : "hover:bg-yellow-50 text-[#A7A7C7] hover:text-yellow-600"}`} title="Edit">
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDelete(m.id, m.title)} disabled={actionLoading === m.id}
                            className={`p-2 rounded-lg transition-colors ${theme === "dark" ? "hover:bg-red-500/20 text-[#A7A7C7] hover:text-red-400" : "hover:bg-red-50 text-[#A7A7C7] hover:text-red-600"}`} title="Delete">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {/* Expanded edit row for extra fields */}
              {movies.map(m => editingId === m.id ? (
                <tr key={`edit-${m.id}`} className={theme === "dark" ? "bg-[#2A2A4A]/30" : "bg-blue-50/30"}>
                  <td colSpan={6} className="px-4 py-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                      <div>
                        <label className={`block text-xs font-medium mb-1 ${theme === "dark" ? "text-[#A7A7C7]" : "text-[#5B5D78]"}`}>
                          {language === "bg" ? "Описание EN" : "Summary (EN)"}
                        </label>
                        <textarea value={editForm.summary} onChange={e => setEditForm(f => ({ ...f, summary: e.target.value }))}
                          rows={3} className={`${inputCls} resize-none`} placeholder="English summary..." />
                      </div>
                      <div>
                        <label className={`block text-xs font-medium mb-1 ${theme === "dark" ? "text-[#A7A7C7]" : "text-[#5B5D78]"}`}>
                          {language === "bg" ? "Описание BG" : "Summary (BG)"}
                        </label>
                        <textarea value={editForm.summary_bg} onChange={e => setEditForm(f => ({ ...f, summary_bg: e.target.value }))}
                          rows={3} className={`${inputCls} resize-none`} placeholder={language === "bg" ? "Описание на български..." : "Bulgarian summary..."} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div>
                        <label className={`block text-xs font-medium mb-1 ${theme === "dark" ? "text-[#A7A7C7]" : "text-[#5B5D78]"}`}>
                          {language === "bg" ? "Дата на издаване" : "Release date"}
                        </label>
                        <input type="date" value={editForm.release_date} onChange={e => setEditForm(f => ({ ...f, release_date: e.target.value }))}
                          className={inputCls} />
                      </div>
                      <div>
                        <label className={`block text-xs font-medium mb-1 ${theme === "dark" ? "text-[#A7A7C7]" : "text-[#5B5D78]"}`}>
                          {language === "bg" ? "Времетраене (мин)" : "Runtime (min)"}
                        </label>
                        <input type="number" value={editForm.runtime} onChange={e => setEditForm(f => ({ ...f, runtime: e.target.value }))}
                          className={inputCls} placeholder="120" />
                      </div>
                      <div>
                        <label className={`block text-xs font-medium mb-1 ${theme === "dark" ? "text-[#A7A7C7]" : "text-[#5B5D78]"}`}>
                          Poster path
                        </label>
                        <input value={editForm.poster_path} onChange={e => setEditForm(f => ({ ...f, poster_path: e.target.value }))}
                          className={inputCls} placeholder="/abc123.jpg" />
                      </div>
                      <div>
                        <label className={`block text-xs font-medium mb-1 ${theme === "dark" ? "text-[#A7A7C7]" : "text-[#5B5D78]"}`}>
                          Backdrop path
                        </label>
                        <input value={editForm.backdrop_path} onChange={e => setEditForm(f => ({ ...f, backdrop_path: e.target.value }))}
                          className={inputCls} placeholder="/xyz789.jpg" />
                      </div>
                    </div>
                  </td>
                </tr>
              ) : null)}
            </tbody>
          </table>
        </div>
        {movies.length === 0 && !loading && (
          <p className={`text-center py-8 text-sm ${theme === "dark" ? "text-[#A7A7C7]" : "text-[#5B5D78]"}`}>
            {search ? (language === "bg" ? "Няма резултати" : "No results") : (language === "bg" ? "Няма филми" : "No movies")}
          </p>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className={`text-xs ${theme === "dark" ? "text-[#5B5D78]" : "text-[#A7A7C7]"}`}>
            {language === "bg" ? `Стр. ${page + 1} от ${totalPages} (${total} филми)` : `Page ${page + 1} of ${totalPages} (${total} movies)`}
          </p>
          <div className="flex gap-2">
            <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
              className={`p-2 rounded-lg border ${theme === "dark" ? "border-[#2A2A4A] text-[#A7A7C7] hover:bg-[#2A2A4A] disabled:opacity-30" : "border-[#E2E4F0] text-[#A7A7C7] hover:bg-[#F8F9FC] disabled:opacity-30"}`}>
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
              className={`p-2 rounded-lg border ${theme === "dark" ? "border-[#2A2A4A] text-[#A7A7C7] hover:bg-[#2A2A4A] disabled:opacity-30" : "border-[#E2E4F0] text-[#A7A7C7] hover:bg-[#F8F9FC] disabled:opacity-30"}`}>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// REVIEWS TAB
// ============================================================================

function ReviewsTab() {
  const { theme, language } = useApp();
  const navigate = useNavigate();
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const PAGE_SIZE = 20;

  const fetchReviews = useCallback((pg: number, q: string) => {
    setLoading(true);
    api.get("/admin/reviews", { params: { search: q, skip: pg * PAGE_SIZE, limit: PAGE_SIZE } })
      .then(r => { setReviews(r.data.reviews); setTotal(r.data.total); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => { fetchReviews(page, search); }, [page, search, fetchReviews]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput.trim());
    setPage(0);
  };

  const handleDelete = async (reviewId: number) => {
    if (!confirm(language === "bg" ? "Изтрий това ревю?" : "Delete this review?")) return;
    setActionLoading(reviewId);
    try {
      await api.delete(`/admin/reviews/${reviewId}`);
      setReviews(prev => prev.filter(r => r.id !== reviewId));
      setTotal(t => t - 1);
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed");
    }
    setActionLoading(null);
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  if (loading && reviews.length === 0) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-[#A7A7C7]" /></div>;

  return (
    <div className="space-y-4">
      {/* Search */}
      <form onSubmit={handleSearch} className="flex gap-2 max-w-lg">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A7A7C7]" />
          <input type="text" value={searchInput} onChange={e => setSearchInput(e.target.value)}
            placeholder={language === "bg" ? "Търси по потребител или филм..." : "Search by user or movie..."}
            className={`w-full pl-10 pr-4 py-2.5 rounded-lg border ${theme === "dark" ? "bg-[#2A2A4A] border-[#2A2A4A] text-white placeholder:text-[#A7A7C7]" : "bg-white border-[#E2E4F0] text-[#1A1B2E] placeholder:text-[#A7A7C7]"} focus:outline-none focus:ring-2 focus:ring-primary`}
          />
        </div>
        <button type="submit" className="px-4 py-2.5 bg-primary text-white rounded-lg font-medium hover:brightness-110 transition">
          {language === "bg" ? "Търси" : "Search"}
        </button>
        {search && (
          <button type="button" onClick={() => { setSearchInput(""); setSearch(""); setPage(0); }}
            className={`p-2.5 rounded-lg border ${theme === "dark" ? "border-[#2A2A4A] text-[#A7A7C7] hover:bg-[#2A2A4A]" : "border-[#E2E4F0] text-[#A7A7C7] hover:bg-[#F8F9FC]"}`}>
            <X className="w-5 h-5" />
          </button>
        )}
      </form>

      <div className={`rounded-xl overflow-hidden border ${theme === "dark" ? "border-[#2A2A4A]/50" : "border-[#E2E4F0]"}`}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className={theme === "dark" ? "bg-[#2A2A4A]/80" : "bg-[#F8F9FC]"}>
                <th className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider ${theme === "dark" ? "text-[#A7A7C7]" : "text-[#5B5D78]"}`}>{language === "bg" ? "Потребител" : "User"}</th>
                <th className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider ${theme === "dark" ? "text-[#A7A7C7]" : "text-[#5B5D78]"}`}>{language === "bg" ? "Филм" : "Movie"}</th>
                <th className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider ${theme === "dark" ? "text-[#A7A7C7]" : "text-[#5B5D78]"}`}>{language === "bg" ? "Оценка" : "Rating"}</th>
                <th className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider ${theme === "dark" ? "text-[#A7A7C7]" : "text-[#5B5D78]"}`}>{language === "bg" ? "Коментар" : "Comment"}</th>
                <th className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider ${theme === "dark" ? "text-[#A7A7C7]" : "text-[#5B5D78]"}`}>{language === "bg" ? "Дата" : "Date"}</th>
                <th className={`px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider ${theme === "dark" ? "text-[#A7A7C7]" : "text-[#5B5D78]"}`}></th>
              </tr>
            </thead>
            <tbody className={`divide-y ${theme === "dark" ? "divide-gray-700/50" : "divide-gray-100"}`}>
              {reviews.map(r => (
                <tr key={r.id} className={theme === "dark" ? "hover:bg-[#2A2A4A]/40" : "hover:bg-[#F8F9FC]"}>
                  <td className="px-4 py-3">
                    <p className={`text-sm font-medium ${theme === "dark" ? "text-white" : "text-[#1A1B2E]"}`}>{r.user_name}</p>
                    <p className="text-xs text-[#A7A7C7]">{r.user_email}</p>
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => navigate(`/movie/${r.movie_id}`)} className="text-sm text-primary hover:underline text-left">
                      {r.movie_title}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                      <span className={`text-sm font-medium ${theme === "dark" ? "text-white" : "text-[#1A1B2E]"}`}>{r.rating}/5</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <p className={`text-sm max-w-xs truncate ${theme === "dark" ? "text-[#A7A7C7]" : "text-[#5B5D78]"}`}>
                      {r.comment || <span className="italic text-[#A7A7C7]">—</span>}
                    </p>
                  </td>
                  <td className={`px-4 py-3 text-xs ${theme === "dark" ? "text-[#A7A7C7]" : "text-[#5B5D78]"}`}>
                    {r.created_at ? new Date(r.created_at).toLocaleDateString() : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => handleDelete(r.id)} disabled={actionLoading === r.id}
                      className={`p-2 rounded-lg transition-colors ${theme === "dark" ? "hover:bg-red-500/20 text-[#A7A7C7] hover:text-red-400" : "hover:bg-red-50 text-[#A7A7C7] hover:text-red-600"}`}
                      title={language === "bg" ? "Изтрий" : "Delete"}>
                      {actionLoading === r.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {reviews.length === 0 && (
          <p className={`text-center py-8 text-sm ${theme === "dark" ? "text-[#A7A7C7]" : "text-[#5B5D78]"}`}>
            {language === "bg" ? "Няма ревюта" : "No reviews"}
          </p>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className={`text-xs ${theme === "dark" ? "text-[#5B5D78]" : "text-[#A7A7C7]"}`}>
            {language === "bg" ? `Стр. ${page + 1} от ${totalPages} (${total} ревюта)` : `Page ${page + 1} of ${totalPages} (${total} reviews)`}
          </p>
          <div className="flex gap-2">
            <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
              className={`p-2 rounded-lg border ${theme === "dark" ? "border-[#2A2A4A] text-[#A7A7C7] hover:bg-[#2A2A4A] disabled:opacity-30" : "border-[#E2E4F0] text-[#A7A7C7] hover:bg-[#F8F9FC] disabled:opacity-30"}`}>
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
              className={`p-2 rounded-lg border ${theme === "dark" ? "border-[#2A2A4A] text-[#A7A7C7] hover:bg-[#2A2A4A] disabled:opacity-30" : "border-[#E2E4F0] text-[#A7A7C7] hover:bg-[#F8F9FC] disabled:opacity-30"}`}>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// ACTIVITY TAB — full audit log
// ============================================================================

function ActivityTab() {
  const { theme, language } = useApp();
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 25;

  useEffect(() => {
    api.get("/admin/audit-log", { params: { limit: 200 } })
      .then(r => { setEvents(r.data.events || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-[#A7A7C7]" /></div>;

  if (events.length === 0) {
    return (
      <div className={`text-center py-16 ${theme === "dark" ? "text-[#A7A7C7]" : "text-[#5B5D78]"}`}>
        <Activity className="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p className="text-lg font-medium">{language === "bg" ? "Няма записи" : "No activity yet"}</p>
        <p className="text-sm mt-1">{language === "bg" ? "Действията ще се появят тук" : "Admin actions will appear here"}</p>
      </div>
    );
  }

  const totalPages = Math.ceil(events.length / PAGE_SIZE);
  const paginated = events.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <div className="space-y-4">
      <div className={`rounded-xl overflow-hidden border ${theme === "dark" ? "border-[#2A2A4A]/50" : "border-[#E2E4F0]"}`}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className={theme === "dark" ? "bg-[#2A2A4A]/80" : "bg-[#F8F9FC]"}>
                <th className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider ${theme === "dark" ? "text-[#A7A7C7]" : "text-[#5B5D78]"}`}>{language === "bg" ? "Действие" : "Action"}</th>
                <th className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider ${theme === "dark" ? "text-[#A7A7C7]" : "text-[#5B5D78]"}`}>{language === "bg" ? "Детайли" : "Details"}</th>
                <th className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider ${theme === "dark" ? "text-[#A7A7C7]" : "text-[#5B5D78]"}`}>{language === "bg" ? "От" : "By"}</th>
                <th className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider ${theme === "dark" ? "text-[#A7A7C7]" : "text-[#5B5D78]"}`}>{language === "bg" ? "Кога" : "When"}</th>
                <th className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider ${theme === "dark" ? "text-[#A7A7C7]" : "text-[#5B5D78]"}`}>IP</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${theme === "dark" ? "divide-gray-700/50" : "divide-gray-100"}`}>
              {paginated.map((ev, i) => <AuditRow key={page * PAGE_SIZE + i} event={ev} />)}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className={`text-xs ${theme === "dark" ? "text-[#5B5D78]" : "text-[#A7A7C7]"}`}>
            {language === "bg"
              ? `Стр. ${page + 1} от ${totalPages} (${events.length} записа)`
              : `Page ${page + 1} of ${totalPages} (${events.length} events)`}
          </p>
          <div className="flex gap-2">
            <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
              className={`p-2 rounded-lg border ${theme === "dark" ? "border-[#2A2A4A] text-[#A7A7C7] hover:bg-[#2A2A4A] disabled:opacity-30" : "border-[#E2E4F0] text-[#A7A7C7] hover:bg-[#F8F9FC] disabled:opacity-30"}`}>
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
              className={`p-2 rounded-lg border ${theme === "dark" ? "border-[#2A2A4A] text-[#A7A7C7] hover:bg-[#2A2A4A] disabled:opacity-30" : "border-[#E2E4F0] text-[#A7A7C7] hover:bg-[#F8F9FC] disabled:opacity-30"}`}>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// MAIN ADMIN PAGE
// ============================================================================

export default function Admin() {
  const { theme, language, user, isAuthenticated } = useApp();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>("dashboard");
  const [stats, setStats] = useState<Stats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  // Guard: redirect non-admins
  useEffect(() => {
    if (!isAuthenticated || !user?.is_admin) {
      navigate("/", { replace: true });
    }
  }, [isAuthenticated, user, navigate]);

  // Fetch stats for dashboard
  useEffect(() => {
    if (activeTab === "dashboard") {
      setStatsLoading(true);
      api.get("/admin/stats")
        .then(r => { setStats(r.data); setStatsLoading(false); })
        .catch(() => setStatsLoading(false));
    }
  }, [activeTab]);

  if (!user?.is_admin) return null;

  const tabs: { id: Tab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: "dashboard", label: language === "bg" ? "Табло" : "Dashboard", icon: BarChart3 },
    { id: "users", label: language === "bg" ? "Потребители" : "Users", icon: Users },
    { id: "movies", label: language === "bg" ? "Филми" : "Movies", icon: Film },
    { id: "reviews", label: language === "bg" ? "Ревюта" : "Reviews", icon: MessageSquare },
    { id: "activity", label: language === "bg" ? "Дневник" : "Activity", icon: Activity },
  ];

  return (
    <div className={`min-h-screen ${theme === "dark" ? "bg-[#0B0B12]" : "bg-[#F8F9FC]"}`}>
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="p-2.5 rounded-xl bg-amber-500/20">
            <ShieldCheck className="w-7 h-7 text-amber-400" />
          </div>
          <div>
            <h1 className={`text-2xl font-bold ${theme === "dark" ? "text-white" : "text-[#1A1B2E]"}`}>
              {language === "bg" ? "Администрация" : "Admin Panel"}
            </h1>
            <p className={`text-sm ${theme === "dark" ? "text-[#A7A7C7]" : "text-[#5B5D78]"}`}>
              {language === "bg" ? "Управление на приложението" : "Manage your application"}
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className={`flex gap-1 p-1 rounded-xl mb-8 overflow-x-auto ${theme === "dark" ? "bg-[#1A1A33]" : "bg-[#F3F4FF]"}`}>
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? "bg-primary text-white shadow-sm"
                  : theme === "dark" ? "text-[#A7A7C7] hover:text-[#EDEDF7] hover:bg-[#2A2A4A]" : "text-[#5B5D78] hover:text-[#1A1B2E] hover:bg-white"
              }`}>
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {activeTab === "dashboard" && <DashboardTab stats={stats} loading={statsLoading} />}
        {activeTab === "users" && <UsersTab />}
        {activeTab === "movies" && <MoviesTab />}
        {activeTab === "reviews" && <ReviewsTab />}
        {activeTab === "activity" && <ActivityTab />}
      </div>
    </div>
  );
}