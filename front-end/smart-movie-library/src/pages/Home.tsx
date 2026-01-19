import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { moviesApi } from "../api/movies";
import type { Movie } from "../types";
import { 
  ChevronLeft, 
  ChevronRight, 
  Play, 
  TrendingUp, 
  Star,
  Calendar,
  Sparkles
} from "lucide-react";

function CircularRating({ rating, size = 44 }: { rating: number; size?: number }) {
  const percentage = Math.round((rating || 0) * 10);
  const radius = (size - 6) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  const getColor = () => {
    if (percentage >= 70) return { stroke: "#21d07a", bg: "#204529" };
    if (percentage >= 50) return { stroke: "#d2d531", bg: "#423d0f" };
    return { stroke: "#db2360", bg: "#571435" };
  };

  const colors = getColor();

  return (
    <div
      className="relative flex items-center justify-center rounded-full"
      style={{ width: size, height: size, backgroundColor: "#081c22" }}
    >
      <svg className="transform -rotate-90" width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="#081c22" stroke={colors.bg} strokeWidth="3" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={colors.stroke}
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
        />
      </svg>
      <span className="absolute text-white font-bold" style={{ fontSize: size * 0.28 }}>
        {percentage}
        <sup style={{ fontSize: size * 0.14 }}>%</sup>
      </span>
    </div>
  );
}

function HeroCarousel({ movies, language }: { movies: Movie[]; language: string }) {
  const navigate = useNavigate();
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (movies.length === 0) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % movies.length);
    }, 8000);
    return () => clearInterval(interval);
  }, [movies.length]);

  if (movies.length === 0) return null;

  const movie = movies[currentIndex];
  const title = language === "bg" ? movie.title_bg || movie.title : movie.title;
  const summary = language === "bg" ? movie.summary_bg || movie.summary : movie.summary;
  const backdropUrl = movie.backdrop_path 
    ? `https://image.tmdb.org/t/p/w1280${movie.backdrop_path}` 
    : movie.backdrop_url;

  return (
    <div className="relative h-[500px] md:h-[600px] overflow-hidden">
      {/* Backdrop */}
      <div className="absolute inset-0">
        {backdropUrl ? (
          <img
            src={backdropUrl}
            alt={title}
            className="w-full h-full object-cover transition-opacity duration-700"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-tmdb-dark-blue to-gray-900" />
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/60 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />
      </div>

      {/* Content */}
      <div className="relative z-10 h-full max-w-7xl mx-auto px-4 md:px-8 flex items-center">
        <div className="max-w-2xl">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">{title}</h1>
          {summary && (
            <p className="text-gray-200 text-lg mb-6 line-clamp-3">{summary}</p>
          )}
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(`/movie/${movie.id}`)}
              className="flex items-center gap-2 px-6 py-3 bg-tmdb-light-blue text-tmdb-dark-blue font-semibold rounded-lg hover:bg-tmdb-light-blue/90 transition-colors"
            >
              <Play className="w-5 h-5 fill-current" />
              {language === "bg" ? "Виж детайли" : "View Details"}
            </button>
            <div className="flex items-center gap-2">
              <CircularRating rating={movie.average_rating ?? 0} size={52} />
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Dots */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-2 z-10">
        {movies.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentIndex(index)}
            className={`w-2 h-2 rounded-full transition-all ${
              index === currentIndex
                ? "bg-tmdb-light-blue w-6"
                : "bg-white/50 hover:bg-white/70"
            }`}
          />
        ))}
      </div>

      {/* Arrow Navigation */}
      <button
        onClick={() => setCurrentIndex((prev) => (prev - 1 + movies.length) % movies.length)}
        className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors z-10"
      >
        <ChevronLeft className="w-6 h-6" />
      </button>
      <button
        onClick={() => setCurrentIndex((prev) => (prev + 1) % movies.length)}
        className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors z-10"
      >
        <ChevronRight className="w-6 h-6" />
      </button>
    </div>
  );
}

