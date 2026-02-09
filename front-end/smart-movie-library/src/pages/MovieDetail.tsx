import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { moviesApi } from "../api/movies";
import api from "../api/client";
import type { Movie, Review, WatchStatus } from "../types";
import {
  Star, Calendar, Clock, Bookmark, ChevronLeft, ChevronRight,
  User, Building2, Film, Play, ExternalLink, Check, Plus, X,
  Send, Loader2, ThumbsUp, ThumbsDown, Minus, MessageSquare, Heart,
  Pencil, Trash2
} from "lucide-react";

interface CastMember { id: number; name: string; character?: string; profile_path?: string; order?: number; }
interface CrewMember { id: number; name: string; job: string; department: string; profile_path?: string; }
interface Video { id: string; key: string; name: string; site: string; type: string; }
interface ProductionCompany { id: number; name: string; logo_path?: string; origin_country?: string; }

interface MovieDetail extends Movie {
  cast?: CastMember[]; crew?: CrewMember[]; videos?: Video[];
  trailer_youtube_key?: string; trailer_url?: string; trailer_embed_url?: string;
  main_actors?: string[]; budget_formatted?: string; revenue_formatted?: string;
  runtime_formatted?: string; poster_url_large?: string; backdrop_url_large?: string;
  homepage?: string; tmdb_rating?: number; production_companies?: ProductionCompany[];
  production_countries?: { iso_3166_1: string; name: string }[];
  imdb_id?: string; original_title?: string;
}

interface SentimentAnalysis {
  sentiment: 'positive' | 'negative' | 'neutral';
  confidence: number;
  summary: string;
  keywords: string[];
}

interface ReviewWithSentiment extends Review {
  sentiment?: SentimentAnalysis;
}

function CircularRating({ rating, size = 60 }: { rating: number; size?: number }) {
  const percentage = Math.round((rating > 10 ? rating / 10 : rating || 0) * 10);
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;
  const colors = percentage >= 70 ? { stroke: "#21d07a", bg: "#204529" } : percentage >= 50 ? { stroke: "#d2d531", bg: "#423d0f" } : { stroke: "#db2360", bg: "#571435" };
  
  return (
    <div className="relative flex items-center justify-center rounded-full flex-shrink-0" style={{ width: size, height: size, backgroundColor: "#081c22" }}>
      <svg className="transform -rotate-90" width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size/2} cy={size/2} r={radius} fill="#081c22" stroke={colors.bg} strokeWidth="4" />
        <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke={colors.stroke} strokeWidth="4" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} />
      </svg>
      <span className="absolute text-white font-bold" style={{ fontSize: size * 0.3 }}>{percentage}<sup style={{ fontSize: size * 0.15 }}>%</sup></span>
    </div>
  );
}

function StarRating({ rating, onRate, size = 24 }: { rating: number; onRate?: (r: number) => void; size?: number }) {
  const [hover, setHover] = useState(0);
  
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onRate?.(star)}
          onMouseEnter={() => setHover(star)}
          onMouseLeave={() => setHover(0)}
          className={`transition-colors ${onRate ? 'cursor-pointer' : 'cursor-default'}`}
          disabled={!onRate}
        >
          <Star
            size={size}
            className={`${
              star <= (hover || rating)
                ? 'fill-yellow-400 text-yellow-400'
                : 'text-[#A7A7C7]'
            }`}
          />
        </button>
      ))}
    </div>
  );
}

function SentimentBadge({ sentiment, confidence, size = 'small', language = 'en' }: { sentiment: string; confidence: number; size?: 'small' | 'large'; language?: string }) {
  const config = {
    positive: { icon: ThumbsUp, color: 'text-green-400 bg-green-500/20 border-green-500/30', label: 'Positive', labelBg: 'Позитивен' },
    negative: { icon: ThumbsDown, color: 'text-red-400 bg-red-500/20 border-red-500/30', label: 'Negative', labelBg: 'Негативен' },
    neutral: { icon: Minus, color: 'text-yellow-400 bg-yellow-500/20 border-yellow-500/30', label: 'Neutral', labelBg: 'Неутрален' }
  };

  const entry = config[sentiment as keyof typeof config] || config.neutral;
  const { icon: Icon, color } = entry;
  const displayLabel = language === 'bg' ? entry.labelBg : entry.label;

  if (size === 'small') {
    return (
      <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${color}`}>
        <Icon className="w-3 h-3" />
        {displayLabel} ({Math.round(confidence * 100)}%)
      </div>
    );
  }

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium border ${color}`}>
      <Icon className="w-4 h-4" />
      {displayLabel} ({Math.round(confidence * 100)}%)
    </div>
  );
}

