import { useState } from "react";
import { X, Check, Loader2 } from "lucide-react";
import api from "../../../api/client";
import type { Review } from "../../../types";
import StarRating from "../components/StarRating";
import { translations } from "../../../i18n/translations";

export default function EditReviewForm({
  review,
  theme,
  language,
  onSave,
  onCancel
}: {
  review: Review;
  theme: string;
  language: string;
  onSave: (updatedReview: Review) => void;
  onCancel: () => void;
}) {
  const t = translations[language as "bg" | "en"];
  const [rating, setRating] = useState(review.rating || 0);
  const [comment, setComment] = useState(review.comment || '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) {
      setError(t.pleaseSelectRating);
      return;
    }
    if (comment.trim().length < 10) {
      setError(t.pleaseWriteMin10);
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const response = await api.put(`/reviews/${review.id}`, {
        rating,
        comment: comment.trim()
      });

      onSave({ ...review, ...response.data, rating, comment: comment.trim() });
    } catch {
      setError(t.saveFailed);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={`p-5 rounded-lg ${theme === 'dark' ? 'bg-surface-2' : 'bg-white border'}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className={`font-semibold text-text`}>
          {t.editReview}
        </h3>
        <button
          type="button"
          onClick={onCancel}
          className={`p-1 rounded ${theme === 'dark' ? 'hover:bg-white/10 text-muted' : 'hover:bg-gray-100 text-muted'}`}
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Rating */}
      <div className="mb-4">
        <label className={`block text-sm mb-2 text-muted`}>
          {t.yourRatingLabel}
        </label>
        <StarRating rating={rating} onRate={setRating} size={32} />
      </div>

      {/* Comment */}
      <div className="mb-4">
        <label className={`block text-sm mb-2 text-muted`}>
          {t.commentLabel}
        </label>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={4}
          maxLength={2000}
          className={`w-full px-4 py-3 rounded-lg border resize-none transition-colors ${
            theme === 'dark'
              ? 'bg-border border-border text-white placeholder-gray-500 focus:border-primary'
              : 'bg-bg border-border text-text placeholder-gray-400 focus:border-primary'
          } focus:outline-none focus:ring-1 focus:ring-primary`}
        />
        <div className="flex items-center justify-between mt-2">
          <span className={`text-xs text-muted`}>
            {comment.length}/2000
          </span>
        </div>
      </div>

      {/* Error */}
      {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

      {/* Buttons */}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={onCancel}
          className={`flex-1 py-3 rounded-lg font-medium transition-colors ${
            theme === 'dark'
              ? 'bg-border text-muted hover:bg-[#3A3A5A]'
              : 'bg-gray-100 text-muted hover:bg-gray-200'
          }`}
        >
          {t.cancel}
        </button>
        <button
          type="submit"
          disabled={submitting || rating === 0 || comment.trim().length < 10}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-medium transition-colors ${
            rating === 0 || comment.trim().length < 10
              ? 'bg-gray-600 text-muted cursor-not-allowed'
              : 'bg-primary text-white hover:bg-primary/90'
          }`}
        >
          {submitting ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <>
              <Check className="w-5 h-5" />
              {t.save}
            </>
          )}
        </button>
      </div>
    </form>
  );
}
