// src/pages/MovieDetail.tsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { moviesApi } from '../api/movies';
import type { Movie } from '../types';
import api from '../api/client';
import { useApp } from '../context/AppContext';

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
  const { theme, language } = useApp();
  
  const [movie, setMovie] = useState<Movie | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [stats, setStats] = useState<MovieStats | null>(null);
  const [similarMovies, setSimilarMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [inWatchlist, setInWatchlist] = useState(false);
  const [watchlistLoading, setWatchlistLoading] = useState(false);
  
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
      const movieRes = await api.get(`/movies/${movieId}`);
      setMovie(movieRes.data);

      try {
        const reviewsRes = await api.get(`/reviews/movie/${movieId}`);
        setReviews(reviewsRes.data);
      } catch {
        setReviews([]);
      }

      try {
        const statsRes = await api.get(`/ai/movie/${movieId}/review-insights`);
        setStats(statsRes.data);
      } catch {
        setStats(null);
      }

      try {
        const similarRes = await moviesApi.getSimilar(movieId);
        setSimilarMovies(similarRes.slice(0, 6));
      } catch {
        setSimilarMovies([]);
      }

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
        await api.delete(`/watchlist/${movie.id}`);
        setInWatchlist(false);
      } else {
        await api.post('/watchlist/', { movie_id: movie.id, status: 'planned' });
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
      
      const reviewsRes = await api.get(`/reviews/movie/${movie.id}`);
      setReviews(reviewsRes.data);
      setNewReview({ rating: 5, comment: '' });
      
      try {
        const statsRes = await api.get(`/ai/movie/${movie.id}/review-insights`);
        setStats(statsRes.data);
      } catch { /* empty */ }
    } catch (err) {
      console.error('Review error:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'positive': return 'bg-green-500/10 border-green-500/20 text-green-500';
      case 'negative': return 'bg-red-500/10 border-red-500/20 text-red-500';
      default: return 'bg-gray-500/10 border-gray-500/20 text-gray-500';
    }
  };

  const getRatingColor = (rating: number): string => {
    if (rating >= 4) return 'text-green-500 border-green-500';
    if (rating >= 3) return 'text-yellow-500 border-yellow-500';
    if (rating >= 2) return 'text-orange-500 border-orange-500';
    return 'text-red-500 border-red-500';
  };

  // Get localized content
  const getTitle = (m: Movie) => language === 'bg' ? (m.title_bg || m.title) : m.title;
  const getGenre = (m: Movie) => language === 'bg' ? (m.genre_bg || m.genre) : m.genre;
  const getSummary = (m: Movie) => language === 'bg' ? (m.summary_bg || m.summary) : m.summary;

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${
        theme === 'dark' ? 'bg-gray-950' : 'bg-gray-50'
      }`}>
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!movie) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${
        theme === 'dark' ? 'bg-gray-950' : 'bg-gray-50'
      }`}>
        <p className={theme === 'dark' ? 'text-gray-500' : 'text-gray-600'}>
          {language === 'bg' ? 'Филмът не е намерен' : 'Movie not found'}
        </p>
      </div>
    );
  }

  const posterUrl = movie.poster_url || 'https://via.placeholder.com/400x600?text=No+Poster';
  const userScore = Math.round(movie.average_rating * 20);

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-gray-950' : 'bg-gray-50'}`}>
      {/* Hero Section */}
      <div className="relative">
        <div className={`absolute inset-0 ${
          theme === 'dark' 
            ? 'bg-gradient-to-r from-gray-900 via-gray-900/95 to-gray-900/80' 
            : 'bg-gradient-to-r from-white via-white/95 to-white/80'
        }`} />
        <div 
          className="absolute inset-0 opacity-20 bg-cover bg-center"
          style={{ backgroundImage: `url(${posterUrl})` }}
        />
        
        <div className="relative max-w-7xl mx-auto px-4 py-8">
          {/* Back Button */}
          <button
            onClick={() => navigate(-1)}
            className={`flex items-center gap-2 mb-6 transition-colors ${
              theme === 'dark' 
                ? 'text-gray-400 hover:text-white' 
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            {language === 'bg' ? 'Назад' : 'Back'}
          </button>

          <div className="flex flex-col md:flex-row gap-8">
            {/* Poster */}
            <div className="flex-shrink-0">
              <img
                src={posterUrl}
                alt={getTitle(movie)}
                className="w-64 md:w-80 rounded-lg shadow-2xl"
              />
            </div>

            {/* Info */}
            <div className={theme === 'dark' ? 'text-white' : 'text-gray-900'}>
              <h1 className="text-3xl md:text-4xl font-bold mb-2">{getTitle(movie)}</h1>
              
              {/* Meta info */}
              <div className={`flex flex-wrap items-center gap-4 mb-4 ${
                theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
              }`}>
                <span className={`px-3 py-1 rounded-full text-sm ${
                  theme === 'dark' ? 'bg-gray-800' : 'bg-gray-200'
                }`}>{getGenre(movie)}</span>
                <span>{movie.review_count} {language === 'bg' ? 'ревюта' : 'reviews'}</span>
              </div>

              {/* User Score */}
              <div className="flex items-center gap-4 mb-6">
                <div className={`w-16 h-16 rounded-full border-4 flex items-center justify-center font-bold text-xl ${
                  theme === 'dark' ? 'bg-gray-900/50' : 'bg-white/50'
                } ${getRatingColor(movie.average_rating)}`}>
                  {userScore}%
                </div>
                <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
                  {language === 'bg' ? 'Потребителска оценка' : 'User Score'}
                </span>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 mb-6">
                <button
                  onClick={handleAddToWatchlist}
                  disabled={watchlistLoading}
                  className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-colors ${
                    inWatchlist 
                      ? 'bg-green-600 hover:bg-green-700 text-white' 
                      : theme === 'dark'
                        ? 'bg-gray-700 hover:bg-gray-600 text-white'
                        : 'bg-gray-200 hover:bg-gray-300 text-gray-900'
                  }`}
                >
                  {watchlistLoading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : inWatchlist ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  )}
                  {inWatchlist 
                    ? (language === 'bg' ? 'В списъка' : 'In Watchlist')
                    : (language === 'bg' ? 'Добави в списъка' : 'Add to Watchlist')
                  }
                </button>
              </div>

              {/* Sentiment Stats */}
              {stats && stats.sentiment_breakdown && (
                <div className={`rounded-lg p-4 mb-6 ${
                  theme === 'dark' ? 'bg-gray-800/50' : 'bg-gray-100'
                }`}>
                  <h3 className={`text-sm font-medium mb-3 ${
                    theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    {language === 'bg' ? 'Настроение на ревютата' : 'Review Sentiment'}
                  </h3>
                  <div className="flex gap-6">
                    <div className="flex items-center gap-2">
                      <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.43a2 2 0 001.106 1.79l.05.025A4 4 0 008.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0015.56 8H12V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.8 2.4L6.8 7.933a4 4 0 00-.8 2.4z" />
                      </svg>
                      <span className="text-green-500 font-medium">{stats.sentiment_breakdown.positive}%</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <svg className="w-5 h-5 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                      </svg>
                      <span className={`font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                        {stats.sentiment_breakdown.neutral}%
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M18 9.5a1.5 1.5 0 11-3 0v-6a1.5 1.5 0 013 0v6zM14 9.667v-5.43a2 2 0 00-1.105-1.79l-.05-.025A4 4 0 0011.055 2H5.64a2 2 0 00-1.962 1.608l-1.2 6A2 2 0 004.44 12H8v4a2 2 0 002 2 1 1 0 001-1v-.667a4 4 0 01.8-2.4l1.4-1.866a4 4 0 00.8-2.4z" />
                      </svg>
                      <span className="text-red-500 font-medium">{stats.sentiment_breakdown.negative}%</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Overview */}
              <div>
                <h3 className="text-xl font-semibold mb-2">
                  {language === 'bg' ? 'Описание' : 'Overview'}
                </h3>
                <p className={`leading-relaxed ${
                  theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                }`}>{getSummary(movie)}</p>
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
            <h2 className={`text-2xl font-bold mb-6 ${
              theme === 'dark' ? 'text-white' : 'text-gray-900'
            }`}>
              {language === 'bg' ? 'Ревюта' : 'Reviews'} ({reviews.length})
            </h2>

            {/* Write Review Form */}
            {isLoggedIn && (
              <form onSubmit={handleSubmitReview} className={`rounded-xl p-6 mb-6 ${
                theme === 'dark' ? 'bg-gray-900' : 'bg-white shadow-md'
              }`}>
                <h3 className={`font-medium mb-4 ${
                  theme === 'dark' ? 'text-white' : 'text-gray-900'
                }`}>
                  {language === 'bg' ? 'Напиши ревю' : 'Write a Review'}
                </h3>
                
                {/* Rating */}
                <div className="mb-4">
                  <label className={`block text-sm mb-2 ${
                    theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                  }`}>
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
                        <svg
                          className={`w-6 h-6 ${
                            star <= newReview.rating
                              ? 'text-yellow-500 fill-yellow-500'
                              : theme === 'dark' ? 'text-gray-600' : 'text-gray-300'
                          }`}
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Comment */}
                <div className="mb-4">
                  <textarea
                    value={newReview.comment}
                    onChange={(e) => setNewReview({ ...newReview, comment: e.target.value })}
                    placeholder={language === 'bg' ? 'Напишете вашите мисли...' : 'Write your thoughts...'}
                    className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:border-blue-500 resize-none ${
                      theme === 'dark'
                        ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500'
                        : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-400'
                    }`}
                    rows={4}
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg transition-colors"
                >
                  {submitting && (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  )}
                  {language === 'bg' ? 'Изпрати' : 'Submit'}
                </button>
              </form>
            )}

            {/* Reviews List */}
            <div className="space-y-4">
              {reviews.length === 0 ? (
                <div className={`rounded-xl p-8 text-center ${
                  theme === 'dark' ? 'bg-gray-900' : 'bg-white shadow-md'
                }`}>
                  <p className={theme === 'dark' ? 'text-gray-500' : 'text-gray-600'}>
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
                  <div key={review.id} className={`rounded-xl p-6 ${
                    theme === 'dark' ? 'bg-gray-900' : 'bg-white shadow-md'
                  }`}>
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-medium">
                          {review.username?.charAt(0).toUpperCase() || 'U'}
                        </div>
                        <div>
                          <p className={`font-medium ${
                            theme === 'dark' ? 'text-white' : 'text-gray-900'
                          }`}>{review.username || 'User'}</p>
                          <div className="flex items-center gap-2">
                            <div className="flex">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <svg
                                  key={star}
                                  className={`w-4 h-4 ${
                                    star <= review.rating
                                      ? 'text-yellow-500 fill-yellow-500'
                                      : theme === 'dark' ? 'text-gray-600' : 'text-gray-300'
                                  }`}
                                  viewBox="0 0 20 20"
                                  fill="currentColor"
                                >
                                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                </svg>
                              ))}
                            </div>
                            <span className={`text-sm ${
                              theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
                            }`}>
                              {new Date(review.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Sentiment Badge */}
                      {review.sentiment && (
                        <div className={`flex items-center gap-1 px-3 py-1 rounded-full border ${getSentimentColor(review.sentiment.sentiment)}`}>
                          <span className="text-xs font-medium capitalize">
                            {review.sentiment.sentiment}
                          </span>
                        </div>
                      )}
                    </div>
                    <p className={theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}>
                      {review.comment}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Sidebar - Similar Movies */}
          <div>
            <h2 className={`text-2xl font-bold mb-6 ${
              theme === 'dark' ? 'text-white' : 'text-gray-900'
            }`}>
              {language === 'bg' ? 'Подобни филми' : 'Similar Movies'}
            </h2>
            <div className="space-y-4">
              {similarMovies.length === 0 ? (
                <p className={theme === 'dark' ? 'text-gray-500' : 'text-gray-600'}>
                  {language === 'bg' ? 'Няма подобни филми' : 'No similar movies found'}
                </p>
              ) : (
                similarMovies.map((similar) => (
                  <div
                    key={similar.id}
                    onClick={() => navigate(`/movie/${similar.id}`)}
                    className={`flex gap-4 rounded-lg p-3 cursor-pointer transition-colors ${
                      theme === 'dark' 
                        ? 'bg-gray-900 hover:bg-gray-800' 
                        : 'bg-white shadow-sm hover:shadow-md'
                    }`}
                  >
                    <img
                      src={similar.poster_url || 'https://via.placeholder.com/80x120?text=No+Poster'}
                      alt={getTitle(similar)}
                      className="w-16 h-24 object-cover rounded"
                    />
                    <div className="flex-grow">
                      <h4 className={`font-medium text-sm ${
                        theme === 'dark' ? 'text-white' : 'text-gray-900'
                      }`}>{getTitle(similar)}</h4>
                      <div className="flex items-center gap-1 mt-1">
                        <svg className="w-4 h-4 text-yellow-500 fill-yellow-500" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                        <span className={`text-sm ${
                          theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                        }`}>
                          {similar.average_rating.toFixed(1)}
                        </span>
                      </div>
                      <p className={`text-xs mt-1 ${
                        theme === 'dark' ? 'text-gray-500' : 'text-gray-500'
                      }`}>{getGenre(similar)}</p>
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