import { useState, useEffect, useCallback, Fragment } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../../../context/AppContext";
import api from "../../../api/client";
import {
  Search, ChevronLeft, ChevronRight, Trash2,
  Loader2, X, Eye, Pencil, Check,
} from "lucide-react";
import ConfirmDialog from "../components/ConfirmDialog";
import { thCls, tdMuted, rowHover, theadRow, tableBox, pageBtn, mutedText, headText } from "../constants";
import type { ApiError, MovieItem, MovieEditForm, DialogState } from "../types";

export default function MoviesTab() {
  const { theme, language, t } = useApp();
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
  const [errorMsg, setErrorMsg] = useState("");
  const [dialog, setDialog] = useState<DialogState>({ open: false, message: "", onConfirm: () => {} });
  const PAGE_SIZE = 20;

  const openDialog = (message: string, onConfirm: () => void) =>
    setDialog({ open: true, message, onConfirm });
  const closeDialog = () => setDialog(d => ({ ...d, open: false }));

  const fetchMovies = useCallback((pg: number, q: string) => {
    setLoading(true);
    api.get("/admin/movies", { params: { search: q, skip: pg * PAGE_SIZE, limit: PAGE_SIZE } })
      .then(r => {
        setMovies(r.data.movies);
        setTotal(r.data.total);
        setLoading(false);
      })
      .catch(() => {
        api.get("/movies/", { params: { limit: 500 } })
          .then(r => {
            const all: MovieItem[] = r.data;
            const filtered = q
              ? all.filter(m =>
                  (m.title || "").toLowerCase().includes(q.toLowerCase()) ||
                  (m.title_bg || "").toLowerCase().includes(q.toLowerCase()))
              : all;
            setTotal(filtered.length);
            setMovies(filtered.slice(pg * PAGE_SIZE, (pg + 1) * PAGE_SIZE));
            setLoading(false);
          })
          .catch(() => setLoading(false));
      });
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { fetchMovies(page, search); }, [page, search, fetchMovies]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput.trim());
    setPage(0);
  };

  const handleDelete = (movieId: number, title: string) => {
    openDialog(
      `${t.deleteMoviePrefix} "${title}" ${t.andAllRelatedData}`,
      async () => {
        closeDialog();
        setActionLoading(movieId);
        try {
          await api.delete(`/admin/movies/${movieId}`);
          setMovies(prev => prev.filter(m => m.id !== movieId));
          setTotal(t => t - 1);
        } catch (err) {
          setErrorMsg((err as ApiError).response?.data?.detail || "Failed to delete movie");
        }
        setActionLoading(null);
      }
    );
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
      const payload: Record<string, string | number | null | undefined> = { ...editForm };
      if (payload.runtime != null && payload.runtime !== "") {
        const parsed = parseInt(String(payload.runtime), 10);
        payload.runtime = isNaN(parsed) ? null : parsed;
      } else {
        payload.runtime = null;
      }

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
    } catch (err) {
      setErrorMsg((err as ApiError).response?.data?.detail || "Failed to save");
    }
    setActionLoading(null);
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const inputCls = `w-full px-2 py-1 rounded text-sm border ${theme === "dark" ? "bg-gray-700 border-gray-600 text-white placeholder:text-muted" : "bg-white border-border placeholder:text-muted"}`;

  if (loading && movies.length === 0) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-muted" /></div>;

  return (
    <>
      <ConfirmDialog open={dialog.open} message={dialog.message} onConfirm={dialog.onConfirm} onCancel={closeDialog} />
      <div className="space-y-4">
        {errorMsg && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400">
            <span className="text-sm flex-1">{errorMsg}</span>
            <button onClick={() => setErrorMsg("")}><X className="w-4 h-4" /></button>
          </div>
        )}

        {/* Search */}
        <form onSubmit={handleSearch} className="flex gap-2 max-w-lg">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
            <input type="text" value={searchInput} onChange={e => setSearchInput(e.target.value)}
              placeholder={t.searchMoviesPlaceholder}
              className={`w-full pl-10 pr-4 py-2.5 rounded-lg border ${theme === "dark" ? "bg-border border-border text-white placeholder:text-muted" : "bg-white border-border text-text placeholder:text-muted"} focus:outline-none focus:ring-2 focus:ring-primary`}
            />
          </div>
          <button type="submit" className="px-4 py-2.5 bg-primary text-white rounded-lg font-medium hover:brightness-110 transition">
            {t.search}
          </button>
          {search && (
            <button type="button" onClick={() => { setSearchInput(""); setSearch(""); setPage(0); }}
              className={`p-2.5 rounded-lg border ${theme === "dark" ? "border-border text-muted hover:bg-border" : "border-border text-muted hover:bg-bg"}`}>
              <X className="w-5 h-5" />
            </button>
          )}
        </form>

        {/* Table */}
        <div className={tableBox(theme)}>
          <div className="overflow-auto max-h-[70vh]">
            <table className="w-full">
              <thead className="sticky top-0 z-10">
                <tr className={theadRow(theme)}>
                  <th className={thCls(theme)}>ID</th>
                  <th className={thCls(theme)}>{t.movieCol}</th>
                  <th className={thCls(theme)}>{t.genreCol}</th>
                  <th className={thCls(theme)}>{t.ratingCol}</th>
                  <th className={thCls(theme)}>{t.yearCol}</th>
                  <th className={`px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider ${mutedText(theme)}`}>{t.actionsLabel}</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${theme === "dark" ? "divide-gray-700/50" : "divide-gray-100"}`}>
                {movies.map(m => (
                  <Fragment key={m.id}>
                    <tr className={rowHover(theme)}>
                      <td className={tdMuted(theme)}>{m.id}</td>
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
                              <p className={`text-sm font-medium truncate ${headText(theme)}`}>{m.title}</p>
                              {m.title_bg && <p className="text-xs text-muted truncate">{m.title_bg}</p>}
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
                          <span className={`text-sm ${mutedText(theme)}`}>{m.genre || "—"}</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {m.tmdb_rating ? (
                            <span className={`text-sm font-medium ${headText(theme)}`}>{m.tmdb_rating.toFixed(1)}</span>
                          ) : <span className="text-muted text-sm">—</span>}
                          {(m.review_count || 0) > 0 && (
                            <span className="text-xs text-muted">({m.review_count})</span>
                          )}
                        </div>
                      </td>
                      <td className={tdMuted(theme)}>{m.release_year || "—"}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          {editingId === m.id ? (
                            <>
                              <button onClick={() => saveEdit(m.id)} disabled={actionLoading === m.id}
                                className="p-2 rounded-lg hover:bg-green-500/20 text-green-400" title="Save">
                                {actionLoading === m.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                              </button>
                              <button onClick={() => setEditingId(null)} className="p-2 rounded-lg hover:bg-border/20 text-muted" title="Cancel">
                                <X className="w-4 h-4" />
                              </button>
                            </>
                          ) : (
                            <>
                              <button onClick={() => navigate(`/movie/${m.id}`)}
                                className={`p-2 rounded-lg transition-colors ${theme === "dark" ? "hover:bg-blue-500/20 text-muted hover:text-blue-400" : "hover:bg-blue-50 text-muted hover:text-blue-600"}`} title="View">
                                <Eye className="w-4 h-4" />
                              </button>
                              <button onClick={() => startEdit(m)}
                                className={`p-2 rounded-lg transition-colors ${theme === "dark" ? "hover:bg-yellow-500/20 text-muted hover:text-yellow-400" : "hover:bg-yellow-50 text-muted hover:text-yellow-600"}`} title="Edit">
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button onClick={() => handleDelete(m.id, m.title)} disabled={actionLoading === m.id}
                                className={`p-2 rounded-lg transition-colors ${theme === "dark" ? "hover:bg-red-500/20 text-muted hover:text-red-400" : "hover:bg-red-50 text-muted hover:text-red-600"}`} title="Delete">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                    {/* Expanded edit row — renders immediately below its movie row */}
                    {editingId === m.id && (
                      <tr className={theme === "dark" ? "bg-border/30" : "bg-blue-50/30"}>
                        <td colSpan={6} className="px-4 py-3">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                            <div>
                              <label className={`block text-xs font-medium mb-1 ${mutedText(theme)}`}>
                                {t.summaryEN}
                              </label>
                              <textarea value={editForm.summary} onChange={e => setEditForm(f => ({ ...f, summary: e.target.value }))}
                                rows={3} className={`${inputCls} resize-none`} placeholder="English summary..." />
                            </div>
                            <div>
                              <label className={`block text-xs font-medium mb-1 ${mutedText(theme)}`}>
                                {t.summaryBG}
                              </label>
                              <textarea value={editForm.summary_bg} onChange={e => setEditForm(f => ({ ...f, summary_bg: e.target.value }))}
                                rows={3} className={`${inputCls} resize-none`} placeholder={t.bgSummaryPlaceholder} />
                            </div>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <div>
                              <label className={`block text-xs font-medium mb-1 ${mutedText(theme)}`}>
                                {t.releaseDate}
                              </label>
                              <input type="date" value={editForm.release_date} onChange={e => setEditForm(f => ({ ...f, release_date: e.target.value }))}
                                className={inputCls} />
                            </div>
                            <div>
                              <label className={`block text-xs font-medium mb-1 ${mutedText(theme)}`}>
                                {t.runtime}
                              </label>
                              <input type="number" value={editForm.runtime} onChange={e => setEditForm(f => ({ ...f, runtime: e.target.value }))}
                                className={inputCls} placeholder="120" />
                            </div>
                            <div>
                              <label className={`block text-xs font-medium mb-1 ${mutedText(theme)}`}>Poster path</label>
                              <input value={editForm.poster_path} onChange={e => setEditForm(f => ({ ...f, poster_path: e.target.value }))}
                                className={inputCls} placeholder="/abc123.jpg" />
                            </div>
                            <div>
                              <label className={`block text-xs font-medium mb-1 ${mutedText(theme)}`}>Backdrop path</label>
                              <input value={editForm.backdrop_path} onChange={e => setEditForm(f => ({ ...f, backdrop_path: e.target.value }))}
                                className={inputCls} placeholder="/xyz789.jpg" />
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
          {movies.length === 0 && !loading && (
            <p className={`text-center py-8 text-sm ${mutedText(theme)}`}>
              {search ? t.noResults : t.noMovies}
            </p>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className={`text-xs text-muted`}>
              {`${t.pageLabel} ${page + 1} ${t.of} ${totalPages} (${total} ${t.moviesWord})`}
            </p>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} className={pageBtn(theme)}>
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1} className={pageBtn(theme)}>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