function MovieCarousel({ 
  movies, 
  title, 
  icon: Icon,
  language 
}: { 
  movies: Movie[]; 
  title: string;
  icon?: React.ComponentType<{ className?: string }>;
  language: string;
}) {
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
    if (scrollRef.current) {
      const scrollAmount = 400;
      scrollRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
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
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className={`text-xl font-bold flex items-center gap-2 ${
          theme === "dark" ? "text-white" : "text-gray-900"
        }`}>
          {Icon && <Icon className="w-5 h-5 text-tmdb-light-blue" />}
          {title}
        </h2>
        <button
          onClick={() => navigate("/browse")}
          className="text-tmdb-light-blue hover:underline text-sm font-medium"
        >
          {language === "bg" ? "Виж всички" : "View All"}
        </button>
      </div>

      {/* Carousel */}
      <div className="relative group">
        {/* Scroll Buttons */}
        {canScrollLeft && (
          <button
            onClick={() => scroll("left")}
            className={`absolute -left-4 top-1/3 z-10 p-2 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-all ${
              theme === "dark" 
                ? "bg-gray-800/90 text-white hover:bg-gray-700" 
                : "bg-white/90 text-gray-800 hover:bg-white shadow-md"
            }`}
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
        )}
        {canScrollRight && (
          <button
            onClick={() => scroll("right")}
            className={`absolute -right-4 top-1/3 z-10 p-2 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-all ${
              theme === "dark" 
                ? "bg-gray-800/90 text-white hover:bg-gray-700" 
                : "bg-white/90 text-gray-800 hover:bg-white shadow-md"
            }`}
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        )}

        {/* Movies */}
        <div
          ref={scrollRef}
          className="flex gap-4 overflow-x-auto scrollbar-hide pb-6"
          style={{ scrollSnapType: "x mandatory" }}
        >
          {movies.map((movie) => {
            const movieTitle = language === "bg" ? movie.title_bg || movie.title : movie.title;
            const posterUrl = movie.poster_path 
              ? `https://image.tmdb.org/t/p/w342${movie.poster_path}` 
              : movie.poster_url;
            const releaseDate = movie.release_date
              ? new Date(movie.release_date).toLocaleDateString(language === "bg" ? "bg-BG" : "en-US", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })
              : null;

            return (
              <div
                key={movie.id}
                onClick={() => navigate(`/movie/${movie.id}`)}
                className="flex-shrink-0 w-[150px] cursor-pointer group/card"
                style={{ scrollSnapAlign: "start" }}
              >
                {/* Poster with Rating */}
                <div className="relative rounded-lg overflow-hidden shadow-md">
                  {posterUrl ? (
                    <img
                      src={posterUrl}
                      alt={movieTitle}
                      className="w-full aspect-[2/3] object-cover transition-transform group-hover/card:scale-105"
                      loading="lazy"
                    />
                  ) : (
                    <div className={`w-full aspect-[2/3] flex items-center justify-center ${
                      theme === "dark" ? "bg-gray-800" : "bg-gray-200"
                    }`}>
                      <span className={`text-xs text-center px-2 ${
                        theme === "dark" ? "text-gray-400" : "text-gray-500"
                      }`}>
                        {movieTitle}
                      </span>
                    </div>
                  )}
                  {/* Rating Badge - Positioned to be visible */}
                  <div className="absolute -bottom-4 left-2 z-10">
                    <CircularRating rating={movie.average_rating ?? 0} size={38} />
                  </div>
                </div>

                {/* Title and Date */}
                <div className="pt-6 px-1">
                  <h3 className={`font-semibold text-sm line-clamp-2 group-hover/card:text-tmdb-light-blue transition-colors ${
                    theme === "dark" ? "text-white" : "text-gray-900"
                  }`}>
                    {movieTitle}
                  </h3>
                  {releaseDate && (
                    <p className={`text-xs mt-1 ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>
                      {releaseDate}
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

export default function Home() {
  const { theme, language } = useApp();
  const navigate = useNavigate();
  
  const [featuredMovies, setFeaturedMovies] = useState<Movie[]>([]);
  const [trendingMovies, setTrendingMovies] = useState<Movie[]>([]);
  const [topRatedMovies, setTopRatedMovies] = useState<Movie[]>([]);
  const [recentMovies, setRecentMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMovies = async () => {
      setLoading(true);
      try {
        const allMovies = await moviesApi.getAll();
        
        // Featured: top 5 by popularity
        const featured = [...allMovies]
          .sort((a: any, b: any) => (b.review_count ?? 0) - (a.review_count ?? 0))
          .slice(0, 5);
        setFeaturedMovies(featured);

        // Trending: random selection or by some metric
        const trending = [...allMovies]
          .sort(() => Math.random() - 0.5)
          .slice(0, 20);
        setTrendingMovies(trending);

        // Top Rated
        const topRated = [...allMovies]
          .filter((m: any) => m.average_rating != null)
          .sort((a: any, b: any) => (b.average_rating ?? 0) - (a.average_rating ?? 0))
          .slice(0, 20);
        setTopRatedMovies(topRated);

        // Recent: by release date
        const recent = [...allMovies]
          .filter((m: any) => m.release_date)
          .sort((a: any, b: any) => {
            const dateA = new Date(a.release_date).getTime();
            const dateB = new Date(b.release_date).getTime();
            return dateB - dateA;
          })
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

  if (loading) {
    return (
      <div className={`min-h-screen ${theme === "dark" ? "bg-tmdb-dark" : "bg-gray-50"}`}>
        {/* Hero Skeleton */}
        <div className={`h-[500px] md:h-[600px] animate-pulse ${theme === "dark" ? "bg-gray-800" : "bg-gray-300"}`} />
        
        {/* Carousels Skeleton */}
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">
          {[1, 2, 3].map((i) => (
            <div key={i} className="mb-8">
              <div className={`h-6 w-40 rounded mb-4 ${theme === "dark" ? "bg-gray-700" : "bg-gray-200"}`} />
              <div className="flex gap-4 overflow-hidden">
                {[1, 2, 3, 4, 5, 6].map((j) => (
                  <div key={j} className="flex-shrink-0 w-[150px]">
                    <div className={`aspect-[2/3] rounded-lg ${theme === "dark" ? "bg-gray-700" : "bg-gray-200"}`} />
                    <div className={`h-4 w-full rounded mt-6 ${theme === "dark" ? "bg-gray-700" : "bg-gray-200"}`} />
                    <div className={`h-3 w-2/3 rounded mt-2 ${theme === "dark" ? "bg-gray-700" : "bg-gray-200"}`} />
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
      {/* Hero Carousel */}
      <HeroCarousel movies={featuredMovies} language={language} />

      {/* Movie Sections */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 space-y-10">
        {/* Trending */}
        <MovieCarousel
          movies={trendingMovies}
          title={language === "bg" ? "Trending" : "Trending"}
          icon={TrendingUp}
          language={language}
        />

        {/* Top Rated */}
        <MovieCarousel
          movies={topRatedMovies}
          title={language === "bg" ? "Топ рейтинг" : "Top Rated"}
          icon={Star}
          language={language}
        />

        {/* Recently Released */}
        <MovieCarousel
          movies={recentMovies}
          title={language === "bg" ? "Нови филми" : "Recently Released"}
          icon={Calendar}
          language={language}
        />

        {/* AI Search Promo */}
        <section className={`rounded-2xl p-8 ${
          theme === "dark" 
            ? "bg-gradient-to-r from-tmdb-dark-blue to-gray-900 border border-gray-800" 
            : "bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-100"
        }`}>
          <div className="flex flex-col md:flex-row items-center gap-6">
            <div className={`p-4 rounded-full ${theme === "dark" ? "bg-tmdb-light-blue/20" : "bg-tmdb-light-blue/10"}`}>
              <Sparkles className="w-10 h-10 text-tmdb-light-blue" />
            </div>
            <div className="flex-1 text-center md:text-left">
              <h3 className={`text-2xl font-bold mb-2 ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
                {language === "bg" ? "Търси с AI" : "Search with AI"}
              </h3>
              <p className={theme === "dark" ? "text-gray-300" : "text-gray-600"}>
                {language === "bg" 
                  ? "Опиши какво искаш да гледаш и нашият AI ще намери перфектния филм за теб."
                  : "Describe what you want to watch and our AI will find the perfect movie for you."}
              </p>
            </div>
            <button
              onClick={() => navigate("/browse")}
              className="px-6 py-3 bg-tmdb-light-blue text-tmdb-dark-blue font-semibold rounded-lg hover:bg-tmdb-light-blue/90 transition-colors flex items-center gap-2"
            >
              <Sparkles className="w-5 h-5" />
              {language === "bg" ? "Опитай сега" : "Try Now"}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}