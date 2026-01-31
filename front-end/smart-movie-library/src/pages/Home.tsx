import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { moviesApi } from "../api/movies";
import api from "../api/client";
import type { Movie } from "../types";
import { 
  ChevronLeft, ChevronRight, Play, TrendingUp, Star, Calendar, Sparkles, Heart, ListPlus
} from "lucide-react";

// ============================================================================
// SCORING HELPERS
// ============================================================================

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const logNorm = (x: number, max: number) => (max > 0 ? Math.log1p(x) / Math.log1p(max) : 0);

const normRating01 = (rating: any) => {
  const r = Number(rating) || 0;
  if (r <= 0) return 0;
  return clamp01(r <= 5 ? r / 5 : r / 10);
};

const combinedRating01 = (m: any, K = 30) => {
  const tmdb = normRating01(m.tmdb_rating);
  const local = normRating01(m.average_rating);
  const reviews = Number(m.review_count) || 0;

  const hasTmdb = tmdb > 0;
  const hasLocal = reviews > 0 && local > 0;

  if (hasLocal && !hasTmdb) return local;
  if (!hasLocal && hasTmdb) return tmdb;
  if (!hasLocal && !hasTmdb) return 0.5;

  const confidence = clamp01(reviews / (reviews + K));
  return clamp01(confidence * local + (1 - confidence) * tmdb);
};

// TIME DECAY for Trending - this is the KEY fix to prevent old classics
const getTimeDecay = (releaseDate: string | null): number => {
  if (!releaseDate) return 0.3; // Unknown = low priority
  const now = new Date();
  const release = new Date(releaseDate);
  const yearsOld = (now.getTime() - release.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
  
  // Decay curve: recent movies get full weight, old movies get penalized
  if (yearsOld < 1) return 1.0;      // < 1 year: full weight
  if (yearsOld < 2) return 0.9;      // 1-2 years: slight decay
  if (yearsOld < 3) return 0.75;     // 2-3 years: moderate decay  
  if (yearsOld < 5) return 0.5;      // 3-5 years: significant decay
  if (yearsOld < 10) return 0.25;    // 5-10 years: heavy decay
  return 0.1;                         // 10+ years: almost filtered out
};

// ============================================================================
// TYPES
// ============================================================================

interface Recommendation {
  movie: Movie;
  score: number;
  explanation: {
    reasons?: string[];
    reasons_bg?: string[];
    score_breakdown?: Record<string, number>;
    based_on?: string[];
    similar_to?: string;
    genre?: string;
    mood?: string;
  };
}

interface UserState {
  isLoggedIn: boolean;
  hasActivity: boolean;
  personalizedCount: number;
}

// ============================================================================
// COMPONENTS
// ============================================================================

function CircularRating({ rating, size = 44, label }: { rating: number; size?: number; label?: string }) {
  const percentage = Math.round((rating || 0) * 10);
  const radius = (size - 6) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;
  const colors = percentage >= 70 ? { stroke: "#21d07a", bg: "#204529" } : percentage >= 50 ? { stroke: "#d2d531", bg: "#423d0f" } : { stroke: "#db2360", bg: "#571435" };

  return (
    <div className="flex flex-col items-center">
      <div className="relative flex items-center justify-center rounded-full" style={{ width: size, height: size, backgroundColor: "#081c22" }}>
        <svg className="transform -rotate-90" width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <circle cx={size/2} cy={size/2} r={radius} fill="#081c22" stroke={colors.bg} strokeWidth="3" />
          <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke={colors.stroke} strokeWidth="3" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} />
        </svg>
        <span className="absolute text-white font-bold" style={{ fontSize: size * 0.28 }}>{percentage}<sup style={{ fontSize: size * 0.14 }}>%</sup></span>
      </div>
      {label && <span className="text-[9px] text-gray-400 mt-0.5 font-medium">{label}</span>}
    </div>
  );
}

