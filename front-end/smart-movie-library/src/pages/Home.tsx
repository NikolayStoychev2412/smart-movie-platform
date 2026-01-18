/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useCallback, useRef, type ReactNode } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import type { Movie } from "../types";
import { moviesApi, type RecommendationWithExplanation, type SearchResult } from "../api/movies";
import { useApp } from "../context/AppContext";
import { ChevronLeft, ChevronRight, TrendingUp, Star, Sparkles, Heart } from "lucide-react";

type SearchMode = "ai" | "title";

type HomeProps = {
  isLoggedIn: boolean;
};

const cache = {
  movies: null as Movie[] | null,
  recommendations: null as RecommendationWithExplanation[] | null,
  timestamp: 0,
  TTL: 5 * 60 * 1000,
};

let lastToken: string | null = null;

function CircularRating({ rating, size = 40 }: { rating: number; size?: number }) {
  const percentage = Math.round((rating || 0) * 20);
  const circumference = 2 * Math.PI * 18;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  const getColor = () => {
    if (percentage >= 70) return { stroke: "#21d07a", bg: "#204529" };
    if (percentage >= 50) return { stroke: "#d2d531", bg: "#423d0f" };
    return { stroke: "#db2360", bg: "#571435" };
  };

  const colors = getColor();

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg className="transform -rotate-90" width={size} height={size} viewBox="0 0 40 40">
        <circle cx="20" cy="20" r="18" fill="#081c22" stroke={colors.bg} strokeWidth="3" />
        <circle
          cx="20"
          cy="20"
          r="18"
          fill="none"
          stroke={colors.stroke}
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className="transition-all duration-500"
        />
      </svg>
      <span className="absolute text-white font-bold text-xs">
        {percentage}
        <sup className="text-[6px]">%</sup>
      </span>
    </div>
  );
}

function MovieCardWithReason({
  movie,
  onClick,
  language,
  reason,
}: {
  movie: Movie;
  onClick: () => void;
  language: string;
  reason?: string;
}) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  const title = language === "bg" ? movie.title_bg || movie.title : movie.title;

  const posterUrl = (movie as any).poster_path
    ? `https://image.tmdb.org/t/p/w342${(movie as any).poster_path}`
    : (movie as any).poster_url;

  return (
    <div className="flex-shrink-0 w-[150px] cursor-pointer group" onClick={onClick}>
      <div className="relative rounded-lg overflow-hidden shadow-lg">
        <div className="aspect-[2/3] bg-gray-800 relative">
          {!imageLoaded && !imageError && (
            <div className="absolute inset-0 bg-gradient-to-br from-gray-700 to-gray-800 animate-pulse" />
          )}

          {posterUrl && !imageError ? (
            <img
              src={posterUrl}
              alt={title}
              className={`w-full h-full object-cover transition-all duration-300 group-hover:scale-105 ${
                imageLoaded ? "opacity-100" : "opacity-0"
              }`}
              loading="lazy"
              onLoad={() => setImageLoaded(true)}
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-700 to-gray-900">
              <span className="text-gray-500 text-xs text-center px-2">{title}</span>
            </div>
          )}

          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
        </div>

        <div className="absolute -bottom-4 left-2">
          <CircularRating rating={(movie as any).average_rating ?? 0} size={38} />
        </div>
      </div>

      <div className="mt-6 px-1">
        <h3 className="font-semibold text-sm text-white group-hover:text-tmdb-light-blue transition-colors line-clamp-2">
          {title}
        </h3>

        {reason ? (
          <p className="text-xs text-tmdb-light-green mt-1 line-clamp-3 italic">💡 {reason}</p>
        ) : (
          <p className="text-gray-400 text-xs mt-1">
            {(movie as any).review_count ?? 0} {language === "bg" ? "ревюта" : "reviews"}
          </p>
        )}
      </div>
    </div>
  );
}

