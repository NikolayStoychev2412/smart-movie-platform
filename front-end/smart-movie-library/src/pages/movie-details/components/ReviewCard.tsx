import { useState } from "react";
import { Star, ThumbsUp, ThumbsDown, Minus, User, Pencil, Trash2, Loader2 } from "lucide-react";
import type { ReviewWithSentiment } from "../types";

export default function ReviewCard({
  review,
  theme,
  language,
  currentUserId,
  onEdit,
  onDelete
}: {
  review: ReviewWithSentiment;
  theme: string;
  language: string;
  currentUserId?: number;
  onEdit?: (review: ReviewWithSentiment) => void;
  onDelete?: (reviewId: number) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const content = review.comment || review.content || review.review_text || "";
  const isLong = content.length > 300;
  const isOwnReview = currentUserId && review.user_id === currentUserId;

  const rating = review.rating || 0;
  const recommendation = rating >= 4 ? 'positive' : rating <= 2 ? 'negative' : 'neutral';

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString(language === 'bg' ? 'bg-BG' : 'en-US', {
        year: 'numeric', month: 'short', day: 'numeric'
      });
    } catch { return ''; }
  };

  const handleDelete = async () => {
    if (!window.confirm(language === 'bg' ? 'Сигурни ли сте, че искате да изтриете това ревю?' : 'Are you sure you want to delete this review?')) {
      return;
    }
    setDeleting(true);
    onDelete?.(review.id);
  };

  const borderColor = recommendation === 'positive' ? 'border-l-green-500' : recommendation === 'negative' ? 'border-l-red-500' : 'border-l-gray-500';

  return (
    <div className={`rounded-lg overflow-hidden border-l-[3px] ${borderColor} ${theme === "dark" ? "bg-surface-2" : "bg-white border border-l-[3px]"} ${isOwnReview ? 'ring-2 ring-primary/30' : ''}`}>
      {/* Recommendation Header */}
      <div className={`px-5 py-3 flex items-center gap-3 border-b border-border`}>
        {/* Thumb Icon */}
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
          recommendation === 'positive'
            ? 'bg-green-500/15'
            : recommendation === 'negative'
            ? 'bg-red-500/15'
            : 'bg-gray-500/15'
        }`}>
          {recommendation === 'positive' ? (
            <ThumbsUp className="w-5 h-5 text-green-500" />
          ) : recommendation === 'negative' ? (
            <ThumbsDown className="w-5 h-5 text-red-500" />
          ) : (
            <Minus className="w-5 h-5 text-gray-500" />
          )}
        </div>

        <div className="flex-1">
          <p className={`font-bold text-sm ${
            recommendation === 'positive'
              ? 'text-green-400'
              : recommendation === 'negative'
              ? 'text-red-400'
              : 'text-gray-400'
          }`}>
            {recommendation === 'positive'
              ? (language === 'bg' ? 'Препоръчва' : 'Recommended')
              : recommendation === 'negative'
              ? (language === 'bg' ? 'Не препоръчва' : 'Not Recommended')
              : (language === 'bg' ? 'Смесени чувства' : 'Mixed Feelings')}
          </p>
          <div className="flex items-center gap-2 mt-0.5">
            <div className="flex">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`w-3.5 h-3.5 ${
                    star <= rating
                      ? 'fill-yellow-400 text-yellow-400'
                      : theme === 'dark' ? 'text-gray-600' : 'text-gray-300'
                  }`}
                />
              ))}
            </div>
            <span className={`text-xs text-muted`}>
              {rating}/5
            </span>
          </div>
        </div>

        {/* Edit/Delete buttons for own review */}
        {isOwnReview && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => onEdit?.(review)}
              className={`p-2 rounded-lg transition-colors ${
                theme === 'dark' ? 'hover:bg-white/10 text-muted hover:text-white' : 'hover:bg-gray-100 text-muted hover:text-text'
              }`}
              title={language === 'bg' ? 'Редактирай' : 'Edit'}
            >
              <Pencil className="w-4 h-4" />
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className={`p-2 rounded-lg transition-colors ${
                theme === 'dark' ? 'hover:bg-red-500/20 text-muted hover:text-red-400' : 'hover:bg-red-50 text-muted hover:text-red-500'
              }`}
              title={language === 'bg' ? 'Изтрий' : 'Delete'}
            >
              {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            </button>
          </div>
        )}
      </div>

      {/* Review Content */}
      <div className="p-5">
        <div className="flex items-start gap-4">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
            theme === "dark" ? "bg-primary/20" : "bg-primary/10"
          }`}>
            <User className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <span className={`font-semibold text-text`}>
                {review.author || review.user_name || (language === "bg" ? "Потребител" : "User")}
                {isOwnReview && (
                  <span className="ml-2 text-xs font-normal text-primary">
                    ({language === 'bg' ? 'вашето ревю' : 'your review'})
                  </span>
                )}
              </span>
              {review.created_at && (
                <span className={`text-xs text-muted`}>
                  {formatDate(review.created_at)}
                </span>
              )}
            </div>

            {content && (
              <>
                <p className={`mt-3 leading-relaxed text-muted`}>
                  {isLong && !expanded ? `${content.slice(0, 300)}...` : content}
                </p>
                {isLong && (
                  <button
                    onClick={() => setExpanded(!expanded)}
                    className="text-primary font-medium mt-3 hover:underline"
                  >
                    {expanded ? (language === "bg" ? "По-малко" : "Less") : (language === "bg" ? "Повече" : "More")}
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
