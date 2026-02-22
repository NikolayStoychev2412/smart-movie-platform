import { useState, useEffect } from "react";
import { Send, Loader2 } from "lucide-react";
import api from "../../../api/client";
import type { Review, ApiError } from "../../../types";
import StarRating from "../components/StarRating";
import SentimentBadge from "../components/SentimentBadge";
import type { SentimentAnalysis } from "../types";

export default function ReviewForm({ movieId, theme, language, onReviewAdded }: {
  movieId: number;
  theme: string;
  language: string;
  onReviewAdded: (review: Review) => void;
}) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [sentiment, setSentiment] = useState<SentimentAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Analyze sentiment when comment changes (debounced)
  useEffect(() => {
    if (comment.trim().length < 30) {
      setSentiment(null);
      return;
    }

    const abortController = new AbortController();

    const timeout = setTimeout(async () => {
      setAnalyzing(true);
      try {
        const response = await api.post('/ai/analyze-review', { text: comment }, { signal: abortController.signal });
        if (!abortController.signal.aborted) {
          setSentiment(response.data);
        }
      } catch {
        if (!abortController.signal.aborted) {
          setSentiment(null);
        }
      } finally {
        if (!abortController.signal.aborted) {
          setAnalyzing(false);
        }
      }
    }, 2500);

    return () => {
      clearTimeout(timeout);
      abortController.abort();
    };
  }, [comment]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) {
      setError(language === 'bg' ? 'Моля, изберете рейтинг' : 'Please select a rating');
      return;
    }
    if (comment.trim().length < 10) {
      setError(language === 'bg' ? 'Моля, напишете поне 10 символа' : 'Please write at least 10 characters');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const response = await api.post(`/reviews/movies/${movieId}`, {
        rating,
        comment: comment.trim() || null
      });

      onReviewAdded(response.data);
      setRating(0);
      setComment('');
      setSentiment(null);
    } catch (err) {
      if ((err as ApiError).response?.status === 400) {
        setError(language === 'bg' ? 'Вече сте оценили този филм' : 'You have already reviewed this movie');
      } else {
        setError(language === 'bg' ? 'Грешка при изпращане' : 'Failed to submit review');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={`p-5 rounded-lg ${theme === 'dark' ? 'bg-surface-2' : 'bg-white border'}`}>
      <h3 className={`font-semibold mb-4 text-text`}>
        {language === 'bg' ? 'Напишете ревю' : 'Write a Review'}
      </h3>

      {/* Rating */}
      <div className="mb-4">
        <label className={`block text-sm mb-2 text-muted`}>
          {language === 'bg' ? 'Вашата оценка' : 'Your Rating'}
        </label>
        <StarRating rating={rating} onRate={setRating} size={32} />
      </div>

      {/* Comment */}
      <div className="mb-4">
        <label className={`block text-sm mb-2 text-muted`}>
          {language === 'bg' ? 'Коментар (задължителен, мин. 10 символа)' : 'Comment (required, min. 10 characters)'}
        </label>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={4}
          maxLength={2000}
          placeholder={language === 'bg' ? 'Споделете вашето мнение...' : 'Share your thoughts...'}
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

      {/* AI Sentiment Analysis */}
      {(analyzing || sentiment) && (
        <div className={`mb-4 p-4 rounded-lg border ${
          theme === 'dark' ? 'bg-border/50 border-muted' : 'bg-surface-2 border-border'
        }`}>
          <div className="flex items-center gap-2 mb-2">
            <span className={`text-xs font-medium uppercase tracking-wide text-primary`}>
              {language === 'bg' ? 'AI Анализ на тона' : 'AI Tone Analysis'}
            </span>
          </div>

          {analyzing ? (
            <div className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
              <span className={`text-sm text-muted`}>
                {language === 'bg' ? 'Анализиране на вашето ревю...' : 'Analyzing your review...'}
              </span>
            </div>
          ) : sentiment && (
            <div className="flex items-center justify-between flex-wrap gap-3">
              <SentimentBadge sentiment={sentiment.sentiment} confidence={sentiment.confidence} size="large" language={language} />
              <span className={`text-xs text-muted`}>
                {language === 'bg'
                  ? 'AI открива тона на вашето ревю'
                  : 'AI detects the tone of your review'}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Error */}
      {error && (
        <p className="text-red-500 text-sm mb-4">{error}</p>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={submitting || rating === 0 || comment.trim().length < 10}
        className={`flex items-center justify-center gap-2 w-full py-3 rounded-lg font-medium transition-colors ${
          rating === 0 || comment.trim().length < 10
            ? 'bg-gray-600 text-muted cursor-not-allowed'
            : 'bg-primary text-white hover:bg-primary/90'
        }`}
      >
        {submitting ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <>
            <Send className="w-5 h-5" />
            {language === 'bg' ? 'Изпрати' : 'Submit Review'}
          </>
        )}
      </button>
    </form>
  );
}