function ReviewForm({ movieId, theme, language, onReviewAdded }: { 
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
    if (comment.length < 15) {
      setSentiment(null);
      return;
    }

    const timeout = setTimeout(async () => {
      setAnalyzing(true);
      try {
        const response = await api.post('/ai/analyze-review', { text: comment });
        setSentiment(response.data);
      } catch (err) {
        console.error('Sentiment analysis failed:', err);
        setSentiment(null);
      } finally {
        setAnalyzing(false);
      }
    }, 1200);

    return () => clearTimeout(timeout);
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
    } catch (err: any) {
      if (err.response?.status === 400) {
        setError(language === 'bg' ? 'Вече сте оценили този филм' : 'You have already reviewed this movie');
      } else {
        setError(language === 'bg' ? 'Грешка при изпращане' : 'Failed to submit review');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={`p-5 rounded-lg ${theme === 'dark' ? 'bg-[#1A1A33]' : 'bg-white border'}`}>
      <h3 className={`font-semibold mb-4 ${theme === 'dark' ? 'text-white' : 'text-[#1A1B2E]'}`}>
        {language === 'bg' ? 'Напишете ревю' : 'Write a Review'}
      </h3>
      
      {/* Rating */}
      <div className="mb-4">
        <label className={`block text-sm mb-2 ${theme === 'dark' ? 'text-[#A7A7C7]' : 'text-[#5B5D78]'}`}>
          {language === 'bg' ? 'Вашата оценка' : 'Your Rating'}
        </label>
        <StarRating rating={rating} onRate={setRating} size={32} />
      </div>
      
      {/* Comment */}
      <div className="mb-4">
        <label className={`block text-sm mb-2 ${theme === 'dark' ? 'text-[#A7A7C7]' : 'text-[#5B5D78]'}`}>
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
              ? 'bg-[#2A2A4A] border-[#2A2A4A] text-white placeholder-gray-500 focus:border-primary'
              : 'bg-[#F8F9FC] border-[#E2E4F0] text-[#1A1B2E] placeholder-gray-400 focus:border-primary'
          } focus:outline-none focus:ring-1 focus:ring-primary`}
        />
        <div className="flex items-center justify-between mt-2">
          <span className={`text-xs ${theme === 'dark' ? 'text-[#A7A7C7]' : 'text-[#A7A7C7]'}`}>
            {comment.length}/2000
          </span>
        </div>
      </div>

      {/* AI Sentiment Analysis - More prominent */}
      {(analyzing || sentiment) && (
        <div className={`mb-4 p-4 rounded-lg border ${
          theme === 'dark' ? 'bg-[#2A2A4A]/50 border-[#3A3A5A]' : 'bg-[#F3F4FF] border-[#E2E4F0]'
        }`}>
          <div className="flex items-center gap-2 mb-2">
            <span className={`text-xs font-medium uppercase tracking-wide ${theme === 'dark' ? 'text-primary' : 'text-primary'}`}>
              {language === 'bg' ? 'AI Анализ на тона' : 'AI Tone Analysis'}
            </span>
          </div>

          {analyzing ? (
            <div className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
              <span className={`text-sm ${theme === 'dark' ? 'text-[#A7A7C7]' : 'text-[#5B5D78]'}`}>
                {language === 'bg' ? 'Анализиране на вашето ревю...' : 'Analyzing your review...'}
              </span>
            </div>
          ) : sentiment && (
            <div className="flex items-center justify-between flex-wrap gap-3">
              <SentimentBadge sentiment={sentiment.sentiment} confidence={sentiment.confidence} size="large" language={language} />
              <span className={`text-xs ${theme === 'dark' ? 'text-[#A7A7C7]' : 'text-[#5B5D78]'}`}>
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
            ? 'bg-gray-600 text-[#A7A7C7] cursor-not-allowed'
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

function EditReviewForm({
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
  const [rating, setRating] = useState(review.rating || 0);
  const [comment, setComment] = useState(review.comment || '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      const response = await api.put(`/reviews/${review.id}`, {
        rating,
        comment: comment.trim()
      });

      onSave({ ...review, ...response.data, rating, comment: comment.trim() });
    } catch (err: any) {
      setError(language === 'bg' ? 'Грешка при запазване' : 'Failed to save changes');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={`p-5 rounded-lg ${theme === 'dark' ? 'bg-[#1A1A33]' : 'bg-white border'}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-[#1A1B2E]'}`}>
          {language === 'bg' ? 'Редактиране на ревю' : 'Edit Review'}
        </h3>
        <button
          type="button"
          onClick={onCancel}
          className={`p-1 rounded ${theme === 'dark' ? 'hover:bg-white/10 text-[#A7A7C7]' : 'hover:bg-gray-100 text-[#5B5D78]'}`}
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Rating */}
      <div className="mb-4">
        <label className={`block text-sm mb-2 ${theme === 'dark' ? 'text-[#A7A7C7]' : 'text-[#5B5D78]'}`}>
          {language === 'bg' ? 'Вашата оценка' : 'Your Rating'}
        </label>
        <StarRating rating={rating} onRate={setRating} size={32} />
      </div>

      {/* Comment */}
      <div className="mb-4">
        <label className={`block text-sm mb-2 ${theme === 'dark' ? 'text-[#A7A7C7]' : 'text-[#5B5D78]'}`}>
          {language === 'bg' ? 'Коментар' : 'Comment'}
        </label>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={4}
          maxLength={2000}
          className={`w-full px-4 py-3 rounded-lg border resize-none transition-colors ${
            theme === 'dark'
              ? 'bg-[#2A2A4A] border-[#2A2A4A] text-white placeholder-gray-500 focus:border-primary'
              : 'bg-[#F8F9FC] border-[#E2E4F0] text-[#1A1B2E] placeholder-gray-400 focus:border-primary'
          } focus:outline-none focus:ring-1 focus:ring-primary`}
        />
        <div className="flex items-center justify-between mt-2">
          <span className={`text-xs ${theme === 'dark' ? 'text-[#A7A7C7]' : 'text-[#A7A7C7]'}`}>
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
              ? 'bg-[#2A2A4A] text-[#A7A7C7] hover:bg-[#3A3A5A]'
              : 'bg-gray-100 text-[#5B5D78] hover:bg-gray-200'
          }`}
        >
          {language === 'bg' ? 'Отказ' : 'Cancel'}
        </button>
        <button
          type="submit"
          disabled={submitting || rating === 0 || comment.trim().length < 10}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-medium transition-colors ${
            rating === 0 || comment.trim().length < 10
              ? 'bg-gray-600 text-[#A7A7C7] cursor-not-allowed'
              : 'bg-primary text-white hover:bg-primary/90'
          }`}
        >
          {submitting ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <>
              <Check className="w-5 h-5" />
              {language === 'bg' ? 'Запази' : 'Save'}
            </>
          )}
        </button>
      </div>
    </form>
  );
}

