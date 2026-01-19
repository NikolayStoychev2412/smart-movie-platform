import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { moviesApi } from "../api/movies";
import type { Movie, Review } from "../types";
import { 
  Star, Calendar, Clock, Heart, Bookmark, ChevronLeft, ChevronRight, 
  User, Building2, Film, Play, ExternalLink
} from "lucide-react";

interface CastMember {
  id: number;
  name: string;
  character?: string;
  profile_path?: string;
  order?: number;
}

interface CrewMember {
  id: number;
  name: string;
  job: string;
  department: string;
  profile_path?: string;
}

interface Video {
  id: string;
  key: string;
  name: string;
  site: string;
  type: string;
}

interface ProductionCompany {
  id: number;
  name: string;
  logo_path?: string;
  origin_country?: string;
}

// Extended movie type matching your backend's full response
interface MovieDetail extends Movie {
  cast?: CastMember[];
  crew?: CrewMember[];
  videos?: Video[];
  trailer_youtube_key?: string;
  trailer_url?: string;
  trailer_embed_url?: string;
  main_actors?: string[];
  budget_formatted?: string;
  revenue_formatted?: string;
  runtime_formatted?: string;
  poster_url_large?: string;
  poster_url_small?: string;
  backdrop_url_large?: string;
  genres?: { id: number; name: string }[];
  homepage?: string;
  tmdb_rating?: number;
  tmdb_vote_count?: number;
  production_companies?: ProductionCompany[];
  production_countries?: { iso_3166_1: string; name: string }[];
  spoken_languages?: { iso_639_1: string; name: string }[];
  belongs_to_collection?: { id: number; name: string; poster_path?: string };
  adult?: boolean;
  imdb_id?: string;
  original_title?: string;
}

