import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { moviesApi } from "../api/movies";
import api from "../api/client";
import type { Movie } from "../types";
import { 
  ChevronLeft, ChevronRight, Play, TrendingUp, Star, Calendar, Sparkles, Heart
} from "lucide-react";

interface Recommendation {
  movie: Movie;
  score: number;
  explanation: {
    reasons?: string[];
    reasons_bg?: string[];
    score_breakdown?: Record<string, number>;
    based_on?: string[];  // Movie titles that influenced this recommendation
    similar_to?: string;  // Single movie title
    genre?: string;
    mood?: string;
  };
}

function CircularRating({ rating, size = 44 }: { rating: number; size?: number }) {
  const percentage = Math.round((rating || 0) * 10);
  const radius = (size - 6) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;
  const colors = percentage >= 70 ? { stroke: "#21d07a", bg: "#204529" } : percentage >= 50 ? { stroke: "#d2d531", bg: "#423d0f" } : { stroke: "#db2360", bg: "#571435" };

  return (
    <div className="relative flex items-center justify-center rounded-full" style={{ width: size, height: size, backgroundColor: "#081c22" }}>
      <svg className="transform -rotate-90" width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size/2} cy={size/2} r={radius} fill="#081c22" stroke={colors.bg} strokeWidth="3" />
        <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke={colors.stroke} strokeWidth="3" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} />
      </svg>
      <span className="absolute text-white font-bold" style={{ fontSize: size * 0.28 }}>{percentage}<sup style={{ fontSize: size * 0.14 }}>%</sup></span>
    </div>
  );
}

function HeroCarousel({ movies, language }: { movies: Movie[]; language: string }) {
  const navigate = useNavigate();
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (movies.length === 0) return;
    const interval = setInterval(() => setCurrentIndex((prev) => (prev + 1) % movies.length), 8000);
    return () => clearInterval(interval);
  }, [movies.length]);

  if (movies.length === 0) return null;

  const movie = movies[currentIndex];
  const title = language === "bg" ? movie.title_bg || movie.title : movie.title;
  const summary = language === "bg" ? movie.summary_bg || movie.summary : movie.summary;
  const backdropUrl = movie.backdrop_path ? `https://image.tmdb.org/t/p/w1280${movie.backdrop_path}` : movie.backdrop_url;

  return (
    <div className="relative h-[500px] md:h-[600px] overflow-hidden">
      <div className="absolute inset-0">
        {backdropUrl ? <img src={backdropUrl} alt={title} className="w-full h-full object-cover transition-opacity duration-700" /> : <div className="w-full h-full bg-gradient-to-br from-tmdb-dark-blue to-gray-900" />}
        <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/60 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />
      </div>
      <div className="relative z-10 h-full max-w-7xl mx-auto px-4 md:px-8 flex items-center">
        <div className="max-w-2xl">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">{title}</h1>
          {summary && <p className="text-gray-200 text-lg mb-6 line-clamp-3">{summary}</p>}
          <div className="flex items-center gap-4">
            <CircularRating rating={movie.average_rating ?? 0} size={56} />
            <button onClick={() => navigate(`/movie/${movie.id}`)} className="flex items-center gap-2 px-6 py-3 bg-white text-tmdb-dark-blue font-semibold rounded-lg hover:bg-gray-100 transition-colors">
              <Play className="w-5 h-5" fill="currentColor" />{language === "bg" ? "Повече" : "More Info"}
            </button>
          </div>
        </div>
      </div>
      {/* Dots */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-2">
        {movies.map((_, i) => (
          <button key={i} onClick={() => setCurrentIndex(i)} className={`w-2 h-2 rounded-full transition-all ${i === currentIndex ? "w-8 bg-white" : "bg-white/50 hover:bg-white/70"}`} />
        ))}
      </div>
    </div>
  );
}

