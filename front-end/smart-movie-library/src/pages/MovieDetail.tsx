// src/pages/MovieDetail.tsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Star, Clock, Calendar, Heart, Plus, Check,
  ThumbsUp, ThumbsDown, Minus, Send, Loader2
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { moviesApi } from '../api/movies';
import type { Movie } from '../types';
import api from '../api/client';

interface Review {
  id: number;
  user_id: number;
  username: string;
  rating: number;
  comment: string;
  created_at: string;
  sentiment?: {
    sentiment: string;
    confidence: number;
  };
}

interface MovieStats {
  total_reviews: number;
  sentiment_breakdown?: {
    positive: number;
    negative: number;
    neutral: number;
  };
  average_sentiment_confidence?: number;
}

export default function MovieDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t, language } = useApp();
  
  const [movie, setMovie] = useState<Movie | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [stats, setStats] = useState<MovieStats | null>(null);
  const [similarMovies, setSimilarMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [inWatchlist, setInWatchlist] = useState(false);
  const [watchlistLoading, setWatchlistLoading] = useState(false);
  
  // Review form
  const [newReview, setNewReview] = useState({ rating: 5, comment: '' });
  const [submitting, setSubmitting] = useState(false);
  
  const isLoggedIn = !!localStorage.getItem('token');

  useEffect(() => {
    if (id) {
      fetchMovieData(parseInt(id));
    }
  }, [id]);

  const fetchMovieData = async (movieId: number) => {
    setLoading(true);
    try {
      // Fetch movie details
      const movieRes = await api.get(`/movies/${movieId}`);
      setMovie(movieRes.data);

      // Fetch reviews
      try {
        const reviewsRes = await api.get(`/reviews/movie/${movieId}`);
        setReviews(reviewsRes.data);
      } catch {
        setReviews([]);
      }

      // Fetch sentiment stats
      try {
        const statsRes = await api.get(`/ai/movie/${movieId}/review-insights`);
        setStats(statsRes.data);
      } catch {
        setStats(null);
      }

      // Fetch similar movies
      try {
        const similarRes = await moviesApi.getSimilar(movieId);
        setSimilarMovies(similarRes.slice(0, 6));
      } catch {
        setSimilarMovies([]);
      }

      // Check watchlist status
      if (isLoggedIn) {
        try {
          const watchlistRes = await api.get('/watchlist/');
          const inList = watchlistRes.data.some((item: { movie_id: number }) => item.movie_id === movieId);
          setInWatchlist(inList);
        } catch {
          setInWatchlist(false);
        }
      }
    } catch (err) {
      console.error('Error fetching movie:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToWatchlist = async () => {
    if (!isLoggedIn || !movie) {
      navigate('/login');
      return;
    }

    setWatchlistLoading(true);
    try {
      if (inWatchlist) {
        // DELETE uses movie_id in the URL
        await api.delete(`/watchlist/${movie.id}`);
        setInWatchlist(false);
      } else {
        // POST with lowercase status
        await api.post('/watchlist/', { 
          movie_id: movie.id, 
          status: 'planned'  // lowercase!
        });
        setInWatchlist(true);
      }
    } catch (err) {
      console.error('Watchlist error:', err);
    } finally {
      setWatchlistLoading(false);
    }
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoggedIn || !movie) {
      navigate('/login');
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/reviews/', {
        movie_id: movie.id,
        rating: newReview.rating,
        comment: newReview.comment,
      });
      
      // Refresh reviews
      const reviewsRes = await api.get(`/reviews/movie/${movie.id}`);
      setReviews(reviewsRes.data);
      setNewReview({ rating: 5, comment: '' });
      
      // Refresh stats
      try {
        const statsRes = await api.get(`/ai/movie/${movie.id}/review-insights`);
        setStats(statsRes.data);
      } catch {
        // Ignore stats error
      }
    } catch (err) {
      console.error('Review error:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const getSentimentIcon = (sentiment: string) => {
    switch (sentiment) {
      case 'positive': return <ThumbsUp className="w-4 h-4 text-green-500" />;
      case 'negative': return <ThumbsDown className="w-4 h-4 text-red-500" />;
      default: return <Minus className="w-4 h-4 text-gray-500" />;
    }
  };

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'positive': return 'bg-green-500/10 border-green-500/20 text-green-500';
      case 'negative': return 'bg-red-500/10 border-red-500/20 text-red-500';
      default: return 'bg-gray-500/10 border-gray-500/20 text-gray-500';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!movie) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-950 flex items-center justify-center">
        <p className="text-gray-500">{language === 'bg' ? 'Филмът не е намерен' : 'Movie not found'}</p>
      </div>
    );
  }

  const title = language === 'bg' ? (movie.title_bg || movie.title) : movie.title;
  const summary = language === 'bg' ? (movie.summary_bg || movie.summary) : movie.summary;
  const genre = language === 'bg' ? (movie.genre_bg || movie.genre) : movie.genre;
  const posterUrl = movie.poster_url || 'https://via.placeholder.com/400x600?text=No+Poster';

  // Calculate user score percentage
  const userScore = Math.round(movie.average_rating * 20);

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-950 transition-colors">
      {/* Hero Section with Backdrop */}
      <div className="relative">
        {/* Backdrop gradient */}
        <div className="absolute inset-0 bg-gradient-to-r from-gray-900 via-gray-900/95 to-gray-900/80" />
        <div 
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `url(${posterUrl})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            filter: 'blur(20px)',
          }}
        />

        <div className="relative max-w-7xl mx-auto px-4 py-8">
          {/* Back button */}
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-gray-300 hover:text-white mb-6 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            {language === 'bg' ? 'Назад' : 'Back'}
          </button>

          <div className="flex flex-col md:flex-row gap-8">
            {/* Poster */}
            <div className="flex-shrink-0">
              <img
                src={posterUrl}
                alt={title}
                className="w-64 md:w-80 rounded-xl shadow-2xl mx-auto md:mx-0"
              />
            </div>

            {/* Movie Info */}
            <div className="flex-grow text-white">
              <h1 className="text-3xl md:text-4xl font-bold mb-2">{title}</h1>
              
              {/* Meta info */}
              <div className="flex flex-wrap items-center gap-4 text-gray-300 text-sm mb-6">
                <span className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  2024
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  2h 15m
                </span>
                <span className="px-2 py-1 bg-gray-700 rounded text-xs">{genre}</span>
              </div>

              {/* Score and Actions */}
              <div className="flex items-center gap-6 mb-6">
                {/* User Score Circle */}
                <div className="relative w-16 h-16">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle
                      cx="32"
                      cy="32"
                      r="28"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="transparent"
                      className="text-gray-700"
                    />
                    <circle
                      cx="32"
                      cy="32"
                      r="28"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="transparent"
                      strokeDasharray={`${userScore * 1.76} 176`}
                      className={userScore >= 70 ? 'text-green-500' : userScore >= 50 ? 'text-yellow-500' : 'text-red-500'}
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-lg font-bold">{userScore}%</span>
                  </div>
                </div>
                <div>
                  <p className="font-medium">{language === 'bg' ? 'Потребителска оценка' : 'User Score'}</p>
                  <p className="text-sm text-gray-400">{movie.review_count} {t.reviews}</p>
                </div>

                {/* Action Buttons - GREEN when in watchlist */}
                <button
                  onClick={handleAddToWatchlist}
                  disabled={watchlistLoading}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full transition-colors ${
                    inWatchlist
                      ? 'bg-green-600 hover:bg-green-700 text-white'
                      : 'bg-gray-700 hover:bg-gray-600 text-white'
                  }`}
                >
                  {watchlistLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : inWatchlist ? (
                    <Check className="w-5 h-5" />
                  ) : (
                    <Plus className="w-5 h-5" />
                  )}
                  {language === 'bg' 
                    ? (inWatchlist ? 'В списъка' : 'Добави в списък')
                    : (inWatchlist ? 'In Watchlist' : 'Add to Watchlist')
                  }
                </button>
              </div>

              {/* Sentiment Overview */}
              {stats?.sentiment_breakdown && (
                <div className="bg-gray-800/50 rounded-xl p-4 mb-6">
                  <h3 className="font-medium mb-3 flex items-center gap-2">
                    <Heart className="w-5 h-5 text-pink-500" />
                    {language === 'bg' ? 'Мнение на зрителите' : 'Audience Sentiment'}
                  </h3>
                  <div className="flex gap-4">
                    <div className="flex items-center gap-2">
                      <ThumbsUp className="w-5 h-5 text-green-500" />
                      <span className="text-green-500 font-medium">{stats.sentiment_breakdown.positive}%</span>
                      <span className="text-gray-400 text-sm">{language === 'bg' ? 'Положителни' : 'Positive'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Minus className="w-5 h-5 text-gray-500" />
                      <span className="text-gray-400 font-medium">{stats.sentiment_breakdown.neutral}%</span>
                      <span className="text-gray-400 text-sm">{language === 'bg' ? 'Неутрални' : 'Neutral'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <ThumbsDown className="w-5 h-5 text-red-500" />
                      <span className="text-red-500 font-medium">{stats.sentiment_breakdown.negative}%</span>
                      <span className="text-gray-400 text-sm">{language === 'bg' ? 'Отрицателни' : 'Negative'}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Overview */}
              <div>
                <h3 className="text-xl font-semibold mb-2">
                  {language === 'bg' ? 'Описание' : 'Overview'}
                </h3>
                <p className="text-gray-300 leading-relaxed">{summary}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Reviews Section */}
          <div className="lg:col-span-2">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
              {language === 'bg' ? 'Ревюта' : 'Reviews'} ({reviews.length})
            </h2>

            {/* Write Review Form */}
            {isLoggedIn && (
              <form onSubmit={handleSubmitReview} className="bg-white dark:bg-gray-900 rounded-xl p-6 mb-6 shadow-lg">
                <h3 className="font-medium text-gray-900 dark:text-white mb-4">
                  {language === 'bg' ? 'Напиши ревю' : 'Write a Review'}
                </h3>
                
                {/* Rating */}
                <div className="mb-4">
                  <label className="block text-sm text-gray-600 dark:text-gray-400 mb-2">
                    {language === 'bg' ? 'Оценка' : 'Rating'}
                  </label>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setNewReview({ ...newReview, rating: star })}
                        className="p-1"
                      >
                        <Star
                          className={`w-6 h-6 ${
                            star <= newReview.rating
                              ? 'text-yellow-500 fill-yellow-500'
                              : 'text-gray-300 dark:text-gray-600'
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Comment */}
                <div className="mb-4">
                  <textarea
                    value={newReview.comment}
                    onChange={(e) => setNewReview({ ...newReview, comment: e.target.value })}
                    placeholder={language === 'bg' ? 'Напишете вашето мнение...' : 'Write your thoughts...'}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 resize-none"
                    rows={4}
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg transition-colors"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  {language === 'bg' ? 'Публикувай' : 'Submit'}
                </button>
              </form>
            )}

            {/* Reviews List */}
            <div className="space-y-4">
              {reviews.length === 0 ? (
                <div className="bg-white dark:bg-gray-900 rounded-xl p-8 text-center">
                  <p className="text-gray-500">
                    {language === 'bg' ? 'Все още няма ревюта.' : 'No reviews yet.'}
                  </p>
                  {!isLoggedIn && (
                    <button
                      onClick={() => navigate('/login')}
                      className="mt-4 text-blue-500 hover:text-blue-400"
                    >
                      {language === 'bg' ? 'Влезте, за да напишете първото!' : 'Log in to write the first one!'}
                    </button>
                  )}
                </div>
              ) : (
                reviews.map((review) => (
                  <div key={review.id} className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-lg">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-medium">
                          {review.username?.charAt(0).toUpperCase() || 'U'}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">{review.username || 'User'}</p>
                          <div className="flex items-center gap-2">
                            <div className="flex">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <Star
                                  key={star}
                                  className={`w-4 h-4 ${
                                    star <= review.rating
                                      ? 'text-yellow-500 fill-yellow-500'
                                      : 'text-gray-300 dark:text-gray-600'
                                  }`}
                                />
                              ))}
                            </div>
                            <span className="text-sm text-gray-500">
                              {new Date(review.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Sentiment Badge */}
                      {review.sentiment && (
                        <div className={`flex items-center gap-1 px-3 py-1 rounded-full border ${getSentimentColor(review.sentiment.sentiment)}`}>
                          {getSentimentIcon(review.sentiment.sentiment)}
                          <span className="text-xs font-medium capitalize">
                            {review.sentiment.sentiment === 'positive' 
                              ? (language === 'bg' ? 'Положително' : 'Positive')
                              : review.sentiment.sentiment === 'negative'
                              ? (language === 'bg' ? 'Отрицателно' : 'Negative')
                              : (language === 'bg' ? 'Неутрално' : 'Neutral')
                            }
                          </span>
                        </div>
                      )}
                    </div>
                    <p className="text-gray-700 dark:text-gray-300">{review.comment}</p>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Sidebar - Similar Movies */}
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
              {language === 'bg' ? 'Подобни филми' : 'Similar Movies'}
            </h2>
            <div className="space-y-4">
              {similarMovies.length === 0 ? (
                <p className="text-gray-500">{language === 'bg' ? 'Няма подобни филми' : 'No similar movies found'}</p>
              ) : (
                similarMovies.map((similar) => (
                  <div
                    key={similar.id}
                    onClick={() => navigate(`/movie/${similar.id}`)}
                    className="flex gap-4 bg-white dark:bg-gray-900 rounded-lg p-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors shadow"
                  >
                    <img
                      src={similar.poster_url || 'https://via.placeholder.com/80x120?text=No+Poster'}
                      alt={language === 'bg' ? (similar.title_bg || similar.title) : similar.title}
                      className="w-16 h-24 object-cover rounded"
                    />
                    <div className="flex-grow">
                      <h4 className="font-medium text-gray-900 dark:text-white text-sm">
                        {language === 'bg' ? (similar.title_bg || similar.title) : similar.title}
                      </h4>
                      <div className="flex items-center gap-1 mt-1">
                        <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          {similar.average_rating.toFixed(1)}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {language === 'bg' ? (similar.genre_bg || similar.genre) : similar.genre}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}