function MovieCarousel({
  title,
  movies,
  onMovieClick,
  language,
  icon,
  gradient,
  reasons,
}: {
  title: string;
  movies: Movie[];
  onMovieClick: (movie: Movie) => void;
  language: string;
  icon?: ReactNode;
  gradient?: boolean;
  reasons?: string[];
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScroll = useCallback(() => {
    if (!scrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    setCanScrollLeft(scrollLeft > 0);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
  }, []);

  useEffect(() => {
    checkScroll();
    const ref = scrollRef.current;
    ref?.addEventListener("scroll", checkScroll);
    return () => ref?.removeEventListener("scroll", checkScroll);
  }, [checkScroll, movies]);

  const scroll = (direction: "left" | "right") => {
    if (!scrollRef.current) return;
    const scrollAmount = direction === "left" ? -600 : 600;
    scrollRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
  };

  if (movies.length === 0) return null;

  return (
    <section className={`py-8 ${gradient ? "bg-gradient-to-r from-tmdb-dark-blue to-purple-900/30" : ""}`}>
      <div className="flex items-center gap-4 mb-6 px-6 md:px-10 flex-wrap">
        <div className="flex items-center gap-2">
          {icon}
          <h2 className="text-xl font-semibold text-white">{title}</h2>
        </div>
      </div>

      <div className="relative group/carousel">
        {canScrollLeft && (
          <button
            onClick={() => scroll("left")}
            className="absolute left-2 top-1/3 -translate-y-1/2 z-10 w-10 h-10 bg-black/80 hover:bg-black rounded-full flex items-center justify-center text-white opacity-0 group-hover/carousel:opacity-100 transition-opacity shadow-lg"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
        )}

        {canScrollRight && (
          <button
            onClick={() => scroll("right")}
            className="absolute right-2 top-1/3 -translate-y-1/2 z-10 w-10 h-10 bg-black/80 hover:bg-black rounded-full flex items-center justify-center text-white opacity-0 group-hover/carousel:opacity-100 transition-opacity shadow-lg"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        )}

        <div
          ref={scrollRef}
          className="flex gap-5 overflow-x-auto scrollbar-hide px-6 md:px-10 pb-6"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {movies.map((movie, index) => (
            <MovieCardWithReason
              key={(movie as any).id}
              movie={movie}
              onClick={() => onMovieClick(movie)}
              language={language}
              reason={reasons?.[index]}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

export default function Home({ isLoggedIn }: HomeProps) {
  const navigate = useNavigate();
  const { theme, t, language } = useApp();
  const [params] = useSearchParams();

  const urlQuery = (params.get("q") || "").trim();
  const urlMode = (params.get("mode") === "title" ? "title" : "ai") as SearchMode;

  const [allMovies, setAllMovies] = useState<Movie[]>([]);
  const [recommendations, setRecommendations] = useState<RecommendationWithExplanation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchResults, setSearchResults] = useState<Movie[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [aiSnippets, setAiSnippets] = useState<Record<number, string>>({});

  const showSearchResults = urlQuery.length > 0;

  const fetchMovies = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (token !== lastToken) {
      cache.recommendations = null;
      lastToken = token;
    }

    const now = Date.now();
    if (cache.movies && cache.timestamp && now - cache.timestamp < cache.TTL) {
      setAllMovies(cache.movies);
      if (isLoggedIn && cache.recommendations) setRecommendations(cache.recommendations);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const data = await moviesApi.getAll();
      setAllMovies(data);
      cache.movies = data;
      cache.timestamp = now;

      if (isLoggedIn) {
        try {
          const recs = await moviesApi.getRecommendations(20);
          setRecommendations(recs);
          cache.recommendations = recs;
        } catch (err) {
          console.error("Failed to fetch recommendations:", err);
        }
      }
    } catch (err) {
      setError(t.loadError);
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [isLoggedIn, t.loadError]);

  useEffect(() => {
    fetchMovies();
  }, [fetchMovies]);

  // ✅ URL-driven search
  useEffect(() => {
    const q = urlQuery;
    if (!q) {
      setSearchResults([]);
      setAiSnippets({});
      return;
    }

    setIsSearching(true);

    if (urlMode === "title") {
      const lower = q.toLowerCase();
      const filtered = allMovies.filter((m: any) => {
        const title = (m.title ?? "").toLowerCase();
        const titleBg = (m.title_bg ?? "").toLowerCase();
        return title.includes(lower) || titleBg.includes(lower);
      });

      setSearchResults(filtered);
      setAiSnippets({});
      setIsSearching(false);
      return;
    }

    moviesApi
      .search(q)
      .then((results: SearchResult[]) => {
        setSearchResults(results.map((r) => r.movie));

        const map: Record<number, string> = {};
        results.forEach((r) => {
          map[r.movie.id] = r.snippet || "";
        });
        setAiSnippets(map);
      })
      .catch(() => {
        // fallback
        const lower = q.toLowerCase();
        const filtered = allMovies.filter((m: any) => {
          const title = (m.title ?? "").toLowerCase();
          const titleBg = (m.title_bg ?? "").toLowerCase();
          return title.includes(lower) || titleBg.includes(lower);
        });
        setSearchResults(filtered);
        setAiSnippets({});
      })
      .finally(() => setIsSearching(false));
  }, [urlQuery, urlMode, allMovies]);

  const getTrending = useCallback(() => {
    return [...allMovies].sort((a: any, b: any) => (b.review_count ?? 0) - (a.review_count ?? 0)).slice(0, 20);
  }, [allMovies]);

  const getPopular = useCallback(() => {
    return [...allMovies].sort((a: any, b: any) => (b.average_rating ?? 0) - (a.average_rating ?? 0)).slice(0, 20);
  }, [allMovies]);

  const getTopRated = useCallback(() => {
    return [...allMovies]
      .filter((m: any) => (m.review_count ?? 0) >= 2)
      .sort((a: any, b: any) => (b.average_rating ?? 0) - (a.average_rating ?? 0))
      .slice(0, 20);
  }, [allMovies]);

  const handleMovieClick = (movie: any) => navigate(`/movie/${movie.id}`);

  if (loading && allMovies.length === 0) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${theme === "dark" ? "bg-tmdb-dark" : "bg-gray-100"}`}>
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-tmdb-light-blue border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-400">{language === "bg" ? "Зареждане..." : "Loading..."}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen transition-colors ${theme === "dark" ? "bg-tmdb-dark" : "bg-gray-100"}`}>
      {/* Hero section only shows when NOT searching */}
      {!showSearchResults && (
        <section className="relative h-[260px] md:h-[320px] overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-tmdb-dark-blue via-tmdb-dark-blue/90 to-tmdb-dark-blue/60" />
          <div className="absolute inset-0 bg-gradient-to-t from-tmdb-dark via-transparent to-transparent" />
          <div className="relative h-full flex flex-col justify-center px-6 md:px-10 max-w-7xl mx-auto">
            <h1 className="text-3xl md:text-5xl font-bold text-white mb-2">{t.heroTitle}</h1>
            <p className="text-lg md:text-xl text-tmdb-light-blue font-medium mb-2">{t.heroHighlight}</p>
            <p className="text-gray-300">{t.heroSubtitle}</p>
            <p className="text-gray-400 text-xs md:text-sm mt-4 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-tmdb-light-blue" />
              {t.searchHint}
            </p>
          </div>
        </section>
      )}

      {/* Search Results (URL-driven) */}
      {showSearchResults && (
        <section className={`py-8 px-6 md:px-10 ${theme === "dark" ? "bg-gray-900/50" : "bg-gray-200"}`}>
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
              <div>
                <h2 className={`text-xl font-semibold ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
                  {t.resultsFor} "{urlQuery}" ({searchResults.length})
                </h2>

                <div className="mt-2 inline-flex items-center gap-2 text-xs">
                  <span className={`px-2 py-1 rounded-full ${
                    urlMode === "ai" ? "bg-gradient-to-r from-tmdb-light-green to-tmdb-light-blue text-tmdb-dark-blue" : "bg-white/10 text-gray-200"
                  }`}>
                    {urlMode === "ai" ? "AI" : language === "bg" ? "Нормално" : "Normal"}
                  </span>
                  <span className="text-gray-400">
                    {urlMode === "ai"
                      ? (language === "bg" ? "Семантично търсене + обяснения" : "Semantic search + explanations")
                      : (language === "bg" ? "Търсене по заглавие" : "Title match")}
                  </span>
                </div>
              </div>

              <button onClick={() => navigate("/")} className="text-tmdb-light-blue hover:underline text-sm">
                {language === "bg" ? "Изчисти търсенето" : "Clear search"}
              </button>
            </div>

            {isSearching ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 border-4 border-tmdb-light-blue border-t-transparent rounded-full animate-spin" />
              </div>
            ) : searchResults.length === 0 ? (
              <p className="text-gray-400 text-center py-12">{t.noMoviesFound}</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-5">
                {searchResults.map((movie: any) => (
                  <MovieCardWithReason
                    key={movie.id}
                    movie={movie}
                    onClick={() => handleMovieClick(movie)}
                    language={language}
                    reason={urlMode === "ai" ? aiSnippets[movie.id] : undefined}
                  />
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* Main content */}
      {!showSearchResults && (
        <>
          {error && (
            <div className="px-6 md:px-10 py-4 max-w-7xl mx-auto">
              <div className={`rounded-lg p-4 ${
                theme === "dark" ? "bg-red-500/10 border border-red-500/20" : "bg-red-50 border border-red-200"
              }`}>
                <p className="text-red-400">{error}</p>
                <button onClick={fetchMovies} className="text-red-400 underline text-sm mt-2">
                  {t.tryAgain}
                </button>
              </div>
            </div>
          )}

          {isLoggedIn && recommendations.length > 0 && (
            <MovieCarousel
              title={language === "bg" ? "✨ Препоръчано за теб" : "✨ Recommended For You"}
              movies={recommendations.map((r) => r.movie)}
              onMovieClick={handleMovieClick}
              language={language}
              icon={<Heart className="w-5 h-5 text-tmdb-red fill-tmdb-red" />}
              gradient
              reasons={recommendations.map((r) => {
                const primaryReason =
                  language === "bg"
                    ? r.explanation.reasons_bg?.[0] || r.explanation.reasons[0]
                    : r.explanation.reasons[0];
                return primaryReason;
              })}
            />
          )}

          <MovieCarousel
            title={language === "bg" ? "Популярни" : "Trending"}
            movies={getTrending()}
            onMovieClick={handleMovieClick}
            language={language}
            icon={<TrendingUp className="w-5 h-5 text-tmdb-light-blue" />}
          />

          <MovieCarousel
            title={language === "bg" ? "Популярни филми" : "What's Popular"}
            movies={getPopular()}
            onMovieClick={handleMovieClick}
            language={language}
            icon={<Star className="w-5 h-5 text-yellow-500" />}
            gradient
          />

          <MovieCarousel
            title={language === "bg" ? "Най-високо оценени" : "Top Rated"}
            movies={getTopRated()}
            onMovieClick={handleMovieClick}
            language={language}
            icon={<Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />}
          />

          {!isLoggedIn && (
            <section className="py-12 px-6 md:px-10">
              <div className="max-w-4xl mx-auto text-center bg-gradient-to-r from-tmdb-light-blue/20 to-tmdb-light-green/20 rounded-2xl p-8 md:p-12">
                <h2 className={`text-2xl md:text-3xl font-bold mb-4 ${
                  theme === "dark" ? "text-white" : "text-gray-900"
                }`}>
                  {language === "bg" ? "Присъедини се към общността" : "Join The Community"}
                </h2>
                <p className={`mb-6 leading-relaxed ${
                  theme === "dark" ? "text-gray-300" : "text-gray-600"
                }`}>
                  {language === "bg"
                    ? "Регистрирай се безплатно и започни да следиш любимите си филми, да оставяш ревюта и да откриваш нови заглавия с помощта на AI."
                    : "Sign up for free and start tracking your favorite movies, leave reviews, and discover new titles with the help of AI."}
                </p>
                <button
                  onClick={() => navigate("/register")}
                  className="px-8 py-3 bg-gradient-to-r from-tmdb-light-green to-tmdb-light-blue text-tmdb-dark-blue font-semibold rounded-full hover:opacity-90 transition-opacity"
                >
                  {t.register}
                </button>
              </div>
            </section>
          )}
        </>
      )}

      <footer className={`border-t py-8 px-6 md:px-10 ${theme === "dark" ? "border-gray-800" : "border-gray-200"}`}>
        <div className={`max-w-7xl mx-auto text-center text-sm ${theme === "dark" ? "text-gray-500" : "text-gray-600"}`}>
          <p>{t.footerTitle}</p>
          <p className="mt-1">{t.footerPowered}</p>
        </div>
      </footer>
    </div>
  );
}
