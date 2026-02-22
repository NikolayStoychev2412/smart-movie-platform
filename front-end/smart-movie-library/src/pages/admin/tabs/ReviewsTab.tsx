import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../../../context/AppContext";
import api from "../../../api/client";
import {
  Search, ChevronLeft, ChevronRight, Trash2, Star, Loader2, X,
} from "lucide-react";
import ConfirmDialog from "../components/ConfirmDialog";
import { thCls, rowHover, theadRow, tableBox, pageBtn, mutedText, headText } from "../constants";
import type { ApiError, ReviewItem, DialogState } from "../types";

export default function ReviewsTab() {
  const { theme, language } = useApp();
  const navigate = useNavigate();
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [dialog, setDialog] = useState<DialogState>({ open: false, message: "", onConfirm: () => {} });
  const PAGE_SIZE = 20;

  const openDialog = (message: string, onConfirm: () => void) =>
    setDialog({ open: true, message, onConfirm });
  const closeDialog = () => setDialog(d => ({ ...d, open: false }));

  const fetchReviews = useCallback((pg: number, q: string) => {
    setLoading(true);
    api.get("/admin/reviews", { params: { search: q, skip: pg * PAGE_SIZE, limit: PAGE_SIZE } })
      .then(r => { setReviews(r.data.reviews); setTotal(r.data.total); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { fetchReviews(page, search); }, [page, search, fetchReviews]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput.trim());
    setPage(0);
  };

  const handleDelete = (reviewId: number) => {
    openDialog(
      language === "bg" ? "Изтрий това ревю?" : "Delete this review?",
      async () => {
        closeDialog();
        setActionLoading(reviewId);
        try {
          await api.delete(`/admin/reviews/${reviewId}`);
          setReviews(prev => prev.filter(r => r.id !== reviewId));
          setTotal(t => t - 1);
        } catch (err) {
          setErrorMsg((err as ApiError).response?.data?.detail || "Failed to delete review");
        }
        setActionLoading(null);
      }
    );
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  if (loading && reviews.length === 0) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-muted" /></div>;

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
              placeholder={language === "bg" ? "Търси по потребител или филм..." : "Search by user or movie..."}
              className={`w-full pl-10 pr-4 py-2.5 rounded-lg border ${theme === "dark" ? "bg-border border-border text-white placeholder:text-muted" : "bg-white border-border text-text placeholder:text-muted"} focus:outline-none focus:ring-2 focus:ring-primary`}
            />
          </div>
          <button type="submit" className="px-4 py-2.5 bg-primary text-white rounded-lg font-medium hover:brightness-110 transition">
            {language === "bg" ? "Търси" : "Search"}
          </button>
          {search && (
            <button type="button" onClick={() => { setSearchInput(""); setSearch(""); setPage(0); }}
              className={`p-2.5 rounded-lg border ${theme === "dark" ? "border-border text-muted hover:bg-border" : "border-border text-muted hover:bg-bg"}`}>
              <X className="w-5 h-5" />
            </button>
          )}
        </form>

        <div className={tableBox(theme)}>
          <div className="overflow-auto max-h-[70vh]">
            <table className="w-full">
              <thead className="sticky top-0 z-10">
                <tr className={theadRow(theme)}>
                  <th className={thCls(theme)}>{language === "bg" ? "Потребител" : "User"}</th>
                  <th className={thCls(theme)}>{language === "bg" ? "Филм" : "Movie"}</th>
                  <th className={thCls(theme)}>{language === "bg" ? "Оценка" : "Rating"}</th>
                  <th className={thCls(theme)}>{language === "bg" ? "Коментар" : "Comment"}</th>
                  <th className={thCls(theme)}>{language === "bg" ? "Дата" : "Date"}</th>
                  <th className={`px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider ${mutedText(theme)}`}></th>
                </tr>
              </thead>
              <tbody className={`divide-y ${theme === "dark" ? "divide-gray-700/50" : "divide-gray-100"}`}>
                {reviews.map(r => (
                  <tr key={r.id} className={rowHover(theme)}>
                    <td className="px-4 py-3">
                      <p className={`text-sm font-medium ${headText(theme)}`}>{r.user_name}</p>
                      <p className="text-xs text-muted">{r.user_email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => navigate(`/movie/${r.movie_id}`)} className="text-sm text-primary hover:underline text-left">
                        {r.movie_title}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                        <span className={`text-sm font-medium ${headText(theme)}`}>{r.rating}/5</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className={`text-sm max-w-xs truncate ${mutedText(theme)}`}>
                        {r.comment || <span className="italic text-muted">—</span>}
                      </p>
                    </td>
                    <td className={`px-4 py-3 text-xs ${mutedText(theme)}`}>
                      {r.created_at ? new Date(r.created_at).toLocaleDateString() : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => handleDelete(r.id)} disabled={actionLoading === r.id}
                        className={`p-2 rounded-lg transition-colors ${theme === "dark" ? "hover:bg-red-500/20 text-muted hover:text-red-400" : "hover:bg-red-50 text-muted hover:text-red-600"}`}
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
            <p className={`text-center py-8 text-sm ${mutedText(theme)}`}>
              {language === "bg" ? "Няма ревюта" : "No reviews"}
            </p>
          )}
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className={`text-xs text-muted`}>
              {language === "bg"
                ? `Стр. ${page + 1} от ${totalPages} (${total} ревюта)`
                : `Page ${page + 1} of ${totalPages} (${total} reviews)`}
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