function CircularRating({ rating, size = 60 }: { rating: number; size?: number }) {
  const normalizedRating = rating > 10 ? rating / 10 : rating;
  const percentage = Math.round((normalizedRating || 0) * 10);
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;
  
  const getColor = () => {
    if (percentage >= 70) return { stroke: "#21d07a", bg: "#204529" };
    if (percentage >= 50) return { stroke: "#d2d531", bg: "#423d0f" };
    return { stroke: "#db2360", bg: "#571435" };
  };
  const colors = getColor();
  
  return (
    <div className="relative flex items-center justify-center rounded-full flex-shrink-0" 
      style={{ width: size, height: size, backgroundColor: "#081c22" }}>
      <svg className="transform -rotate-90" width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="#081c22" stroke={colors.bg} strokeWidth="4" />
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={colors.stroke} strokeWidth="4" 
          strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} />
      </svg>
      <span className="absolute text-white font-bold" style={{ fontSize: size * 0.3 }}>
        {percentage}<sup style={{ fontSize: size * 0.15 }}>%</sup>
      </span>
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

  const scroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: direction === "left" ? -320 : 320, behavior: "smooth" });
      setTimeout(checkScroll, 350);
    }
  };

  useEffect(() => {
    checkScroll();
    const ref = scrollRef.current;
    if (ref) {
      ref.addEventListener("scroll", checkScroll);
      window.addEventListener("resize", checkScroll);
      return () => {
        ref.removeEventListener("scroll", checkScroll);
        window.removeEventListener("resize", checkScroll);
      };
    }
  }, [cast]);

  if (!cast || cast.length === 0) {
    return (
      <div className={`text-center py-12 rounded-lg ${theme === "dark" ? "bg-gray-900 text-gray-500" : "bg-gray-100 text-gray-400"}`}>
        <User className="w-16 h-16 mx-auto mb-3 opacity-50" />
        <p className="text-lg">{language === "bg" ? "Няма информация за актьорите" : "No cast information available"}</p>
      </div>
    );
  }

  const sortedCast = [...cast].sort((a, b) => (a.order ?? 999) - (b.order ?? 999)).slice(0, 15);

  return (
    <div className="relative">
      {canScrollLeft && (
        <button onClick={() => scroll("left")} 
          className={`absolute left-0 top-1/2 -translate-y-1/2 z-20 p-2 rounded-full shadow-xl hover:scale-110 transition-all ${
            theme === "dark" ? "bg-gray-800 text-white" : "bg-white text-gray-800 border border-gray-200"
          }`} style={{ marginTop: "-20px" }}>
          <ChevronLeft className="w-6 h-6" />
        </button>
      )}
      {canScrollRight && (
        <button onClick={() => scroll("right")} 
          className={`absolute right-0 top-1/2 -translate-y-1/2 z-20 p-2 rounded-full shadow-xl hover:scale-110 transition-all ${
            theme === "dark" ? "bg-gray-800 text-white" : "bg-white text-gray-800 border border-gray-200"
          }`} style={{ marginTop: "-20px" }}>
          <ChevronRight className="w-6 h-6" />
        </button>
      )}
      
      <div ref={scrollRef} className="flex gap-4 pb-4"
        style={{ overflowX: "auto", scrollbarWidth: "none", msOverflowStyle: "none", scrollSnapType: "x mandatory" }}>
        {sortedCast.map((actor, index) => {
          const profileUrl = actor.profile_path 
            ? `https://image.tmdb.org/t/p/w185${actor.profile_path}` 
            : null;
          return (
            <div key={actor.id || `actor-${index}`} 
              className={`flex-shrink-0 w-[150px] rounded-lg overflow-hidden shadow-lg hover:scale-105 transition-transform ${
                theme === "dark" ? "bg-gray-900" : "bg-white border border-gray-200"
              }`} style={{ scrollSnapAlign: "start" }}>
              <div className="aspect-[2/3] relative">
                {profileUrl ? (
                  <img src={profileUrl} alt={actor.name} className="w-full h-full object-cover" loading="lazy" />
                ) : (
                  <div className={`w-full h-full flex items-center justify-center ${theme === "dark" ? "bg-gray-800" : "bg-gray-200"}`}>
                    <User className={`w-16 h-16 ${theme === "dark" ? "text-gray-600" : "text-gray-400"}`} />
                  </div>
                )}
              </div>
              <div className="p-3">
                <p className={`font-semibold text-sm truncate ${theme === "dark" ? "text-white" : "text-gray-900"}`}>{actor.name}</p>
                {actor.character && (
                  <p className={`text-xs mt-1 truncate ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>{actor.character}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function FactsPanel({ movie, theme, language }: { movie: MovieDetail; theme: string; language: string }) {
  // Get director - try multiple sources
  const director = movie.director || movie.crew?.find(c => c.job === "Director")?.name;
  
  // Get writers from crew
  const writers = movie.crew?.filter(c => 
    c.job === "Writer" || c.job === "Screenplay" || c.job === "Story" || c.department === "Writing"
  ).slice(0, 2);

  // Format currency helper
  const formatMoney = (amount?: number) => {
    if (!amount || amount === 0) return null;
    if (amount >= 1e9) return `$${(amount / 1e9).toFixed(1)}B`;
    if (amount >= 1e6) return `$${(amount / 1e6).toFixed(0)}M`;
    return `$${amount.toLocaleString()}`;
  };

  const facts: { label: string; value: string | null | undefined }[] = [];
  
  if (movie.status) {
    facts.push({ label: language === "bg" ? "Статус" : "Status", value: movie.status });
  }
  
  if (movie.original_language) {
    facts.push({ label: language === "bg" ? "Оригинален език" : "Original Language", value: movie.original_language.toUpperCase() });
  }
  
  // Use pre-formatted or format ourselves
  const budgetStr = movie.budget_formatted || formatMoney(movie.budget);
  if (budgetStr) facts.push({ label: language === "bg" ? "Бюджет" : "Budget", value: budgetStr });
  
  const revenueStr = movie.revenue_formatted || formatMoney(movie.revenue);
  if (revenueStr) facts.push({ label: language === "bg" ? "Приходи" : "Revenue", value: revenueStr });

  const hasContent = director || (writers && writers.length > 0) || facts.length > 0 || 
    (movie.production_companies && movie.production_companies.length > 0);
  
  if (!hasContent) return null;

  return (
    <div className={`rounded-lg p-5 ${theme === "dark" ? "bg-gray-900" : "bg-white border border-gray-200 shadow-sm"}`}>
      <h3 className={`font-bold text-lg mb-4 ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
        {language === "bg" ? "Информация" : "Facts"}
      </h3>
      <div className="space-y-4">
        {director && (
          <div>
            <p className={`text-sm font-medium ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>
              {language === "bg" ? "Режисьор" : "Director"}
            </p>
            <p className={`font-medium mt-0.5 ${theme === "dark" ? "text-white" : "text-gray-900"}`}>{director}</p>
          </div>
        )}
        
        {writers && writers.length > 0 && (
          <div>
            <p className={`text-sm font-medium ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>
              {language === "bg" ? "Сценарист" : "Writer"}
            </p>
            <p className={`font-medium mt-0.5 ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
              {writers.map(w => w.name).join(", ")}
            </p>
          </div>
        )}
        
        {facts.map((fact, i) => fact.value && (
          <div key={i}>
            <p className={`text-sm font-medium ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>{fact.label}</p>
            <p className={`font-medium mt-0.5 ${theme === "dark" ? "text-white" : "text-gray-900"}`}>{fact.value}</p>
          </div>
        ))}
        
        {movie.production_companies && movie.production_companies.length > 0 && (
          <div>
            <p className={`text-sm font-medium mb-2 ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>
              {language === "bg" ? "Продукция" : "Production"}
            </p>
            <div className="space-y-2">
              {movie.production_companies.slice(0, 3).map((c, idx) => (
                <div key={c.id || idx} className="flex items-center gap-2">
                  {c.logo_path ? (
                    <img src={`https://image.tmdb.org/t/p/w92${c.logo_path}`} alt={c.name} 
                      className={`h-6 w-auto object-contain ${theme === "dark" ? "" : "filter brightness-0"}`} />
                  ) : (
                    <Building2 className={`w-5 h-5 flex-shrink-0 ${theme === "dark" ? "text-gray-500" : "text-gray-400"}`} />
                  )}
                  <span className={`text-sm ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}>{c.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {movie.homepage && (
          <a href={movie.homepage} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2 text-tmdb-light-blue hover:underline text-sm mt-4">
            <ExternalLink className="w-4 h-4" />
            {language === "bg" ? "Официален сайт" : "Official Website"}
          </a>
        )}
      </div>
    </div>
  );
}

function TrailerSection({ movie, theme, language }: { movie: MovieDetail; theme: string; language: string }) {
  const [showTrailer, setShowTrailer] = useState(false);
  
  // Try multiple ways to get trailer key
  const trailerKey = movie.trailer_youtube_key || 
    movie.videos?.find(v => v.type === "Trailer" && v.site === "YouTube")?.key ||
    movie.videos?.find(v => v.site === "YouTube")?.key;
  
  if (!trailerKey) return null;

  const embedUrl = movie.trailer_embed_url || `https://www.youtube.com/embed/${trailerKey}`;

  return (
    <section>
      <h3 className={`text-xl font-bold mb-4 ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
        {language === "bg" ? "Трейлър" : "Trailer"}
      </h3>
      {showTrailer ? (
        <div className="relative aspect-video rounded-lg overflow-hidden bg-black">
          <iframe src={`${embedUrl}?autoplay=1`} title="Trailer"
            className="w-full h-full" 
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
            allowFullScreen />
        </div>
      ) : (
        <button onClick={() => setShowTrailer(true)}
          className={`relative w-full aspect-video rounded-lg overflow-hidden group ${theme === "dark" ? "bg-gray-900" : "bg-gray-200"}`}>
          <img 
            src={`https://img.youtube.com/vi/${trailerKey}/maxresdefault.jpg`} 
            alt="Trailer thumbnail"
            className="w-full h-full object-cover"
            onError={(e) => { (e.target as HTMLImageElement).src = `https://img.youtube.com/vi/${trailerKey}/hqdefault.jpg`; }} 
          />
          <div className="absolute inset-0 bg-black/40 group-hover:bg-black/50 flex items-center justify-center transition-colors">
            <div className="w-20 h-20 rounded-full bg-white/90 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Play className="w-10 h-10 text-tmdb-dark-blue ml-1" fill="currentColor" />
            </div>
          </div>
        </button>
      )}
    </section>
  );
}

function RecommendationsSection({ movies, theme, language, title }: { 
  movies: Movie[]; theme: string; language: string; title: string 
}) {
  const navigate = useNavigate();
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

  const scroll = (d: "left" | "right") => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: d === "left" ? -320 : 320, behavior: "smooth" });
      setTimeout(checkScroll, 350);
    }
  };

  useEffect(() => {
    checkScroll();
    const ref = scrollRef.current;
    if (ref) {
      ref.addEventListener("scroll", checkScroll);
      return () => ref.removeEventListener("scroll", checkScroll);
    }
  }, [movies]);

  if (!movies || movies.length === 0) return null;

  return (
    <section className="relative">
      <h3 className={`text-xl font-bold mb-4 ${theme === "dark" ? "text-white" : "text-gray-900"}`}>{title}</h3>
      
      {canScrollLeft && (
        <button onClick={() => scroll("left")} 
          className={`absolute left-0 top-1/2 z-20 p-2 rounded-full shadow-xl ${
            theme === "dark" ? "bg-gray-800 text-white" : "bg-white text-gray-800 border"
          }`} style={{ marginTop: "20px" }}>
          <ChevronLeft className="w-6 h-6" />
        </button>
      )}
      {canScrollRight && (
        <button onClick={() => scroll("right")} 
          className={`absolute right-0 top-1/2 z-20 p-2 rounded-full shadow-xl ${
            theme === "dark" ? "bg-gray-800 text-white" : "bg-white text-gray-800 border"
          }`} style={{ marginTop: "20px" }}>
          <ChevronRight className="w-6 h-6" />
        </button>
      )}
      
      <div ref={scrollRef} className="flex gap-4 pb-4" 
        style={{ overflowX: "auto", scrollbarWidth: "none", scrollSnapType: "x mandatory" }}>
        {movies.map((movie, idx) => {
          const movieTitle = language === "bg" ? movie.title_bg || movie.title : movie.title;
          const posterUrl = movie.poster_path 
            ? `https://image.tmdb.org/t/p/w342${movie.poster_path}` 
            : movie.poster_url;
          
          return (
            <div key={movie.id || idx} onClick={() => navigate(`/movie/${movie.id}`)} 
              className="flex-shrink-0 w-[180px] cursor-pointer group" style={{ scrollSnapAlign: "start" }}>
              <div className="relative rounded-lg overflow-hidden shadow-lg">
                {posterUrl ? (
                  <img src={posterUrl} alt={movieTitle} 
                    className="w-full aspect-[2/3] object-cover group-hover:scale-105 transition-transform" />
                ) : (
                  <div className={`w-full aspect-[2/3] flex items-center justify-center ${
                    theme === "dark" ? "bg-gray-800" : "bg-gray-200"
                  }`}>
                    <Film className="w-12 h-12 text-gray-500" />
                  </div>
                )}
                <div className="absolute -bottom-4 left-2">
                  <CircularRating rating={movie.average_rating ?? 0} size={38} />
                </div>
              </div>
              <div className="pt-6 px-1">
                <p className={`font-semibold text-sm line-clamp-2 group-hover:text-tmdb-light-blue transition-colors ${
                  theme === "dark" ? "text-white" : "text-gray-900"
                }`}>
                  {movieTitle}
                </p>
                {movie.release_date && (
                  <p className={`text-xs mt-1 ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>
                    {new Date(movie.release_date).getFullYear()}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function ReviewCard({ review, theme, language }: { review: Review; theme: string; language: string }) {
  const [expanded, setExpanded] = useState(false);
  const content = review.content || review.review_text || "";
  const isLong = content.length > 300;
  
  return (
    <div className={`p-5 rounded-lg ${theme === "dark" ? "bg-gray-900" : "bg-white border border-gray-200"}`}>
      <div className="flex items-start gap-4">
        <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
          theme === "dark" ? "bg-tmdb-light-blue/20" : "bg-tmdb-light-blue/10"
        }`}>
          <User className="w-6 h-6 text-tmdb-light-blue" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <span className={`font-semibold ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
              {review.author || review.user_name || (language === "bg" ? "Анонимен" : "Anonymous")}
            </span>
            {review.rating && (
              <span className={`flex items-center gap-1 px-2 py-0.5 rounded text-sm ${
                theme === "dark" ? "bg-yellow-500/20 text-yellow-400" : "bg-yellow-100 text-yellow-700"
              }`}>
                <Star className="w-4 h-4 fill-current" />{review.rating}/10
              </span>
            )}
          </div>
          <p className={`mt-3 leading-relaxed ${theme === "dark" ? "text-gray-300" : "text-gray-600"}`}>
            {isLong && !expanded ? `${content.slice(0, 300)}...` : content}
          </p>
          {isLong && (
            <button onClick={() => setExpanded(!expanded)} className="text-tmdb-light-blue font-medium mt-3 hover:underline">
              {expanded ? (language === "bg" ? "По-малко" : "Show less") : (language === "bg" ? "Повече" : "Read more")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function MovieDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { theme, language } = useApp();

  const [movie, setMovie] = useState<MovieDetail | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [recommendations, setRecommendations] = useState<Movie[]>([]);
  const [similarMovies, setSimilarMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [isWatchlist, setIsWatchlist] = useState(false);

  useEffect(() => {
    const fetchMovieDetails = async () => {
      if (!id) return;
      setLoading(true);
      setError(null);
      
      try {
        // Main movie fetch - this returns MovieDetailOut with everything embedded
        console.log("[MovieDetails] Fetching movie:", id);
        const movieData = await moviesApi.getById(parseInt(id));
        
        // Log full response for debugging
        console.log("[MovieDetails] Full response:", JSON.stringify(movieData, null, 2));
        console.log("[MovieDetails] Cast array:", movieData.cast);
        console.log("[MovieDetails] Crew array:", movieData.crew);
        console.log("[MovieDetails] Director field:", movieData.director);
        console.log("[MovieDetails] Videos array:", movieData.videos);
        console.log("[MovieDetails] Trailer key:", movieData.trailer_youtube_key);
        console.log("[MovieDetails] Production companies:", movieData.production_companies);
        
        setMovie(movieData as MovieDetail);
        
        // Fetch additional data
        try {
          const reviewsData = await moviesApi.getReviews(parseInt(id));
          setReviews(Array.isArray(reviewsData) ? reviewsData : []);
        } catch { setReviews([]); }
        
        try {
          const recsData = await moviesApi.getRecommendations(parseInt(id));
          setRecommendations(Array.isArray(recsData) ? recsData.slice(0, 10) : []);
        } catch { setRecommendations([]); }
        
        try {
          const similarData = await moviesApi.getSimilar(parseInt(id));
          setSimilarMovies(Array.isArray(similarData) ? similarData.slice(0, 10) : []);
        } catch { setSimilarMovies([]); }
        
      } catch (err) {
        console.error("[MovieDetails] Error:", err);
        setError(language === "bg" ? "Грешка при зареждане" : "Failed to load movie");
      } finally {
        setLoading(false);
      }
    };
    
    fetchMovieDetails();
  }, [id, language]);

  // Loading state
  if (loading) {
    return (
      <div className={`min-h-screen ${theme === "dark" ? "bg-tmdb-dark" : "bg-gray-50"}`}>
        <div className="animate-pulse">
          <div className={`h-[500px] ${theme === "dark" ? "bg-gray-800" : "bg-gray-300"}`} />
          <div className="max-w-7xl mx-auto px-4 py-8">
            <div className={`h-8 w-1/3 rounded ${theme === "dark" ? "bg-gray-700" : "bg-gray-200"}`} />
            <div className="flex gap-4 mt-8" style={{ overflow: "hidden" }}>
              {[1,2,3,4,5].map(i => (
                <div key={i} className={`w-[150px] h-[280px] rounded-lg flex-shrink-0 ${
                  theme === "dark" ? "bg-gray-700" : "bg-gray-200"
                }`} />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !movie) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${theme === "dark" ? "bg-tmdb-dark" : "bg-gray-50"}`}>
        <div className="text-center">
          <Film className={`w-20 h-20 mx-auto mb-4 ${theme === "dark" ? "text-gray-600" : "text-gray-400"}`} />
          <p className={`text-xl ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}>
            {error || (language === "bg" ? "Филмът не е намерен" : "Movie not found")}
          </p>
          <button onClick={() => navigate(-1)} 
            className="mt-4 px-6 py-2 bg-tmdb-light-blue text-tmdb-dark-blue rounded-lg font-medium">
            {language === "bg" ? "Назад" : "Go Back"}
          </button>
        </div>
      </div>
    );
  }

  // Compute display values with multiple fallbacks
  const title = language === "bg" ? (movie.title_bg || movie.title) : movie.title;
  const summary = language === "bg" ? (movie.summary_bg || movie.summary) : movie.summary;
  const tagline = language === "bg" ? (movie.tagline_bg || movie.tagline) : movie.tagline;
  const genre = language === "bg" ? (movie.genre_bg || movie.genre) : movie.genre;
  
  // Image URLs with multiple fallbacks
  const backdropUrl = movie.backdrop_url_large || movie.backdrop_url || 
    (movie.backdrop_path ? `https://image.tmdb.org/t/p/w1280${movie.backdrop_path}` : null);
  const posterUrl = movie.poster_url_large || movie.poster_url || 
    (movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : null);
  
  // Release info
  const releaseYear = movie.release_year || (movie.release_date ? new Date(movie.release_date).getFullYear() : null);
  
  // Runtime - use pre-formatted or calculate
  const runtimeDisplay = movie.runtime_formatted || 
    (movie.runtime ? `${Math.floor(movie.runtime / 60)}h ${movie.runtime % 60}m` : null);
  
  // Director - try multiple sources
  const director = movie.director || movie.crew?.find(c => c.job === "Director")?.name;
  
  // Cast from embedded data
  const cast = movie.cast || [];
  
  // Rating - prefer our rating, fall back to TMDB
  const rating = movie.average_rating || movie.tmdb_rating || 0;

  return (
    <div className={`min-h-screen ${theme === "dark" ? "bg-tmdb-dark" : "bg-gray-50"}`}>
      {/* Hero Section */}
      <div className="relative">
        <div className="absolute inset-0 h-[500px] md:h-[600px]" style={{ overflow: "hidden" }}>
          {backdropUrl ? (
            <img src={backdropUrl} alt={title} className="w-full h-full object-cover object-top" />
          ) : (
            <div className={`w-full h-full ${theme === "dark" ? "bg-gray-800" : "bg-gray-300"}`} />
          )}
          <div className="absolute inset-0 bg-gradient-to-r from-black/95 via-black/70 to-black/30" />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent" />
        </div>
        
        <div className="relative z-10 max-w-7xl mx-auto px-4 md:px-8 pt-8 pb-16">
          <div className="flex flex-col md:flex-row gap-8">
            {/* Poster */}
            <div className="w-full max-w-[300px] md:w-[300px] mx-auto md:mx-0 flex-shrink-0">
              <div className="rounded-xl shadow-2xl" style={{ overflow: "hidden" }}>
                {posterUrl ? (
                  <img src={posterUrl} alt={title} className="w-full aspect-[2/3] object-cover" />
                ) : (
                  <div className="w-full aspect-[2/3] bg-gray-700 flex items-center justify-center">
                    <Film className="w-16 h-16 text-gray-500" />
                  </div>
                )}
              </div>
            </div>
            
            {/* Movie Info */}
            <div className="flex-1 text-white">
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold">
                {title}
                {releaseYear && <span className="font-normal text-gray-300 ml-3">({releaseYear})</span>}
              </h1>
              
              {/* Meta line */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-4 text-sm text-gray-300">
                {movie.release_date && (
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-4 h-4" />
                    {new Date(movie.release_date).toLocaleDateString(language === "bg" ? "bg-BG" : "en-US")}
                  </span>
                )}
                {genre && <span className="px-2 py-0.5 bg-white/10 rounded">{genre}</span>}
                {runtimeDisplay && (
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-4 h-4" />{runtimeDisplay}
                  </span>
                )}
              </div>
              
              {/* Rating & Actions */}
              <div className="flex items-center gap-6 mt-6">
                <div className="flex items-center gap-3">
                  <CircularRating rating={rating} size={70} />
                  <div>
                    <p className="font-semibold text-lg">{language === "bg" ? "Рейтинг" : "User"}</p>
                    <p className="text-sm text-gray-400">{language === "bg" ? "от потребители" : "Score"}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <button onClick={() => setIsFavorite(!isFavorite)} 
                    className={`p-3 rounded-full transition-all ${
                      isFavorite ? "bg-pink-500 text-white" : "bg-tmdb-dark-blue/80 text-gray-300 hover:text-white"
                    }`}>
                    <Heart className={`w-5 h-5 ${isFavorite ? "fill-current" : ""}`} />
                  </button>
                  <button onClick={() => setIsWatchlist(!isWatchlist)} 
                    className={`p-3 rounded-full transition-all ${
                      isWatchlist ? "bg-tmdb-light-blue text-tmdb-dark-blue" : "bg-tmdb-dark-blue/80 text-gray-300 hover:text-white"
                    }`}>
                    <Bookmark className={`w-5 h-5 ${isWatchlist ? "fill-current" : ""}`} />
                  </button>
                </div>
              </div>
              
              {/* Tagline */}
              {tagline && <p className="text-gray-400 italic text-lg mt-6">{tagline}</p>}
              
              {/* Overview */}
              <div className="mt-6">
                <h3 className="text-xl font-semibold mb-2">{language === "bg" ? "Резюме" : "Overview"}</h3>
                {summary ? (
                  <p className="text-gray-200 leading-relaxed max-w-3xl">{summary}</p>
                ) : (
                  <p className="text-gray-500 italic">{language === "bg" ? "Няма резюме" : "No overview available"}</p>
                )}
              </div>
              
              {/* Director in hero */}
              {director && (
                <div className="mt-6 pt-6 border-t border-white/10">
                  <p className="font-semibold text-lg">{director}</p>
                  <p className="text-sm text-gray-400">{language === "bg" ? "Режисьор" : "Director"}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Main Content */}
      <div className={theme === "dark" ? "bg-tmdb-dark" : "bg-gray-50"}>
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-10">
          <div className="flex flex-col lg:flex-row gap-10">
            {/* Left Column */}
            <div className="flex-1 min-w-0 space-y-12">
              {/* Cast Section */}
              <section>
                <h2 className={`text-2xl font-bold mb-5 ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
                  {language === "bg" ? "Актьорски състав" : "Top Billed Cast"}
                </h2>
                <CastCarousel cast={cast} theme={theme} language={language} />
              </section>
              
              {/* Trailer Section */}
              <TrailerSection movie={movie} theme={theme} language={language} />
              
              {/* Reviews Section */}
              {reviews.length > 0 && (
                <section>
                  <h2 className={`text-2xl font-bold mb-5 ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
                    {language === "bg" ? "Ревюта" : "Reviews"} ({reviews.length})
                  </h2>
                  <div className="space-y-4">
                    {reviews.slice(0, 3).map((r, i) => (
                      <ReviewCard key={r.id || i} review={r} theme={theme} language={language} />
                    ))}
                  </div>
                </section>
              )}
              
              {/* Recommendations */}
              {recommendations.length > 0 && (
                <RecommendationsSection 
                  movies={recommendations} 
                  theme={theme} 
                  language={language} 
                  title={language === "bg" ? "Препоръки" : "Recommendations"} 
                />
              )}
              
              {/* Similar Movies */}
              {similarMovies.length > 0 && (
                <RecommendationsSection 
                  movies={similarMovies} 
                  theme={theme} 
                  language={language} 
                  title={language === "bg" ? "Подобни филми" : "Similar Movies"} 
                />
              )}
            </div>
            
            {/* Right Column - Sidebar */}
            <aside className="lg:w-[320px] flex-shrink-0">
              <div className="lg:sticky lg:top-24">
                <FactsPanel movie={movie} theme={theme} language={language} />
              </div>
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
}