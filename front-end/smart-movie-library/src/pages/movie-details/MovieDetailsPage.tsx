import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useApp } from "../../context/AppContext";
import { moviesApi } from "../../api/movies";
import api from "../../api/client";
import type { Movie, Review, WatchStatus, ApiError } from "../../types";
import {
  Calendar, Clock, Bookmark, Film, Play, Check, Plus, X,
  Heart,
} from "lucide-react";
import RatingBadge from "../../components/RatingBadge";
import StarRating from "./components/StarRating";
import CastCarousel from "./components/CastCarousel";
import VideosSection from "./components/VideosSection";
import FactsPanel from "./components/FactsPanel";
import SimilarMoviesSidebar from "./components/SimilarMoviesSidebar";
import ReviewsSection from "./sections/ReviewsSection";
import type { MovieDetail, ReviewWithSentiment } from "./types";

export default function MovieDetailsPage() {
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
  const [, setUserReviewId] = useState<number | null>(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [favoriteLoading, setFavoriteLoading] = useState(false);
  const [userRating, setUserRating] = useState(0);
  const [editingReview, setEditingReview] = useState<ReviewWithSentiment | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!id || isNaN(parseInt(id))) return;
      const movieId = parseInt(id);
      setLoading(true); setError(null);
      try {
        const data = await moviesApi.getById(movieId);
        setMovie(data as MovieDetail);
        try {
          const r = await moviesApi.getReviews(movieId);
          setReviews(Array.isArray(r) ? r : []);
        } catch { setReviews([]); }
        try { const s = await moviesApi.getSimilar(movieId); setSimilarMovies(Array.isArray(s) ? s.slice(0, 10) : []); } catch { setSimilarMovies([]); }
      } catch { setError("Failed to load"); }
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
        const existingReview = myReviews.find((r: Review) => r.movie_id === parseInt(id));
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
    } catch (e) {
      if ((e as ApiError).response?.status === 400) { try { await api.put(`/watchlist/${id}`, { status }); setWatchlistStatus(status); setShowWatchlistMenu(false); } catch { /* retry failed */ } }
    } finally { setWatchlistLoading(false); }
  };

  const removeFromWatchlist = async () => {
    if (!id) return;
    setWatchlistLoading(true);
    try { await api.delete(`/watchlist/${id}`); setWatchlistStatus(null); setShowWatchlistMenu(false); } catch { /* ignore */ }
    finally { setWatchlistLoading(false); }
  };

  const handleReviewAdded = (newReview: Review) => {
    const reviewWithUser = {
      ...newReview,
      user_name: newReview.user_name || user?.name || (language === "bg" ? "Потребител" : "User"),
      created_at: newReview.created_at || new Date().toISOString()
    };
    setReviews(prev => [reviewWithUser, ...prev]);
    setUserHasReviewed(true);
    setUserReviewId(newReview.id);
    setUserRating(newReview.rating || 0);
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
      if (id) {
        moviesApi.getById(parseInt(id)).then(data => setMovie(data as MovieDetail));
      }
    } catch {
      // Failed to delete review
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
    } catch {
      // Failed to toggle favorite
    } finally {
      setFavoriteLoading(false);
    }
  };

  const getBtn = () => {
    if (!watchlistStatus) return { icon: <Plus className="w-5 h-5"/>, text: language==="bg"?"Добави":"Add to List", cls: "bg-surface/80 text-muted hover:text-text" };
    const map: Record<string, {icon: React.ReactNode; text: string; cls: string}> = {
      completed: { icon: <Check className="w-5 h-5"/>, text: language==="bg"?"Изгледан":"Completed", cls: "bg-green-600 text-white" },
      watching: { icon: <Play className="w-5 h-5"/>, text: language==="bg"?"Гледам":"Watching", cls: "bg-yellow-600 text-white" },
      planned: { icon: <Bookmark className="w-5 h-5"/>, text: language==="bg"?"Планиран":"Planned", cls: "bg-blue-600 text-white" },
      dropped: { icon: <X className="w-5 h-5"/>, text: language==="bg"?"Отказан":"Dropped", cls: "bg-red-600 text-white" },
    };
    return map[watchlistStatus] || { icon: <Plus className="w-5 h-5"/>, text: "Add", cls: "bg-surface/80 text-muted" };
  };
  const btn = getBtn();

  if (loading) return <div className={`min-h-screen ${theme==="dark"?"bg-bg":"bg-bg"}`}><div className="animate-pulse"><div className={`h-[500px] ${theme==="dark"?"bg-border":"bg-gray-300"}`}/></div></div>;
  if (error || !movie) return <div className={`min-h-screen flex items-center justify-center ${theme==="dark"?"bg-bg":"bg-bg"}`}><div className="text-center"><Film className="w-20 h-20 mx-auto mb-4 text-muted"/><p className="text-xl text-muted">{error||"Not found"}</p><button onClick={() => navigate(-1)} className="mt-4 px-6 py-2 bg-primary text-white rounded-lg font-medium">{language==="bg"?"Назад":"Back"}</button></div></div>;

  const title = language==="bg" ? movie.title_bg||movie.title : movie.title;
  const summary = language==="bg" ? movie.summary_bg||movie.summary : movie.summary;
  const tagline = language==="bg" ? movie.tagline_bg||movie.tagline : movie.tagline;
  const genre = language==="bg" ? movie.genre_bg||movie.genre : movie.genre;
  const backdropUrl = movie.backdrop_url_large || movie.backdrop_url || (movie.backdrop_path ? `https://image.tmdb.org/t/p/w1280${movie.backdrop_path}` : null);
  const posterUrl = movie.poster_url_large || movie.poster_url || (movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : null);
  const releaseYear = movie.release_year || (movie.release_date ? new Date(movie.release_date).getFullYear() : null);
  const runtimeDisplay = movie.runtime_formatted || (movie.runtime ? `${Math.floor(movie.runtime/60)}h ${movie.runtime%60}m` : null);
  const director = movie.director || movie.crew?.find(c => c.job === "Director")?.name;

  return (
    <div className={`min-h-screen ${theme==="dark"?"bg-bg":"bg-bg"}`}>
      {/* Hero Section - backdrop stretches to fit ALL content */}
      <div className={`relative ${theme === "dark" ? "bg-surface-2" : "bg-border"}`}>
        {/* Backdrop Image - covers the entire hero area */}
        <div className="absolute inset-0 overflow-hidden">
          {backdropUrl ? <img src={backdropUrl} alt="" className="w-full h-full object-cover object-top"/> : <div className={`w-full h-full ${theme==="dark"?"bg-border":"bg-gray-700"}`}/>}
          {/* Dark overlays for readability */}
          <div className="absolute inset-0 bg-gradient-to-r from-black/95 via-black/80 to-black/50"/>
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/20"/>
        </div>

        {/* Content - positioned over backdrop */}
        <div className="relative z-10 max-w-7xl mx-auto px-4 md:px-8 pt-8 pb-12">
          <div className="flex flex-col md:flex-row gap-8">
            {/* Poster */}
            <div className="w-full max-w-[300px] md:w-[300px] mx-auto md:mx-0 flex-shrink-0">
              <div className="rounded-xl shadow-2xl overflow-hidden">{posterUrl ? <img src={posterUrl} alt={title} className="w-full aspect-[2/3] object-cover"/> : <div className="w-full aspect-[2/3] bg-gray-700 flex items-center justify-center"><Film className="w-16 h-16 text-muted"/></div>}</div>
            </div>

            {/* Info */}
            <div className="flex-1 text-white">
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold">{title}{releaseYear && <span className="font-normal text-muted ml-3">({releaseYear})</span>}</h1>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-4 text-sm text-muted">
                {movie.release_date && <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4"/>{new Date(movie.release_date).toLocaleDateString(language==="bg"?"bg-BG":"en-US")}</span>}
                {genre && <span className="px-2 py-0.5 bg-white/10 rounded">{genre}</span>}
                {runtimeDisplay && <span className="flex items-center gap-1.5"><Clock className="w-4 h-4"/>{runtimeDisplay}</span>}
              </div>

              {/* Ratings Block */}
              <div className="flex flex-wrap items-center gap-6 mt-6">
                {/* TMDB Rating */}
                <div className="flex items-center gap-3">
                  <RatingBadge value={movie.tmdb_rating || 0} scale={10} size="lg" />
                  <div>
                    <p className="font-semibold text-sm text-muted">TMDB</p>
                    <p className="text-lg font-bold text-white">{movie.tmdb_rating ? movie.tmdb_rating.toFixed(1) : '—'}<span className="text-sm text-muted">/10</span></p>
                  </div>
                </div>

                {/* Community Rating */}
                <div className="flex items-center gap-3">
                  {(movie.review_count || 0) > 0 ? (
                    <RatingBadge value={movie.average_rating || 0} scale={5} size="lg" />
                  ) : null}
                  <div>
                    <p className="font-semibold text-sm text-primary">{language === "bg" ? "Общност" : "Community"}</p>
                    {(movie.review_count || 0) > 0 ? (
                      <p className="text-lg font-bold text-white">{(movie.average_rating || 0).toFixed(1)}<span className="text-sm text-muted">/5</span>
                        <span className="text-xs text-muted ml-1">({movie.review_count})</span>
                      </p>
                    ) : (
                      <p className="text-sm text-muted">{language === "bg" ? "Бъди първи!" : "Be the first!"}</p>
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
                    <div className={`absolute top-full left-0 mt-2 w-48 rounded-lg shadow-xl z-50 overflow-hidden ${theme==="dark"?"bg-border":"bg-white border"}`}>
                      {(['planned','watching','completed','dropped'] as const).map(s => (
                        <button key={s} onClick={() => addToWatchlist(s)} className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${watchlistStatus===s ? (s==='completed'?"bg-green-500/20 text-green-400":s==='watching'?"bg-yellow-500/20 text-yellow-400":s==='planned'?"bg-blue-500/20 text-blue-400":"bg-red-500/20 text-red-400") : theme==="dark"?"text-muted hover:bg-border":"text-muted hover:bg-surface-hover"}`}>
                          {s==='planned'?<Bookmark className="w-4 h-4"/>:s==='watching'?<Play className="w-4 h-4"/>:s==='completed'?<Check className="w-4 h-4"/>:<X className="w-4 h-4"/>}
                          {s==='planned'?(language==="bg"?"Планиран":"Planned"):s==='watching'?(language==="bg"?"Гледам":"Watching"):s==='completed'?(language==="bg"?"Изгледан":"Completed"):(language==="bg"?"Отказан":"Dropped")}
                        </button>
                      ))}
                      {watchlistStatus && <><div className={`border-t ${theme==="dark"?"border-border":"border-border"}`}/><button onClick={removeFromWatchlist} className="w-full flex items-center gap-3 px-4 py-3 text-left text-red-500 hover:bg-red-500/10"><X className="w-4 h-4"/>{language==="bg"?"Премахни":"Remove"}</button></>}
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
                      : 'bg-white/10 text-muted hover:text-text hover:bg-white/20'
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
              {tagline && <p className="text-muted italic text-lg mt-6">{tagline}</p>}

              {/* Overview */}
              <div className="mt-6">
                <h3 className="text-xl font-semibold mb-2 text-white">{language==="bg"?"Резюме":"Overview"}</h3>
                {summary ? <p className="text-gray-200 leading-relaxed max-w-3xl">{summary}</p> : <p className="text-muted italic">{language==="bg"?"Няма":"No overview"}</p>}
              </div>

              {/* Director */}
              {director && (
                <div className="mt-6 pt-6 border-t border-white/10">
                  <p className="font-semibold text-lg text-white">{director}</p>
                  <p className="text-sm text-muted">{language==="bg"?"Режисьор":"Director"}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Body Section - clean background, no overlap */}
      <div className={theme==="dark"?"bg-bg":"bg-bg"}>
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-10">
          <div className="flex flex-col lg:flex-row gap-10">
            <div className="flex-1 min-w-0 space-y-12">
              <section><h2 className={`text-2xl font-bold mb-5 text-text`}>{language==="bg"?"Актьорски състав":"Top Billed Cast"}</h2><CastCarousel cast={movie.cast||[]} theme={theme} language={language}/></section>
              <VideosSection movie={movie} theme={theme} language={language}/>

              <ReviewsSection
                movieId={parseInt(id!)}
                theme={theme}
                language={language}
                isAuthenticated={isAuthenticated}
                reviews={reviews}
                userHasReviewed={userHasReviewed}
                editingReview={editingReview}
                currentUserId={user?.id}
                onReviewAdded={handleReviewAdded}
                onEditReview={handleEditReview}
                onSaveEdit={handleSaveEdit}
                onCancelEdit={() => setEditingReview(null)}
                onDeleteReview={handleDeleteReview}
              />
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