// For You Carousel with recommendation reasons
function ForYouCarousel({ recommendations, language }: { recommendations: Recommendation[]; language: string }) {
  const navigate = useNavigate();
  const { theme } = useApp();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScroll = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  const scroll = (direction: "left" | "right") => {
    scrollRef.current?.scrollBy({ left: direction === "left" ? -400 : 400, behavior: "smooth" });
  };

  useEffect(() => {
    checkScroll();
    const ref = scrollRef.current;
    ref?.addEventListener("scroll", checkScroll);
    return () => ref?.removeEventListener("scroll", checkScroll);
  }, [recommendations]);

  if (!recommendations || recommendations.length < 3) return null;

  // Get the reason for a recommendation
  const getReason = (rec: Recommendation): string | null => {
    if (!rec.explanation) return null;
    const { reasons, reasons_bg, score_breakdown, based_on, similar_to, genre, mood } = rec.explanation;
    
    // Try language-specific reasons first
    let reason = language === "bg" && reasons_bg?.[0] ? reasons_bg[0] : reasons?.[0];
    
    // Skip generic/unhelpful reasons
    if (reason && (
      reason.toLowerCase().includes("your watched movies") ||
      reason.toLowerCase().includes("вашите гледани филми") ||
      reason.toLowerCase().includes("watched movies") ||
      reason === "undefined" ||
      reason.trim() === ""
    )) {
      reason = null;
    }
    
    // If no good reason, try based_on or similar_to
    if (!reason && similar_to) {
      reason = language === "bg" ? `Подобен на ${similar_to}` : `Similar to ${similar_to}`;
    }
    
    if (!reason && based_on && based_on.length > 0) {
      const movieName = based_on[0];
      reason = language === "bg" ? `Защото харесахте ${movieName}` : `Because you liked ${movieName}`;
    }
    
    // Try genre or mood
    if (!reason && genre) {
      reason = language === "bg" ? `Жанр: ${genre}` : `Genre: ${genre}`;
    }
    
    if (!reason && mood) {
      reason = language === "bg" ? `Настроение: ${mood}` : `Mood: ${mood}`;
    }
    
    // If no good reason, try to build one from score_breakdown
    if (!reason && score_breakdown) {
      const breakdownEntries = Object.entries(score_breakdown)
        .filter(([key, val]) => val > 0.1)
        .sort((a, b) => b[1] - a[1]);
      
      if (breakdownEntries.length > 0) {
        const topFactor = breakdownEntries[0][0];
        const factorLabels: Record<string, string> = {
          genre_similarity: language === "bg" ? "Сходен жанр" : "Similar genre",
          director_match: language === "bg" ? "Същият режисьор" : "Same director",
          actor_overlap: language === "bg" ? "Любим актьор" : "Favorite actor",
          mood_match: language === "bg" ? "Подходящо настроение" : "Matching mood",
          theme_similarity: language === "bg" ? "Сходна тема" : "Similar themes",
          rating_preference: language === "bg" ? "Високо оценен" : "Highly rated",
          popularity: language === "bg" ? "Популярен избор" : "Popular choice",
        };
        reason = factorLabels[topFactor] || null;
      }
    }
    
    // Final fallback based on match score
    if (!reason && rec.score >= 0.8) {
      reason = language === "bg" ? "Силно препоръчан" : "Highly recommended";
    }
    
    return reason;
  };

  return (
    <section className="relative">
      {/* Header with gradient accent */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500/20 to-pink-500/20">
            <Heart className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h2 className={`text-xl font-bold ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
              {language === "bg" ? "За теб" : "For You"}
            </h2>
            <p className={`text-sm ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>
              {language === "bg" ? "Персонализирани препоръки" : "Personalized picks"}
            </p>
          </div>
        </div>
      </div>

      {/* Carousel */}
      <div className="relative group">
        {canScrollLeft && (
          <button onClick={() => scroll("left")} className={`absolute -left-4 top-1/3 z-10 p-2 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-all ${theme === "dark" ? "bg-gray-800/90 text-white hover:bg-gray-700" : "bg-white/90 text-gray-800 hover:bg-white shadow-md"}`}>
            <ChevronLeft className="w-6 h-6" />
          </button>
        )}
        {canScrollRight && (
          <button onClick={() => scroll("right")} className={`absolute -right-4 top-1/3 z-10 p-2 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-all ${theme === "dark" ? "bg-gray-800/90 text-white hover:bg-gray-700" : "bg-white/90 text-gray-800 hover:bg-white shadow-md"}`}>
            <ChevronRight className="w-6 h-6" />
          </button>
        )}

        <div ref={scrollRef} className="flex gap-4 overflow-x-auto scrollbar-hide pb-6" style={{ scrollSnapType: "x mandatory" }}>
          {recommendations.map((rec, idx) => {
            const movie = rec.movie;
            const movieTitle = language === "bg" ? movie.title_bg || movie.title : movie.title;
            const posterUrl = movie.poster_path ? `https://image.tmdb.org/t/p/w342${movie.poster_path}` : movie.poster_url;
            const reason = getReason(rec);
            const matchPercent = Math.round(rec.score * 100);

            return (
              <div
                key={movie.id || idx}
                onClick={() => navigate(`/movie/${movie.id}`)}
                className="flex-shrink-0 w-[160px] cursor-pointer group/card"
                style={{ scrollSnapAlign: "start" }}
              >
                {/* Poster */}
                <div className="relative rounded-lg overflow-hidden shadow-lg">
                  {posterUrl ? (
                    <img src={posterUrl} alt={movieTitle} className="w-full aspect-[2/3] object-cover group-hover/card:scale-105 transition-transform duration-300" loading="lazy" />
                  ) : (
                    <div className={`w-full aspect-[2/3] flex items-center justify-center ${theme === "dark" ? "bg-gray-800" : "bg-gray-200"}`}>
                      <Sparkles className="w-10 h-10 text-gray-500" />
                    </div>
                  )}
                  {/* Match percentage badge */}
                  <div className="absolute top-2 right-2 px-2 py-1 rounded-md bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xs font-bold shadow-lg">
                    {matchPercent}% match
                  </div>
                </div>

                {/* Info */}
                <div className="pt-3 px-1">
                  <h3 className={`font-semibold text-sm line-clamp-1 group-hover/card:text-tmdb-light-blue transition-colors ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
                    {movieTitle}
                  </h3>
                  {/* Recommendation reason - purple italic text */}
                  {reason && (
                    <p className="text-xs mt-1.5 italic text-purple-400 line-clamp-2 leading-relaxed">
                      {reason}
                    </p>
                  )}
                  {/* Release year if no reason */}
                  {!reason && movie.release_date && (
                    <p className={`text-xs mt-1 ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>
                      {new Date(movie.release_date).getFullYear()}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function MovieCarousel({ movies, title, icon: Icon, language }: { movies: Movie[]; title: string; icon?: React.ComponentType<{ className?: string }>; language: string }) {
  const navigate = useNavigate();
  const { theme } = useApp();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScroll = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  const scroll = (direction: "left" | "right") => {
    scrollRef.current?.scrollBy({ left: direction === "left" ? -400 : 400, behavior: "smooth" });
  };

  useEffect(() => {
    checkScroll();
    const ref = scrollRef.current;
    ref?.addEventListener("scroll", checkScroll);
    return () => ref?.removeEventListener("scroll", checkScroll);
  }, [movies]);

  if (!movies || movies.length === 0) return null;

  return (
    <section className="relative">
      <div className="flex items-center justify-between mb-4">
        <h2 className={`text-xl font-bold flex items-center gap-2 ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
          {Icon && <Icon className="w-5 h-5 text-tmdb-light-blue" />}
          {title}
        </h2>
        <button onClick={() => navigate("/browse")} className="text-tmdb-light-blue hover:underline text-sm font-medium">
          {language === "bg" ? "Виж всички" : "View All"}
        </button>
      </div>

      <div className="relative group">
        {canScrollLeft && (
          <button onClick={() => scroll("left")} className={`absolute -left-4 top-1/3 z-10 p-2 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-all ${theme === "dark" ? "bg-gray-800/90 text-white hover:bg-gray-700" : "bg-white/90 text-gray-800 hover:bg-white shadow-md"}`}>
            <ChevronLeft className="w-6 h-6" />
          </button>
        )}
        {canScrollRight && (
          <button onClick={() => scroll("right")} className={`absolute -right-4 top-1/3 z-10 p-2 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-all ${theme === "dark" ? "bg-gray-800/90 text-white hover:bg-gray-700" : "bg-white/90 text-gray-800 hover:bg-white shadow-md"}`}>
            <ChevronRight className="w-6 h-6" />
          </button>
        )}

        <div ref={scrollRef} className="flex gap-4 overflow-x-auto scrollbar-hide pb-4" style={{ scrollSnapType: "x mandatory" }}>
          {movies.map((movie) => {
            const movieTitle = language === "bg" ? movie.title_bg || movie.title : movie.title;
            const posterUrl = movie.poster_path ? `https://image.tmdb.org/t/p/w342${movie.poster_path}` : movie.poster_url;
            const releaseDate = movie.release_date ? new Date(movie.release_date).toLocaleDateString(language === "bg" ? "bg-BG" : "en-US", { year: "numeric", month: "short", day: "numeric" }) : null;

            return (
              <div key={movie.id} onClick={() => navigate(`/movie/${movie.id}`)} className="flex-shrink-0 w-[150px] cursor-pointer group/card" style={{ scrollSnapAlign: "start" }}>
                <div className="relative rounded-lg overflow-hidden shadow-lg">
                  {posterUrl ? (
                    <img src={posterUrl} alt={movieTitle} className="w-full aspect-[2/3] object-cover group-hover/card:scale-105 transition-transform duration-300" loading="lazy" />
                  ) : (
                    <div className={`w-full aspect-[2/3] flex items-center justify-center ${theme === "dark" ? "bg-gray-800" : "bg-gray-200"}`}>
                      <Star className="w-10 h-10 text-gray-500" />
                    </div>
                  )}
                  {/* Rating - positioned inside poster at bottom-left */}
                  <div className="absolute bottom-2 left-2">
                    <CircularRating rating={movie.average_rating ?? 0} size={36} />
                  </div>
                </div>
                <div className="pt-3 px-1">
                  <h3 className={`font-semibold text-sm line-clamp-2 group-hover/card:text-tmdb-light-blue transition-colors ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
                    {movieTitle}
                  </h3>
                  {releaseDate && <p className={`text-xs mt-1 ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>{releaseDate}</p>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export default function Home() {
  const { theme, language, isAuthenticated } = useApp();
  const navigate = useNavigate();
  
  const [featuredMovies, setFeaturedMovies] = useState<Movie[]>([]);
  const [trendingMovies, setTrendingMovies] = useState<Movie[]>([]);
  const [topRatedMovies, setTopRatedMovies] = useState<Movie[]>([]);
  const [recentMovies, setRecentMovies] = useState<Movie[]>([]);
  const [forYouRecs, setForYouRecs] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch regular movies
  useEffect(() => {
    const fetchMovies = async () => {
      setLoading(true);
      try {
        const allMovies = await moviesApi.getAll();
        
        const featured = [...allMovies].sort((a: any, b: any) => (b.review_count ?? 0) - (a.review_count ?? 0)).slice(0, 5);
        setFeaturedMovies(featured);

        // Trending: movies with most activity (reviews + watchlist adds)
        // Combines review_count and recent engagement
        const trending = [...allMovies]
          .sort((a: any, b: any) => {
            // Score based on review count + rating combo (active movies)
            const scoreA = (a.review_count ?? 0) * 2 + (a.average_rating ?? 0);
            const scoreB = (b.review_count ?? 0) * 2 + (b.average_rating ?? 0);
            return scoreB - scoreA;
          })
          .slice(0, 20);
        setTrendingMovies(trending);

        // Top Rated: purely by average user rating (quality)
        const topRated = [...allMovies]
          .filter((m: any) => m.average_rating != null && m.average_rating > 0)
          .sort((a: any, b: any) => (b.average_rating ?? 0) - (a.average_rating ?? 0))
          .slice(0, 20);
        setTopRatedMovies(topRated);

        const recent = [...allMovies].filter((m: any) => m.release_date).sort((a: any, b: any) => new Date(b.release_date).getTime() - new Date(a.release_date).getTime()).slice(0, 20);
        setRecentMovies(recent);
      } catch (err) {
        console.error("Failed to fetch movies:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchMovies();
  }, []);

  // Fetch For You recommendations (only when logged in)
  useEffect(() => {
    const fetchForYou = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        setForYouRecs([]);
        return;
      }
      
      try {
        const response = await api.get('/ai/recommend/for-me', { params: { top_k: 15 } });
        setForYouRecs(response.data || []);
      } catch (err) {
        console.error("Failed to fetch recommendations:", err);
        setForYouRecs([]);
      }
    };
    
    fetchForYou();
  }, [isAuthenticated]);

  if (loading) {
    return (
      <div className={`min-h-screen ${theme === "dark" ? "bg-tmdb-dark" : "bg-gray-50"}`}>
        <div className={`h-[500px] md:h-[600px] animate-pulse ${theme === "dark" ? "bg-gray-800" : "bg-gray-300"}`} />
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">
          {[1, 2, 3].map((i) => (
            <div key={i} className="mb-8">
              <div className={`h-6 w-40 rounded mb-4 ${theme === "dark" ? "bg-gray-700" : "bg-gray-200"}`} />
              <div className="flex gap-4 overflow-hidden">
                {[1, 2, 3, 4, 5, 6].map((j) => (
                  <div key={j} className="flex-shrink-0 w-[150px]">
                    <div className={`aspect-[2/3] rounded-lg ${theme === "dark" ? "bg-gray-700" : "bg-gray-200"}`} />
                    <div className={`h-4 w-full rounded mt-6 ${theme === "dark" ? "bg-gray-700" : "bg-gray-200"}`} />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${theme === "dark" ? "bg-tmdb-dark" : "bg-gray-50"}`}>
      <HeroCarousel movies={featuredMovies} language={language} />

      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 space-y-10">
        {/* For You - Only shows when logged in and has 3+ recommendations */}
        {forYouRecs.length >= 3 && (
          <ForYouCarousel recommendations={forYouRecs} language={language} />
        )}

        <MovieCarousel movies={trendingMovies} title={language === "bg" ? "Trending" : "Trending"} icon={TrendingUp} language={language} />
        <MovieCarousel movies={topRatedMovies} title={language === "bg" ? "Топ рейтинг" : "Top Rated"} icon={Star} language={language} />
        <MovieCarousel movies={recentMovies} title={language === "bg" ? "Нови филми" : "Recently Released"} icon={Calendar} language={language} />

        {/* AI Search Promo */}
        <section className={`rounded-2xl p-8 ${theme === "dark" ? "bg-gradient-to-r from-tmdb-dark-blue to-gray-900 border border-gray-800" : "bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-100"}`}>
          <div className="flex flex-col md:flex-row items-center gap-6">
            <div className={`p-4 rounded-full ${theme === "dark" ? "bg-tmdb-light-blue/20" : "bg-tmdb-light-blue/10"}`}>
              <Sparkles className="w-10 h-10 text-tmdb-light-blue" />
            </div>
            <div className="flex-1 text-center md:text-left">
              <h3 className={`text-2xl font-bold mb-2 ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
                {language === "bg" ? "Търси с AI" : "Search with AI"}
              </h3>
              <p className={theme === "dark" ? "text-gray-300" : "text-gray-600"}>
                {language === "bg" ? "Опиши какво искаш да гледаш и нашият AI ще намери перфектния филм за теб." : "Describe what you want to watch and our AI will find the perfect movie for you."}
              </p>
            </div>
            <button onClick={() => navigate("/browse")} className="px-6 py-3 bg-tmdb-light-blue text-tmdb-dark-blue font-semibold rounded-lg hover:bg-tmdb-light-blue/90 transition-colors flex items-center gap-2">
              <Sparkles className="w-5 h-5" />{language === "bg" ? "Опитай сега" : "Try Now"}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}