function ReviewCard({
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

  // Determine recommendation based on rating (Steam-style)
  const rating = review.rating || 0;
  const recommendation = rating >= 4 ? 'positive' : rating <= 2 ? 'negative' : 'neutral';

  // Format date
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

  return (
    <div className={`rounded-lg overflow-hidden ${theme === "dark" ? "bg-[#1A1A33]" : "bg-white border"} ${isOwnReview ? 'ring-2 ring-primary/30' : ''}`}>
      {/* Steam-style Recommendation Header */}
      <div className={`px-5 py-3 flex items-center gap-3 ${
        recommendation === 'positive'
          ? 'bg-gradient-to-r from-green-500/20 to-green-500/5 border-b border-green-500/20'
          : recommendation === 'negative'
          ? 'bg-gradient-to-r from-red-500/20 to-red-500/5 border-b border-red-500/20'
          : 'bg-gradient-to-r from-gray-500/20 to-gray-500/5 border-b border-gray-500/20'
      }`}>
        {/* Large Thumb Icon */}
        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
          recommendation === 'positive'
            ? 'bg-green-500/30'
            : recommendation === 'negative'
            ? 'bg-red-500/30'
            : 'bg-gray-500/30'
        }`}>
          {recommendation === 'positive' ? (
            <ThumbsUp className="w-6 h-6 text-green-400" />
          ) : recommendation === 'negative' ? (
            <ThumbsDown className="w-6 h-6 text-red-400" />
          ) : (
            <Minus className="w-6 h-6 text-gray-400" />
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
            <span className={`text-xs ${theme === 'dark' ? 'text-[#A7A7C7]' : 'text-[#5B5D78]'}`}>
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
                theme === 'dark' ? 'hover:bg-white/10 text-[#A7A7C7] hover:text-white' : 'hover:bg-gray-100 text-[#5B5D78] hover:text-[#1A1B2E]'
              }`}
              title={language === 'bg' ? 'Редактирай' : 'Edit'}
            >
              <Pencil className="w-4 h-4" />
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className={`p-2 rounded-lg transition-colors ${
                theme === 'dark' ? 'hover:bg-red-500/20 text-[#A7A7C7] hover:text-red-400' : 'hover:bg-red-50 text-[#5B5D78] hover:text-red-500'
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
              <span className={`font-semibold ${theme === "dark" ? "text-white" : "text-[#1A1B2E]"}`}>
                {review.author || review.user_name || (language === "bg" ? "Потребител" : "User")}
                {isOwnReview && (
                  <span className="ml-2 text-xs font-normal text-primary">
                    ({language === 'bg' ? 'вашето ревю' : 'your review'})
                  </span>
                )}
              </span>
              {review.created_at && (
                <span className={`text-xs ${theme === "dark" ? "text-[#A7A7C7]" : "text-[#5B5D78]"}`}>
                  {formatDate(review.created_at)}
                </span>
              )}
            </div>

            {content && (
              <>
                <p className={`mt-3 leading-relaxed ${theme === "dark" ? "text-[#A7A7C7]" : "text-[#5B5D78]"}`}>
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

function CastCarousel({ cast, theme, language }: { cast: CastMember[]; theme: string; language: string }) {
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
  const scroll = (d: "left" | "right") => { scrollRef.current?.scrollBy({ left: d === "left" ? -320 : 320, behavior: "smooth" }); setTimeout(checkScroll, 350); };
  useEffect(() => { checkScroll(); const ref = scrollRef.current; ref?.addEventListener("scroll", checkScroll); return () => ref?.removeEventListener("scroll", checkScroll); }, [cast]);

  if (!cast?.length) return <div className={`text-center py-12 rounded-lg ${theme === "dark" ? "bg-[#1A1A33] text-[#A7A7C7]" : "bg-[#F3F4FF] text-[#A7A7C7]"}`}><User className="w-16 h-16 mx-auto mb-3 opacity-50" /><p>{language === "bg" ? "Няма информация" : "No cast info"}</p></div>;

  return (
    <div className="relative">
      {canScrollLeft && <button onClick={() => scroll("left")} className={`absolute left-0 top-1/2 -translate-y-1/2 z-20 p-2 rounded-full shadow-xl ${theme === "dark" ? "bg-[#2A2A4A] text-white" : "bg-white text-gray-800 border"}`} style={{marginTop:"-20px"}}><ChevronLeft className="w-6 h-6" /></button>}
      {canScrollRight && <button onClick={() => scroll("right")} className={`absolute right-0 top-1/2 -translate-y-1/2 z-20 p-2 rounded-full shadow-xl ${theme === "dark" ? "bg-[#2A2A4A] text-white" : "bg-white text-gray-800 border"}`} style={{marginTop:"-20px"}}><ChevronRight className="w-6 h-6" /></button>}
      <div ref={scrollRef} className="flex gap-4 pb-4" style={{ overflowX: "auto", scrollbarWidth: "none", scrollSnapType: "x mandatory" }}>
        {[...cast].sort((a,b) => (a.order??999)-(b.order??999)).slice(0,15).map((actor, i) => (
          <div key={actor.id||i} className={`flex-shrink-0 w-[150px] rounded-lg overflow-hidden shadow-lg hover:scale-105 transition-transform ${theme === "dark" ? "bg-[#1A1A33]" : "bg-white border"}`} style={{scrollSnapAlign:"start"}}>
            <div className="aspect-[2/3]">{actor.profile_path ? <img src={`https://image.tmdb.org/t/p/w185${actor.profile_path}`} alt={actor.name} className="w-full h-full object-cover" /> : <div className={`w-full h-full flex items-center justify-center ${theme === "dark" ? "bg-[#2A2A4A]" : "bg-gray-200"}`}><User className="w-16 h-16 text-[#A7A7C7]" /></div>}</div>
            <div className="p-3"><p className={`font-semibold text-sm truncate ${theme === "dark" ? "text-white" : "text-[#1A1B2E]"}`}>{actor.name}</p>{actor.character && <p className="text-xs mt-1 truncate text-[#A7A7C7]">{actor.character}</p>}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function FactsPanel({ movie, theme, language }: { movie: MovieDetail; theme: string; language: string }) {
  const director = movie.director || movie.crew?.find(c => c.job === "Director")?.name;
  const writers = movie.crew?.filter(c => ["Writer","Screenplay","Story"].includes(c.job) || c.department === "Writing").slice(0,2);
  const formatMoney = (n?: number) => !n ? null : n >= 1e9 ? `$${(n/1e9).toFixed(1)}B` : n >= 1e6 ? `$${(n/1e6).toFixed(0)}M` : `$${n.toLocaleString()}`;
  const facts: {label:string;value:string|null|undefined}[] = [];
  if (movie.status) facts.push({ label: language==="bg"?"Статус":"Status", value: movie.status });
  if (movie.original_language) facts.push({ label: language==="bg"?"Оригинален език":"Original Language", value: movie.original_language.toUpperCase() });
  const budgetStr = movie.budget_formatted || formatMoney(movie.budget); if (budgetStr) facts.push({ label: language==="bg"?"Бюджет":"Budget", value: budgetStr });
  const revenueStr = movie.revenue_formatted || formatMoney(movie.revenue); if (revenueStr) facts.push({ label: language==="bg"?"Приходи":"Revenue", value: revenueStr });
  if (!director && !writers?.length && !facts.length && !movie.production_companies?.length) return null;

  return (
    <div className={`rounded-lg p-5 ${theme === "dark" ? "bg-[#1A1A33]" : "bg-white border shadow-sm"}`}>
      <h3 className={`font-bold text-lg mb-4 ${theme === "dark" ? "text-white" : "text-[#1A1B2E]"}`}>{language === "bg" ? "Информация" : "Facts"}</h3>
      <div className="space-y-4">
        {director && <div><p className="text-sm font-medium text-[#A7A7C7]">{language==="bg"?"Режисьор":"Director"}</p><p className={`font-medium mt-0.5 ${theme==="dark"?"text-white":"text-[#1A1B2E]"}`}>{director}</p></div>}
        {writers?.length > 0 && <div><p className="text-sm font-medium text-[#A7A7C7]">{language==="bg"?"Сценарист":"Writer"}</p><p className={`font-medium mt-0.5 ${theme==="dark"?"text-white":"text-[#1A1B2E]"}`}>{writers.map(w=>w.name).join(", ")}</p></div>}
        {facts.map((f,i) => f.value && <div key={i}><p className="text-sm font-medium text-[#A7A7C7]">{f.label}</p><p className={`font-medium mt-0.5 ${theme==="dark"?"text-white":"text-[#1A1B2E]"}`}>{f.value}</p></div>)}
        {movie.production_companies?.length > 0 && <div><p className="text-sm font-medium mb-2 text-[#A7A7C7]">{language==="bg"?"Продукция":"Production"}</p><div className="space-y-2">{movie.production_companies.slice(0,3).map((c,i) => <div key={c.id||i} className="flex items-center gap-2">{c.logo_path ? <img src={`https://image.tmdb.org/t/p/w92${c.logo_path}`} alt={c.name} className={`h-6 w-auto object-contain ${theme==="dark"?"":"brightness-0"}`}/> : <Building2 className="w-5 h-5 text-[#A7A7C7]"/>}<span className={`text-sm ${theme==="dark"?"text-[#A7A7C7]":"text-[#5B5D78]"}`}>{c.name}</span></div>)}</div></div>}
        {movie.homepage && <a href={movie.homepage} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-primary hover:underline text-sm mt-4"><ExternalLink className="w-4 h-4"/>{language==="bg"?"Официален сайт":"Official Website"}</a>}
      </div>
    </div>
  );
}

function VideosSection({ movie, theme, language }: { movie: MovieDetail; theme: string; language: string }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [playingVideo, setPlayingVideo] = useState<string|null>(null);
  
  const videos = [...(movie.videos||[]).filter(v => v.site === "YouTube")];
  if (movie.trailer_youtube_key && !videos.find(v => v.key === movie.trailer_youtube_key)) videos.unshift({ id: "main", key: movie.trailer_youtube_key, name: language==="bg"?"Официален трейлър":"Official Trailer", site: "YouTube", type: "Trailer" });
  
  const checkScroll = () => { if (scrollRef.current) { const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current; setCanScrollLeft(scrollLeft > 5); setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 5); } };
  const scroll = (d: "left"|"right") => { scrollRef.current?.scrollBy({ left: d==="left" ? -400 : 400, behavior: "smooth" }); setTimeout(checkScroll, 350); };
  useEffect(() => { checkScroll(); const ref = scrollRef.current; ref?.addEventListener("scroll", checkScroll); return () => ref?.removeEventListener("scroll", checkScroll); }, [videos.length]);

  if (!videos.length) return null;

  return (
    <section>
      <h2 className={`text-2xl font-bold mb-5 ${theme==="dark"?"text-white":"text-[#1A1B2E]"}`}>{language==="bg"?"Видео":"Videos"} <span className="ml-2 text-base font-normal text-[#A7A7C7]">({videos.length})</span></h2>
      {playingVideo && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4" onClick={() => setPlayingVideo(null)}><button onClick={() => setPlayingVideo(null)} className="absolute top-4 right-4 p-2 text-white hover:text-[#A7A7C7]"><X className="w-8 h-8"/></button><div className="w-full max-w-5xl aspect-video" onClick={e => e.stopPropagation()}><iframe src={`https://www.youtube.com/embed/${playingVideo}?autoplay=1`} title="Video" className="w-full h-full rounded-lg" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen/></div></div>}
      <div className="relative">
        {canScrollLeft && <button onClick={() => scroll("left")} className={`absolute left-0 top-1/2 -translate-y-1/2 z-20 p-2 rounded-full shadow-xl ${theme==="dark"?"bg-[#2A2A4A] text-white":"bg-white text-gray-800 border"}`}><ChevronLeft className="w-6 h-6"/></button>}
        {canScrollRight && <button onClick={() => scroll("right")} className={`absolute right-0 top-1/2 -translate-y-1/2 z-20 p-2 rounded-full shadow-xl ${theme==="dark"?"bg-[#2A2A4A] text-white":"bg-white text-gray-800 border"}`}><ChevronRight className="w-6 h-6"/></button>}
        <div ref={scrollRef} className="flex gap-4 pb-4" style={{ overflowX: "auto", scrollbarWidth: "none", scrollSnapType: "x mandatory" }}>
          {videos.map(v => (
            <div key={v.id||v.key} className="flex-shrink-0 w-[320px] md:w-[400px] cursor-pointer group" style={{scrollSnapAlign:"start"}} onClick={() => setPlayingVideo(v.key)}>
              <div className="relative rounded-lg overflow-hidden shadow-lg">
                <img src={`https://img.youtube.com/vi/${v.key}/mqdefault.jpg`} alt={v.name} className="w-full aspect-video object-cover group-hover:scale-105 transition-transform" onError={e => (e.target as HTMLImageElement).src = `https://img.youtube.com/vi/${v.key}/hqdefault.jpg`}/>
                <div className="absolute inset-0 bg-black/30 group-hover:bg-black/50 flex items-center justify-center transition-colors"><div className="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg"><Play className="w-8 h-8 text-white ml-1" fill="currentColor"/></div></div>
                <div className="absolute top-2 left-2 px-2 py-1 rounded bg-black/70 text-white text-xs font-medium">{v.type}</div>
              </div>
              <p className={`mt-2 text-sm font-medium line-clamp-1 ${theme==="dark"?"text-[#A7A7C7]":"text-[#5B5D78]"}`}>{v.name}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function SimilarMoviesSidebar({ movies, theme, language }: { movies: Movie[]; theme: string; language: string }) {
  const navigate = useNavigate();

  if (!movies?.length) return null;

  return (
    <div className={`rounded-lg p-5 ${theme === "dark" ? "bg-[#1A1A33]" : "bg-white border shadow-sm"}`}>
      <h3 className={`font-bold text-lg mb-4 flex items-center gap-2 ${theme === "dark" ? "text-white" : "text-[#1A1B2E]"}`}>
        <Film className="w-5 h-5 text-primary" />
        {language === "bg" ? "Подобни филми" : "Similar Movies"}
      </h3>
      <div className="space-y-3">
        {movies.slice(0, 6).map((m, i) => {
          const t = language === "bg" ? m.title_bg || m.title : m.title;
          const p = m.poster_path ? `https://image.tmdb.org/t/p/w92${m.poster_path}` : m.poster_url;
          const rating = (m as any).tmdb_rating || m.average_rating || 0;
          const year = m.release_date ? new Date(m.release_date).getFullYear() : null;

          return (
            <div
              key={m.id || i}
              onClick={() => navigate(`/movie/${m.id}`)}
              className={`flex gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                theme === "dark" ? "hover:bg-[#2A2A4A]" : "hover:bg-[#F3F4FF]"
              }`}
            >
              {/* Poster */}
              <div className="w-12 h-18 flex-shrink-0 rounded overflow-hidden">
                {p ? (
                  <img src={p} alt={t} className="w-full h-full object-cover" />
                ) : (
                  <div className={`w-full h-full flex items-center justify-center ${theme === "dark" ? "bg-[#2A2A4A]" : "bg-gray-200"}`}>
                    <Film className="w-6 h-6 text-[#A7A7C7]" />
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className={`font-medium text-sm line-clamp-2 ${theme === "dark" ? "text-white" : "text-[#1A1B2E]"}`}>
                  {t}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  {year && (
                    <span className={`text-xs ${theme === "dark" ? "text-[#A7A7C7]" : "text-[#5B5D78]"}`}>
                      {year}
                    </span>
                  )}
                  {rating > 0 && (
                    <span className="flex items-center gap-0.5 text-xs text-yellow-500">
                      <Star className="w-3 h-3 fill-current" />
                      {rating > 10 ? (rating / 10).toFixed(1) : rating.toFixed(1)}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* View More Link */}
      {movies.length > 6 && (
        <p className={`text-xs text-center mt-4 ${theme === "dark" ? "text-[#A7A7C7]" : "text-[#5B5D78]"}`}>
          +{movies.length - 6} {language === "bg" ? "още" : "more"}
        </p>
      )}
    </div>
  );
}

export default function MovieDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { theme, language, isAuthenticated, user } = useApp();
  const [movie, setMovie] = useState<MovieDetail|null>(null);
  const [reviews, setReviews] = useState<ReviewWithSentiment[]>([]);
  const [similarMovies, setSimilarMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string|null>(null);
  const [watchlistStatus, setWatchlistStatus] = useState<WatchStatus|null>(null);
  const [watchlistLoading, setWatchlistLoading] = useState(false);
  const [showWatchlistMenu, setShowWatchlistMenu] = useState(false);
  const [userHasReviewed, setUserHasReviewed] = useState(false);
  const [userReviewId, setUserReviewId] = useState<number | null>(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [favoriteLoading, setFavoriteLoading] = useState(false);
  const [userRating, setUserRating] = useState(0);
  const [editingReview, setEditingReview] = useState<ReviewWithSentiment | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;
      setLoading(true); setError(null);
      try {
        const data = await moviesApi.getById(parseInt(id));
        setMovie(data as MovieDetail);
        try { 
          const r = await moviesApi.getReviews(parseInt(id)); 
          setReviews(Array.isArray(r) ? r : []); 
        } catch { setReviews([]); }
        try { const s = await moviesApi.getSimilar(parseInt(id)); setSimilarMovies(Array.isArray(s) ? s.map((x:any) => x.movie||x).slice(0,10) : []); } catch { setSimilarMovies([]); }
      } catch (e) { console.error(e); setError("Failed to load"); }
      finally { setLoading(false); }
    };
    fetchData();
  }, [id]); // Only refetch when movie ID changes, not on language change

  // Check if user has already reviewed and load their rating
  useEffect(() => {
    const checkUserReview = async () => {
      if (!isAuthenticated || !id) return;
      try {
        const response = await api.get('/reviews/my-reviews');
        const myReviews = response.data || [];
        const existingReview = myReviews.find((r: any) => r.movie_id === parseInt(id));
        if (existingReview) {
          setUserHasReviewed(true);
          setUserReviewId(existingReview.id);
          setUserRating(existingReview.rating || 0);
        } else {
          setUserHasReviewed(false);
          setUserReviewId(null);
          setUserRating(0);
        }
      } catch {
        setUserHasReviewed(false);
        setUserReviewId(null);
        setUserRating(0);
      }
    };
    checkUserReview();
  }, [id, isAuthenticated]);

  // Check favorite status
  useEffect(() => {
    const checkFavorite = async () => {
      if (!isAuthenticated || !id) return;
      try {
        const response = await api.get(`/favorites/${id}/status`);
        setIsFavorite(response.data.is_favorite);
      } catch {
        setIsFavorite(false);
      }
    };
    checkFavorite();
  }, [id, isAuthenticated]);

  useEffect(() => {
    const check = async () => {
      if (!id || !isAuthenticated) return;
      try { const r = await api.get(`/watchlist/${id}/status`); setWatchlistStatus(r.data.status); } catch { setWatchlistStatus(null); }
    };
    check();
  }, [id, isAuthenticated]);

  const addToWatchlist = async (status: WatchStatus) => {
    if (!id || !isAuthenticated) { navigate('/login', { state: { from: `/movie/${id}` } }); return; }
    setWatchlistLoading(true);
    try {
      if (watchlistStatus) await api.put(`/watchlist/${id}`, { status });
      else await api.post('/watchlist/', { movie_id: parseInt(id), status });
      setWatchlistStatus(status); setShowWatchlistMenu(false);
    } catch (e: any) {
      if (e.response?.status === 400) { try { await api.put(`/watchlist/${id}`, { status }); setWatchlistStatus(status); setShowWatchlistMenu(false); } catch {} }
    } finally { setWatchlistLoading(false); }
  };

  const removeFromWatchlist = async () => {
    if (!id) return;
    setWatchlistLoading(true);
    try { await api.delete(`/watchlist/${id}`); setWatchlistStatus(null); setShowWatchlistMenu(false); } catch {}
    finally { setWatchlistLoading(false); }
  };

  const handleReviewAdded = (newReview: Review) => {
    // Ensure the review has the user's name for display
    const reviewWithUser = {
      ...newReview,
      user_name: newReview.user_name || user?.name || (language === "bg" ? "Потребител" : "User"),
      created_at: newReview.created_at || new Date().toISOString()
    };
    setReviews(prev => [reviewWithUser, ...prev]);
    setUserHasReviewed(true);
    setUserReviewId(newReview.id);
    setUserRating(newReview.rating || 0);
    // Refresh movie to get updated rating
    if (id) {
      moviesApi.getById(parseInt(id)).then(data => setMovie(data as MovieDetail));
    }
  };

  const handleEditReview = (review: ReviewWithSentiment) => {
    setEditingReview(review);
  };

  const handleSaveEdit = (updatedReview: Review) => {
    setReviews(prev => prev.map(r => r.id === updatedReview.id ? { ...r, ...updatedReview } : r));
    setEditingReview(null);
    setUserRating(updatedReview.rating || 0);
    // Refresh movie to get updated rating
    if (id) {
      moviesApi.getById(parseInt(id)).then(data => setMovie(data as MovieDetail));
    }
  };

  const handleDeleteReview = async (reviewId: number) => {
    try {
      await api.delete(`/reviews/${reviewId}`);
      setReviews(prev => prev.filter(r => r.id !== reviewId));
      setUserHasReviewed(false);
      setUserReviewId(null);
      setUserRating(0);
      // Refresh movie to get updated rating
      if (id) {
        moviesApi.getById(parseInt(id)).then(data => setMovie(data as MovieDetail));
      }
    } catch (err) {
      console.error('Failed to delete review:', err);
    }
  };

  const toggleFavorite = async () => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: `/movie/${id}` } });
      return;
    }
    if (!id) return;
    
    setFavoriteLoading(true);
    try {
      if (isFavorite) {
        await api.delete(`/favorites/${id}`);
        setIsFavorite(false);
      } else {
        await api.post(`/favorites/${id}`);
        setIsFavorite(true);
      }
    } catch (err) {
      console.error('Failed to toggle favorite:', err);
    } finally {
      setFavoriteLoading(false);
    }
  };

  const getBtn = () => {
    if (!watchlistStatus) return { icon: <Plus className="w-5 h-5"/>, text: language==="bg"?"Добави":"Add to List", cls: "bg-[#121226]/80 text-[#A7A7C7] hover:text-[#EDEDF7]" };
    const map: Record<string, {icon: JSX.Element; text: string; cls: string}> = {
      completed: { icon: <Check className="w-5 h-5"/>, text: language==="bg"?"Изгледан":"Completed", cls: "bg-green-600 text-white" },
      watching: { icon: <Play className="w-5 h-5"/>, text: language==="bg"?"Гледам":"Watching", cls: "bg-yellow-600 text-white" },
      planned: { icon: <Bookmark className="w-5 h-5"/>, text: language==="bg"?"Планиран":"Planned", cls: "bg-blue-600 text-white" },
      dropped: { icon: <X className="w-5 h-5"/>, text: language==="bg"?"Отказан":"Dropped", cls: "bg-red-600 text-white" },
    };
    return map[watchlistStatus] || { icon: <Plus className="w-5 h-5"/>, text: "Add", cls: "bg-[#121226]/80 text-[#A7A7C7]" };
  };
  const btn = getBtn();

  if (loading) return <div className={`min-h-screen ${theme==="dark"?"bg-[#0B0B12]":"bg-[#F8F9FC]"}`}><div className="animate-pulse"><div className={`h-[500px] ${theme==="dark"?"bg-[#2A2A4A]":"bg-gray-300"}`}/></div></div>;
  if (error || !movie) return <div className={`min-h-screen flex items-center justify-center ${theme==="dark"?"bg-[#0B0B12]":"bg-[#F8F9FC]"}`}><div className="text-center"><Film className="w-20 h-20 mx-auto mb-4 text-[#A7A7C7]"/><p className="text-xl text-[#A7A7C7]">{error||"Not found"}</p><button onClick={() => navigate(-1)} className="mt-4 px-6 py-2 bg-primary text-white rounded-lg font-medium">{language==="bg"?"Назад":"Back"}</button></div></div>;

  const title = language==="bg" ? movie.title_bg||movie.title : movie.title;
  const summary = language==="bg" ? movie.summary_bg||movie.summary : movie.summary;
  const tagline = language==="bg" ? movie.tagline_bg : movie.tagline;
  const genre = language==="bg" ? movie.genre_bg||movie.genre : movie.genre;
  const backdropUrl = movie.backdrop_url_large || movie.backdrop_url || (movie.backdrop_path ? `https://image.tmdb.org/t/p/w1280${movie.backdrop_path}` : null);
  const posterUrl = movie.poster_url_large || movie.poster_url || (movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : null);
  const releaseYear = movie.release_year || (movie.release_date ? new Date(movie.release_date).getFullYear() : null);
  const runtimeDisplay = movie.runtime_formatted || (movie.runtime ? `${Math.floor(movie.runtime/60)}h ${movie.runtime%60}m` : null);
  const director = movie.director || movie.crew?.find(c => c.job === "Director")?.name;

  return (
    <div className={`min-h-screen ${theme==="dark"?"bg-[#0B0B12]":"bg-[#F8F9FC]"}`}>
      {/* Hero Section - backdrop stretches to fit ALL content */}
      <div className={`relative ${theme === "dark" ? "bg-[#1A1A33]" : "bg-[#2A2A4A]"}`}>
        {/* Backdrop Image - covers the entire hero area */}
        <div className="absolute inset-0 overflow-hidden">
          {backdropUrl ? <img src={backdropUrl} alt="" className="w-full h-full object-cover object-top"/> : <div className={`w-full h-full ${theme==="dark"?"bg-[#2A2A4A]":"bg-gray-700"}`}/>}
          {/* Dark overlays for readability */}
          <div className="absolute inset-0 bg-gradient-to-r from-black/95 via-black/80 to-black/50"/>
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/20"/>
        </div>

        {/* Content - positioned over backdrop */}
        <div className="relative z-10 max-w-7xl mx-auto px-4 md:px-8 pt-8 pb-12">
          <div className="flex flex-col md:flex-row gap-8">
            {/* Poster */}
            <div className="w-full max-w-[300px] md:w-[300px] mx-auto md:mx-0 flex-shrink-0">
              <div className="rounded-xl shadow-2xl overflow-hidden">{posterUrl ? <img src={posterUrl} alt={title} className="w-full aspect-[2/3] object-cover"/> : <div className="w-full aspect-[2/3] bg-gray-700 flex items-center justify-center"><Film className="w-16 h-16 text-[#A7A7C7]"/></div>}</div>
            </div>

            {/* Info */}
            <div className="flex-1 text-white">
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold">{title}{releaseYear && <span className="font-normal text-[#A7A7C7] ml-3">({releaseYear})</span>}</h1>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-4 text-sm text-[#A7A7C7]">
                {movie.release_date && <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4"/>{new Date(movie.release_date).toLocaleDateString(language==="bg"?"bg-BG":"en-US")}</span>}
                {genre && <span className="px-2 py-0.5 bg-white/10 rounded">{genre}</span>}
                {runtimeDisplay && <span className="flex items-center gap-1.5"><Clock className="w-4 h-4"/>{runtimeDisplay}</span>}
              </div>
              
              {/* Ratings Block */}
              <div className="flex flex-wrap items-start gap-6 mt-6">
                {/* TMDB Rating */}
                <div className="flex items-center gap-3">
                  <CircularRating rating={movie.tmdb_rating || 0} size={60}/>
                  <div>
                    <p className="font-semibold text-sm text-[#A7A7C7]">TMDB</p>
                    <p className="text-lg font-bold text-white">{movie.tmdb_rating ? movie.tmdb_rating.toFixed(1) : '—'}<span className="text-sm text-[#A7A7C7]">/10</span></p>
                  </div>
                </div>
                
                {/* Community Rating */}
                <div className="flex items-center gap-3">
                  <div className="relative flex items-center justify-center rounded-full" style={{ width: 60, height: 60, backgroundColor: "#1a1a2e" }}>
                    {(movie.review_count || 0) > 0 ? (
                      <>
                        <svg className="transform -rotate-90" width={60} height={60} viewBox="0 0 60 60">
                          <circle cx={30} cy={30} r={26} fill="none" stroke="#2d2d44" strokeWidth="4" />
                          <circle cx={30} cy={30} r={26} fill="none" stroke="#8b5cf6" strokeWidth="4" strokeLinecap="round" 
                            strokeDasharray={2 * Math.PI * 26} 
                            strokeDashoffset={2 * Math.PI * 26 * (1 - ((movie.average_rating || 0) / 5))} />
                        </svg>
                        <span className="absolute text-white font-bold text-lg">{(movie.average_rating || 0).toFixed(1)}</span>
                      </>
                    ) : (
                      <span className="text-[#A7A7C7] text-xs text-center">{language === "bg" ? "Няма" : "No\nratings"}</span>
                    )}
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-primary">{language === "bg" ? "Общност" : "Community"}</p>
                    {(movie.review_count || 0) > 0 ? (
                      <p className="text-lg font-bold text-white">{(movie.average_rating || 0).toFixed(1)}<span className="text-sm text-[#A7A7C7]">/5</span>
                        <span className="text-xs text-[#A7A7C7] ml-1">({movie.review_count})</span>
                      </p>
                    ) : (
                      <p className="text-sm text-[#A7A7C7]">{language === "bg" ? "Бъди първи!" : "Be the first!"}</p>
                    )}
                  </div>
                </div>
                
                {/* Your Rating - Display Only */}
                {isAuthenticated && userRating > 0 && (
                  <div className="flex items-center gap-3">
                    <div className="flex flex-col items-center">
                      <p className="font-semibold text-sm text-yellow-400 mb-1">{language === "bg" ? "Твоята оценка" : "Your Rating"}</p>
                      <StarRating
                        rating={userRating}
                        size={28}
                      />
                    </div>
                  </div>
                )}
              </div>
              
              {/* Action Buttons */}
              <div className="flex items-center gap-4 mt-6 flex-wrap">
                <div className="relative">
                  <button onClick={() => setShowWatchlistMenu(!showWatchlistMenu)} disabled={watchlistLoading} className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all ${btn.cls}`}>
                    {watchlistLoading ? <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin"/> : btn.icon}{btn.text}
                  </button>
                  {showWatchlistMenu && <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowWatchlistMenu(false)}/>
                    <div className={`absolute top-full left-0 mt-2 w-48 rounded-lg shadow-xl z-50 overflow-hidden ${theme==="dark"?"bg-[#2A2A4A]":"bg-white border"}`}>
                      {(['planned','watching','completed','dropped'] as const).map(s => (
                        <button key={s} onClick={() => addToWatchlist(s)} className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${watchlistStatus===s ? (s==='completed'?"bg-green-500/20 text-green-400":s==='watching'?"bg-yellow-500/20 text-yellow-400":s==='planned'?"bg-blue-500/20 text-blue-400":"bg-red-500/20 text-red-400") : theme==="dark"?"text-[#A7A7C7] hover:bg-[#2A2A4A]":"text-[#5B5D78] hover:bg-[#ECEEF8]"}`}>
                          {s==='planned'?<Bookmark className="w-4 h-4"/>:s==='watching'?<Play className="w-4 h-4"/>:s==='completed'?<Check className="w-4 h-4"/>:<X className="w-4 h-4"/>}
                          {s==='planned'?(language==="bg"?"Планиран":"Planned"):s==='watching'?(language==="bg"?"Гледам":"Watching"):s==='completed'?(language==="bg"?"Изгледан":"Completed"):(language==="bg"?"Отказан":"Dropped")}
                        </button>
                      ))}
                      {watchlistStatus && <><div className={`border-t ${theme==="dark"?"border-[#2A2A4A]":"border-[#E2E4F0]"}`}/><button onClick={removeFromWatchlist} className="w-full flex items-center gap-3 px-4 py-3 text-left text-red-500 hover:bg-red-500/10"><X className="w-4 h-4"/>{language==="bg"?"Премахни":"Remove"}</button></>}
                    </div>
                  </>}
                </div>
                
                {/* Favorite Button */}
                <button 
                  onClick={toggleFavorite} 
                  disabled={favoriteLoading}
                  className={`flex items-center justify-center w-12 h-12 rounded-full transition-all ${
                    isFavorite 
                      ? 'bg-secondary text-white hover:bg-secondary-hover' 
                      : 'bg-white/10 text-[#A7A7C7] hover:text-[#EDEDF7] hover:bg-white/20'
                  }`}
                  title={isFavorite ? (language === "bg" ? "Премахни от любими" : "Remove from favorites") : (language === "bg" ? "Добави в любими" : "Add to favorites")}
                >
                  {favoriteLoading ? (
                    <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin"/>
                  ) : (
                    <Heart className={`w-6 h-6 ${isFavorite ? 'fill-current' : ''}`} />
                  )}
                </button>
              </div>

              {/* Tagline */}
              {tagline && <p className="text-[#A7A7C7] italic text-lg mt-6">{tagline}</p>}

              {/* Overview */}
              <div className="mt-6">
                <h3 className="text-xl font-semibold mb-2 text-white">{language==="bg"?"Резюме":"Overview"}</h3>
                {summary ? <p className="text-gray-200 leading-relaxed max-w-3xl">{summary}</p> : <p className="text-[#A7A7C7] italic">{language==="bg"?"Няма":"No overview"}</p>}
              </div>

              {/* Director */}
              {director && (
                <div className="mt-6 pt-6 border-t border-white/10">
                  <p className="font-semibold text-lg text-white">{director}</p>
                  <p className="text-sm text-[#A7A7C7]">{language==="bg"?"Режисьор":"Director"}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Body Section - clean background, no overlap */}
      <div className={theme==="dark"?"bg-[#0B0B12]":"bg-[#F8F9FC]"}>
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-10">
          <div className="flex flex-col lg:flex-row gap-10">
            <div className="flex-1 min-w-0 space-y-12">
              <section><h2 className={`text-2xl font-bold mb-5 ${theme==="dark"?"text-white":"text-[#1A1B2E]"}`}>{language==="bg"?"Актьорски състав":"Top Billed Cast"}</h2><CastCarousel cast={movie.cast||[]} theme={theme} language={language}/></section>
              <VideosSection movie={movie} theme={theme} language={language}/>
              
              {/* Reviews Section */}
              <section>
                <h2 className={`text-2xl font-bold mb-5 flex items-center gap-2 ${theme==="dark"?"text-white":"text-[#1A1B2E]"}`}>
                  <MessageSquare className="w-6 h-6" />
                  {language==="bg"?"Ревюта":"Reviews"} 
                  {reviews.length > 0 && <span className="text-base font-normal text-[#A7A7C7]">({reviews.length})</span>}
                </h2>
                
                {/* Review Form - show if logged in and hasn't reviewed */}
                {isAuthenticated && !userHasReviewed && (
                  <div className="mb-6">
                    <ReviewForm 
                      movieId={parseInt(id!)} 
                      theme={theme} 
                      language={language}
                      onReviewAdded={handleReviewAdded}
                    />
                  </div>
                )}
                
                {/* Login prompt if not authenticated */}
                {!isAuthenticated && (
                  <div className={`p-5 rounded-lg mb-6 text-center ${theme==="dark"?"bg-[#1A1A33]":"bg-white border"}`}>
                    <p className={`mb-3 ${theme==="dark"?"text-[#A7A7C7]":"text-[#5B5D78]"}`}>
                      {language==="bg"?"Влезте, за да напишете ревю":"Log in to write a review"}
                    </p>
                    <button 
                      onClick={() => navigate('/login', { state: { from: `/movie/${id}` } })}
                      className="px-6 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors"
                    >
                      {language==="bg"?"Вход":"Log In"}
                    </button>
                  </div>
                )}
                
                {/* Edit Review Form */}
                {editingReview && (
                  <div className="mb-6">
                    <EditReviewForm
                      review={editingReview}
                      theme={theme}
                      language={language}
                      onSave={handleSaveEdit}
                      onCancel={() => setEditingReview(null)}
                    />
                  </div>
                )}

                {/* Reviews List */}
                {reviews.length > 0 ? (
                  <div className="space-y-4">
                    {reviews.map((r, i) => (
                      <ReviewCard
                        key={r.id || i}
                        review={r}
                        theme={theme}
                        language={language}
                        currentUserId={user?.id}
                        onEdit={handleEditReview}
                        onDelete={handleDeleteReview}
                      />
                    ))}
                  </div>
                ) : (
                  <div className={`text-center py-8 rounded-lg ${theme==="dark"?"bg-[#1A1A33] text-[#A7A7C7]":"bg-[#F3F4FF] text-[#A7A7C7]"}`}>
                    <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>{language==="bg"?"Все още няма ревюта":"No reviews yet"}</p>
                    <p className="text-sm mt-1">{language==="bg"?"Бъдете първият!":"Be the first to review!"}</p>
                  </div>
                )}
              </section>
            </div>

            {/* Sidebar - Facts + Similar Movies */}
            <aside className="lg:w-[320px] flex-shrink-0">
              <div className="lg:sticky lg:top-24 space-y-6">
                <FactsPanel movie={movie} theme={theme} language={language} />
                <SimilarMoviesSidebar movies={similarMovies} theme={theme} language={language} />
              </div>
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
}