function CommunityBadge({ rating, count, size = "sm" }: { rating: number; count: number; size?: "sm" | "md" }) {
  if (count === 0) return null;
  
  const displayRating = rating <= 5 ? rating : rating / 2;
  const sizeClasses = size === "sm" ? "text-[10px] px-1.5 py-0.5" : "text-xs px-2 py-1";
  
  return (
    <div className={`flex items-center gap-1 bg-black/70 backdrop-blur-sm rounded ${sizeClasses} text-white`}>
      <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
      <span className="font-semibold">{displayRating.toFixed(1)}</span>
      <span className="text-gray-300">({count})</span>
    </div>
  );
}

function HeroCarousel({ movies, language }: { movies: Movie[]; language: string }) {
  const navigate = useNavigate();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [showArrows, setShowArrows] = useState(false);

  useEffect(() => {
    if (movies.length === 0 || isPaused) return;
    const interval = setInterval(() => setCurrentIndex((prev) => (prev + 1) % movies.length), 8000);
    return () => clearInterval(interval);
  }, [movies.length, isPaused]);

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev === 0 ? movies.length - 1 : prev - 1));
    setIsPaused(true);
    setTimeout(() => setIsPaused(false), 10000);
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % movies.length);
    setIsPaused(true);
    setTimeout(() => setIsPaused(false), 10000);
  };

  const goToSlide = (index: number) => {
    setCurrentIndex(index);
    setIsPaused(true);
    setTimeout(() => setIsPaused(false), 10000);
  };

  if (movies.length === 0) return null;

  const movie = movies[currentIndex];
  const title = language === "bg" ? movie.title_bg || movie.title : movie.title;
  const summary = language === "bg" ? movie.summary_bg || movie.summary : movie.summary;
  const backdropPath = movie.backdrop_path;
  const backdropUrl = backdropPath 
    ? `https://image.tmdb.org/t/p/original${backdropPath}` 
    : movie.backdrop_url;

  return (
    <div 
      className="relative h-[500px] md:h-[600px] overflow-hidden"
      onMouseEnter={() => setShowArrows(true)}
      onMouseLeave={() => setShowArrows(false)}
    >
      <div className="absolute inset-0">
        {backdropUrl ? (
          <img 
            src={backdropUrl} 
            alt={title} 
            className="w-full h-full object-cover"
            loading="eager"
            decoding="sync"
            style={{ imageRendering: 'auto', transform: 'translateZ(0)' }}
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-tmdb-dark-blue to-gray-900" />
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />
      </div>
      
      {movies.length > 1 && (
        <div className="absolute left-4 top-1/2 z-20" style={{ transform: 'translateY(-50%)' }}>
          <button 
            onClick={goToPrevious}
            className={`p-3 rounded-full bg-black/40 text-white hover:bg-black/60 transition-opacity duration-200 ${showArrows ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
          >
            <ChevronLeft className="w-8 h-8" />
          </button>
        </div>
      )}
      
      {movies.length > 1 && (
        <div className="absolute right-4 top-1/2 z-20" style={{ transform: 'translateY(-50%)' }}>
          <button 
            onClick={goToNext}
            className={`p-3 rounded-full bg-black/40 text-white hover:bg-black/60 transition-opacity duration-200 ${showArrows ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
          >
            <ChevronRight className="w-8 h-8" />
          </button>
        </div>
      )}
      
      <div className="absolute inset-0 z-10 flex items-center">
        <div className="max-w-7xl mx-auto px-4 md:px-8 w-full">
          <div className="max-w-2xl">
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">{title}</h1>
            <div className="h-[84px] mb-6">
              {summary && <p className="text-gray-200 text-lg line-clamp-3">{summary}</p>}
            </div>
            <div className="flex items-center gap-6">
              <CircularRating rating={(movie as any).tmdb_rating ?? 0} size={56} />
              
              {((movie as any).review_count || 0) > 0 && (
                <div className="flex flex-col items-center">
                  <div className="flex items-center gap-1.5 bg-black/50 backdrop-blur-sm rounded-lg px-3 py-2">
                    <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                    <span className="text-white font-bold text-lg">
                      {((movie as any).average_rating || 0).toFixed(1)}
                    </span>
                    <span className="text-gray-300 text-sm">({(movie as any).review_count})</span>
                  </div>
                  <span className="text-[10px] text-gray-400 mt-1">Community</span>
                </div>
              )}
              
              <button 
                onClick={() => navigate(`/movie/${movie.id}`)} 
                className="inline-flex items-center gap-2 px-6 py-3 bg-white text-tmdb-dark-blue font-semibold rounded-lg hover:bg-gray-100"
              >
                <Play className="w-5 h-5" fill="currentColor" />
                {language === "bg" ? "Повече" : "More Info"}
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <div className="absolute bottom-8 left-1/2 z-20 flex gap-2" style={{ transform: 'translateX(-50%)' }}>
        {movies.map((_, i) => (
          <button 
            key={i} 
            onClick={() => goToSlide(i)} 
            className={`h-2 rounded-full transition-all duration-200 ${i === currentIndex ? "w-8 bg-white" : "w-2 bg-white/50 hover:bg-white/70"}`}
          />
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// ONBOARDING CARD - Shows for logged-in users without recommendations
// ============================================================================

function OnboardingCard({ language, theme, onNavigate }: { language: string; theme: string; onNavigate: () => void }) {
  return (
    <section className="relative">
      <div className={`rounded-2xl p-6 md:p-8 ${theme === "dark" 
        ? "bg-gradient-to-r from-purple-900/30 via-pink-900/20 to-purple-900/30 border border-purple-500/20" 
        : "bg-gradient-to-r from-purple-50 via-pink-50 to-purple-50 border border-purple-200"}`}>
        <div className="flex flex-col md:flex-row items-center gap-6">
          <div className={`p-4 rounded-full ${theme === "dark" ? "bg-purple-500/20" : "bg-purple-100"}`}>
            <ListPlus className="w-10 h-10 text-purple-400" />
          </div>
          <div className="flex-1 text-center md:text-left">
            <h3 className={`text-xl md:text-2xl font-bold mb-2 ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
              {language === "bg" ? "🎯 Започни своите препоръки" : "🎯 Start Your Recommendations"}
            </h3>
            <p className={`${theme === "dark" ? "text-gray-300" : "text-gray-600"}`}>
              {language === "bg" 
                ? "Добави филми в списъка си или ги оцени, за да отключиш персонализирани препоръки." 
                : "Add movies to your watchlist or rate them to unlock personalized recommendations."}
            </p>
          </div>
          <button 
            onClick={onNavigate} 
            className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-lg hover:from-purple-500 hover:to-pink-500 transition-all flex items-center gap-2 shadow-lg"
          >
            <TrendingUp className="w-5 h-5" />
            {language === "bg" ? "Разгледай Trending" : "Browse Trending"}
          </button>
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// ADAPTIVE FOR YOU CAROUSEL
// Shows different title/subtitle based on user state
// ============================================================================

function ForYouCarousel({ recommendations, language, userState }: { recommendations: Recommendation[]; language: string; userState: UserState }) {
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

  // ADAPTIVE TITLE based on user state
  const getSectionInfo = () => {
    if (!userState.hasActivity) {
      // New user - using registration preferences
      return {
        title: language === "bg" ? "За теб" : "For You",
        subtitle: language === "bg" ? "Базирано на твоите предпочитания" : "Based on your preferences"
      };
    }
    // Active user - full personalization
    return {
      title: language === "bg" ? "За теб" : "For You",
      subtitle: language === "bg" ? "Персонализирани препоръки" : "Personalized picks"
    };
  };

  const { title, subtitle } = getSectionInfo();

  const getReason = (rec: Recommendation): string | null => {
    if (!rec.explanation) return null;
    const { reasons, reasons_bg, score_breakdown, based_on, similar_to, genre, mood } = rec.explanation;
    
    let reason = language === "bg" && reasons_bg?.[0] ? reasons_bg[0] : reasons?.[0];
    
    if (reason && (
      reason.toLowerCase().includes("your watched movies") ||
      reason.toLowerCase().includes("вашите гледани филми") ||
      reason === "undefined" ||
      reason.trim() === ""
    )) {
      reason = null;
    }
    
    if (!reason && similar_to) {
      reason = language === "bg" ? `Подобен на ${similar_to}` : `Similar to ${similar_to}`;
    }
    
    if (!reason && based_on && based_on.length > 0) {
      reason = language === "bg" ? `Защото харесахте ${based_on[0]}` : `Because you liked ${based_on[0]}`;
    }
    
    if (!reason && genre) {
      reason = language === "bg" ? `Жанр: ${genre}` : `Genre: ${genre}`;
    }
    
    if (!reason && mood) {
      reason = language === "bg" ? `Настроение: ${mood}` : `Mood: ${mood}`;
    }
    
    if (!reason && score_breakdown) {
      const topEntry = Object.entries(score_breakdown).filter(([, v]) => v > 0.1).sort((a, b) => b[1] - a[1])[0];
      if (topEntry) {
        const labels: Record<string, string> = {
          genre_similarity: language === "bg" ? "Сходен жанр" : "Similar genre",
          director_match: language === "bg" ? "Същият режисьор" : "Same director",
          mood_match: language === "bg" ? "Подходящо настроение" : "Matching mood",
          popularity: language === "bg" ? "Популярен избор" : "Popular choice",
        };
        reason = labels[topEntry[0]] || null;
      }
    }
    
    // For new users, generate preference-based reasons
    if (!reason && !userState.hasActivity) {
      const movieGenre = rec.movie.genre?.split(',')[0]?.trim();
      if (movieGenre) {
        reason = language === "bg" ? `Популярен ${movieGenre.toLowerCase()}` : `Popular ${movieGenre.toLowerCase()}`;
      }
    }
    
    if (!reason && rec.score >= 0.8) {
      reason = language === "bg" ? "Силно препоръчан" : "Highly recommended";
    }
    
    return reason;
  };

  if (!recommendations || recommendations.length < 3) return null;

  return (
    <section className="relative">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500/20 to-pink-500/20">
            <Heart className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h2 className={`text-xl font-bold ${theme === "dark" ? "text-white" : "text-gray-900"}`}>{title}</h2>
            <p className={`text-sm ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>{subtitle}</p>
          </div>
        </div>
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

        <div ref={scrollRef} className="flex gap-4 overflow-x-auto scrollbar-hide pb-6" style={{ scrollSnapType: "x mandatory" }}>
          {recommendations.map((rec, idx) => {
            const movie = rec.movie;
            const movieTitle = language === "bg" ? movie.title_bg || movie.title : movie.title;
            const posterUrl = movie.poster_path ? `https://image.tmdb.org/t/p/w342${movie.poster_path}` : movie.poster_url;
            const reason = getReason(rec);
            const clampedScore = Math.max(0, Math.min(1, Number(rec.score) || 0));
            
            // Honest match % for new users (35-65% range instead of inflated)
            let matchPercent = Math.round(clampedScore * 100);
            if (!userState.hasActivity && matchPercent > 70) {
              matchPercent = Math.round(35 + (clampedScore * 30));
            }

            return (
              <div key={movie.id || idx} onClick={() => navigate(`/movie/${movie.id}`)} className="flex-shrink-0 w-[160px] cursor-pointer group/card" style={{ scrollSnapAlign: "start" }}>
                <div className="relative rounded-lg overflow-hidden shadow-lg">
                  {posterUrl ? (
                    <img src={posterUrl} alt={movieTitle} className="w-full aspect-[2/3] object-cover group-hover/card:scale-105 transition-transform duration-300" loading="lazy" />
                  ) : (
                    <div className={`w-full aspect-[2/3] flex items-center justify-center ${theme === "dark" ? "bg-gray-800" : "bg-gray-200"}`}>
                      <Sparkles className="w-10 h-10 text-gray-500" />
                    </div>
                  )}
                  <div className="absolute top-2 right-2 px-2 py-1 rounded-md bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xs font-bold shadow-lg">
                    {matchPercent}% match
                  </div>
                </div>
                <div className="pt-3 px-1">
                  <h3 className={`font-semibold text-sm line-clamp-1 group-hover/card:text-tmdb-light-blue transition-colors ${theme === "dark" ? "text-white" : "text-gray-900"}`}>{movieTitle}</h3>
                  {reason && <p className="text-xs mt-1.5 italic text-purple-400 line-clamp-2 leading-relaxed">{reason}</p>}
                  {!reason && movie.release_date && <p className={`text-xs mt-1 ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>{new Date(movie.release_date).getFullYear()}</p>}
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
            const tmdbRating = (movie as any).tmdb_rating || 0;
            const communityRating = (movie as any).average_rating || 0;
            const reviewCount = (movie as any).review_count || 0;

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
                  <div className="absolute bottom-2 left-2">
                    <CircularRating rating={tmdbRating} size={36} />
                  </div>
                  {reviewCount > 0 && (
                    <div className="absolute bottom-2 right-2">
                      <CommunityBadge rating={communityRating} count={reviewCount} />
                    </div>
                  )}
                </div>
                <div className="pt-3 px-1">
                  <h3 className={`font-semibold text-sm line-clamp-2 group-hover/card:text-tmdb-light-blue transition-colors ${theme === "dark" ? "text-white" : "text-gray-900"}`}>{movieTitle}</h3>
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

// ============================================================================
// MAIN HOME COMPONENT
// ============================================================================

export default function Home() {
  const { theme, language, isAuthenticated } = useApp();
  const navigate = useNavigate();
  
  const [featuredMovies, setFeaturedMovies] = useState<Movie[]>([]);
  const [trendingMovies, setTrendingMovies] = useState<Movie[]>([]);
  const [topRatedMovies, setTopRatedMovies] = useState<Movie[]>([]);
  const [recentMovies, setRecentMovies] = useState<Movie[]>([]);
  const [forYouRecs, setForYouRecs] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  
  // User state for adaptive For You section
  const [userState, setUserState] = useState<UserState>({
    isLoggedIn: false,
    hasActivity: false,
    personalizedCount: 0
  });

  // Check if recommendation is personalized (not generic)
  const isPersonalized = (rec: Recommendation): boolean => {
    if (!rec.explanation) return false;
    const { based_on, similar_to, reasons, reasons_bg, reason } = rec.explanation as any;
    
    if (reason) {
      const genericReasons = ["popular movie", "trending", "error"];
      if (genericReasons.some(g => reason.toLowerCase().includes(g))) return false;
    }
    
    if (based_on && based_on.length > 0) return true;
    if (similar_to) return true;
    
    const allReasons = [...(reasons || []), ...(reasons_bg || [])];
    const genericPhrases = ["trending", "popular", "top rated", "highly rated", "популярен", "топ"];
    
    if (allReasons.length === 0 && !reason) return false;
    return allReasons.some(r => r && !genericPhrases.some(p => r.toLowerCase().includes(p)));
  };

  // Fetch movies
  useEffect(() => {
    const fetchMovies = async () => {
      setLoading(true);
      try {
        const allMovies = await moviesApi.getAll();
        
        const maxPopularity = Math.max(...allMovies.map((m: any) => Number(m.popularity) || 0), 1);
        const maxReviews = Math.max(...allMovies.map((m: any) => Number(m.review_count) || 0), 1);
        const maxFav = Math.max(...allMovies.map((m: any) => Number(m.favorite_count) || 0), 1);
        const maxComp = Math.max(...allMovies.map((m: any) => Number(m.completed_count) || 0), 1);

        // FEATURED: Best quality with backdrop (70% rating + 30% popularity)
        const featured = [...allMovies]
          .filter((m: any) => m.backdrop_path || m.backdrop_url)
          .sort((a: any, b: any) => {
            const qa = combinedRating01(a, 30);
            const qb = combinedRating01(b, 30);
            const pa = logNorm(Number(a.popularity) || 0, maxPopularity);
            const pb = logNorm(Number(b.popularity) || 0, maxPopularity);
            return (0.7 * qb + 0.3 * pb) - (0.7 * qa + 0.3 * pa);
          })
          .slice(0, 5);
        setFeaturedMovies(featured);

        // ===============================================================
        // TRENDING: Popularity × TIME DECAY + Activity
        // TIME DECAY is the KEY FIX - removes old classics like Shawshank
        // ===============================================================
        const trending = [...allMovies]
          .map((m: any) => {
            const pop = logNorm(Number(m.popularity) || 0, maxPopularity);
            const decay = getTimeDecay(m.release_date);
            const act = 0.50 * logNorm(Number(m.review_count) || 0, maxReviews) +
                       0.30 * logNorm(Number(m.favorite_count) || 0, maxFav) +
                       0.20 * logNorm(Number(m.completed_count) || 0, maxComp);
            const trendingScore = (0.70 * pop * decay) + (0.30 * act);
            return { ...m, _trendingScore: trendingScore, _decay: decay, _pop: pop };
          })
          .sort((a: any, b: any) => b._trendingScore - a._trendingScore)
          .slice(0, 20);
        
        // DEBUG: Log first 5 trending movies to see decay working
        console.log("🔥 TRENDING (with time decay):");
        trending.slice(0, 5).forEach((m: any, i: number) => {
          console.log(`  ${i+1}. ${m.title} (${m.release_date?.slice(0,4) || 'N/A'}) - decay: ${m._decay?.toFixed(2)}, pop: ${m._pop?.toFixed(2)}, score: ${m._trendingScore?.toFixed(3)}`);
        });
        
        setTrendingMovies(trending);

        // TOP RATED: Quality ranking (stable, timeless - NO time decay)
        const topRated = [...allMovies]
          .filter((m: any) => (Number(m.tmdb_rating) || 0) > 0 || (Number(m.average_rating) || 0) > 0)
          .sort((a: any, b: any) => {
            const ra = combinedRating01(a, 30);
            const rb = combinedRating01(b, 30);
            if (rb !== ra) return rb - ra;
            return (Number(b.review_count) || 0) - (Number(a.review_count) || 0);
          })
          .slice(0, 20);
        
        // DEBUG: Log first 5 top rated movies
        console.log("⭐ TOP RATED (no time decay):");
        topRated.slice(0, 5).forEach((m: any, i: number) => {
          console.log(`  ${i+1}. ${m.title} (${m.release_date?.slice(0,4) || 'N/A'}) - rating: ${m.tmdb_rating?.toFixed(1)}`);
        });
        
        setTopRatedMovies(topRated);

        // RECENTLY RELEASED: By release date
        const recent = [...allMovies]
          .filter((m: any) => m.release_date)
          .sort((a: any, b: any) => new Date(b.release_date).getTime() - new Date(a.release_date).getTime())
          .slice(0, 20);
        setRecentMovies(recent);
      } catch (err) {
        console.error("Failed to fetch movies:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchMovies();
  }, []);

  // Fetch For You recommendations
  useEffect(() => {
    const fetchForYou = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        setForYouRecs([]);
        setUserState({ isLoggedIn: false, hasActivity: false, personalizedCount: 0 });
        return;
      }
      
      try {
        const response = await api.get('/ai/recommend/for-me', { params: { top_k: 15 } });
        const recs = response.data || [];
        setForYouRecs(recs);
        
        // Determine user state based on personalization level
        const personalizedCount = recs.filter(isPersonalized).length;
        setUserState({
          isLoggedIn: true,
          hasActivity: personalizedCount >= 3,
          personalizedCount
        });
      } catch (err) {
        console.error("Failed to fetch recommendations:", err);
        setForYouRecs([]);
        setUserState({ isLoggedIn: true, hasActivity: false, personalizedCount: 0 });
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

  // Determine what to show for personalization section
  const showForYou = forYouRecs.length >= 3;
  const showOnboarding = isAuthenticated && !showForYou;

  return (
    <div className={`min-h-screen ${theme === "dark" ? "bg-tmdb-dark" : "bg-gray-50"}`}>
      <HeroCarousel movies={featuredMovies} language={language} />

      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 space-y-10">
        {/* For You - Shows when logged in with recommendations */}
        {showForYou && (
          <ForYouCarousel recommendations={forYouRecs} language={language} userState={userState} />
        )}

        {/* Onboarding Card - Shows when logged in but no recommendations yet */}
        {showOnboarding && (
          <OnboardingCard language={language} theme={theme} onNavigate={() => navigate("/browse")} />
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