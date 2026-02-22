import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../../../api/client";
import type { Review } from "../../../types";
import {
  Film, Star, Edit3, Trash2, Calendar, Loader2, MessageSquare, Compass,
} from "lucide-react";

export default function MyReviewsSection({
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
      await api.put(`/reviews/${reviewId}`, { rating: editRating, comment: editComment });
      setEditingId(null);
      fetchReviews();
    } catch {
      // Failed to update review
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
    } catch {
      // Failed to delete review
    } finally {
      setDeleting(null);
    }
  };

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString(language === "bg" ? "bg-BG" : "en-US", {
      year: "numeric", month: "short", day: "numeric",
    });

  if (loading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className={`animate-pulse rounded-xl p-4 flex gap-4 ${theme === "dark" ? "bg-surface-2/50" : "bg-gray-100"}`}>
            <div className={`w-16 h-24 rounded-lg ${theme === "dark" ? "bg-border" : "bg-gray-200"}`} />
            <div className="flex-1 space-y-2">
              <div className={`h-4 rounded ${theme === "dark" ? "bg-border" : "bg-gray-200"} w-1/3`} />
              <div className={`h-3 rounded ${theme === "dark" ? "bg-border" : "bg-gray-200"} w-1/4`} />
              <div className={`h-3 rounded ${theme === "dark" ? "bg-border" : "bg-gray-200"} w-full`} />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (reviews.length === 0) {
    return (
      <div className={`text-center py-12 rounded-xl ${theme === "dark" ? "bg-surface-2/50" : "bg-surface-2"}`}>
        <MessageSquare className={`w-12 h-12 mx-auto mb-3 text-muted`} />
        <p className={`text-sm mb-4 text-muted`}>
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
            className={`rounded-xl p-4 ${theme === "dark" ? "bg-surface-2/80 border border-border" : "bg-white border border-border shadow-sm"}`}
          >
            <div className="flex gap-4">
              {movie && (
                <div onClick={() => navigate(`/movie/${movie.id}`)} className="flex-shrink-0 cursor-pointer group">
                  {posterUrl ? (
                    <img src={posterUrl} alt={title} className="w-16 h-24 rounded-lg object-cover group-hover:ring-2 ring-primary transition" loading="lazy" />
                  ) : (
                    <div className={`w-16 h-24 rounded-lg flex items-center justify-center ${theme === "dark" ? "bg-border" : "bg-gray-200"}`}>
                      <Film className="w-6 h-6 text-muted" />
                    </div>
                  )}
                </div>
              )}

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <h4
                      onClick={() => movie && navigate(`/movie/${movie.id}`)}
                      className={`font-semibold cursor-pointer hover:text-primary transition text-text`}
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
                                : theme === "dark" ? "text-[#2A2A4A]" : "text-gray-300"
                            }`}
                          />
                        ))}
                      </div>
                      <span className={`text-xs text-muted`}>
                        {(review.rating || 0).toFixed(1)}/5
                      </span>
                    </div>
                  </div>

                  {!isEditing && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleEdit(review)}
                        className={`p-1.5 rounded-lg transition ${theme === "dark" ? "hover:bg-border text-muted hover:text-white" : "hover:bg-gray-100 text-muted hover:text-text"}`}
                        title={language === "bg" ? "Редактирай" : "Edit"}
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(review.id)}
                        disabled={deleting === review.id}
                        className={`p-1.5 rounded-lg transition ${theme === "dark" ? "hover:bg-red-500/20 text-muted hover:text-red-400" : "hover:bg-red-50 text-muted hover:text-red-500"}`}
                        title={language === "bg" ? "Изтрий" : "Delete"}
                      >
                        {deleting === review.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                      </button>
                    </div>
                  )}
                </div>

                {isEditing ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm text-muted`}>
                        {language === "bg" ? "Оценка:" : "Rating:"}
                      </span>
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button key={star} onClick={() => setEditRating(star)} className="p-0.5">
                            <Star className={`w-5 h-5 transition ${
                              star <= editRating
                                ? "text-yellow-400 fill-yellow-400"
                                : theme === "dark" ? "text-[#2A2A4A] hover:text-yellow-400/50" : "text-gray-300 hover:text-yellow-400/50"
                            }`} />
                          </button>
                        ))}
                      </div>
                    </div>
                    <textarea
                      value={editComment}
                      onChange={(e) => setEditComment(e.target.value)}
                      rows={3}
                      className={`w-full px-3 py-2 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary ${
                        theme === "dark" ? "bg-border border-border text-white" : "bg-bg border-border text-text"
                      }`}
                      placeholder={language === "bg" ? "Напиши ревю (мин. 10 символа)" : "Write a review (min 10 characters)"}
                    />
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
                        className={`px-4 py-1.5 text-sm font-medium rounded-lg ${theme === "dark" ? "bg-border text-white hover:bg-[#3A3A5A]" : "bg-gray-100 text-text hover:bg-gray-200"}`}
                      >
                        {language === "bg" ? "Отказ" : "Cancel"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className={`text-sm line-clamp-3 text-muted`}>
                      {review.comment}
                    </p>
                    {review.created_at && (
                      <div className={`flex items-center gap-1 mt-2 text-xs text-muted`}>
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
