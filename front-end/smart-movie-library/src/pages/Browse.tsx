import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import type { Movie } from "../types";
import { moviesApi, type SearchResult } from "../api/movies";
import { useApp } from "../context/AppContext";
import { Search, Sparkles, Filter, ChevronDown, X, SortAsc, Grid, List } from "lucide-react";

// Cache for movies
const movieCache = {
  all: null as Movie[] | null,
  timestamp: 0,
  TTL: 5 * 60 * 1000,

  get(): Movie[] | null {
    if (this.all && Date.now() - this.timestamp < this.TTL) {
      return this.all;
    }
    return null;
  },

  set(movies: Movie[]) {
    this.all = movies;
    this.timestamp = Date.now();
  },
};

function CircularRating({ rating, size = 40 }: { rating: number; size?: number }) {
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
        <sup style={{ fontSize: size * 0.15 }}>%</sup>
      </span>
    </div>
  );
}

// Grid card view (TMDB style)
function MovieCardGrid({ movie, onClick, language }: { movie: Movie; onClick: () => void; language: string }) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const { theme } = useApp();

  const title = language === "bg" ? movie.title_bg || movie.title : movie.title;
  const releaseDate = movie.release_date
    ? new Date(movie.release_date).toLocaleDateString(language === "bg" ? "bg-BG" : "en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : null;

  const posterUrl = movie.poster_path 
    ? `https://image.tmdb.org/t/p/w342${movie.poster_path}` 
    : movie.poster_url;

  return (
    <div
      className="cursor-pointer group"
      onClick={onClick}
    >
      {/* Poster with rating */}
      <div className="relative rounded-lg overflow-hidden shadow-lg">
        {!imageLoaded && !imageError && (
          <div className={`absolute inset-0 animate-pulse aspect-[2/3] ${theme === "dark" ? "bg-gray-700" : "bg-gray-200"}`} />
        )}
        {posterUrl && !imageError ? (
          <img
            src={posterUrl}
            alt={title}
            className={`w-full aspect-[2/3] object-cover transition-transform group-hover:scale-105 ${imageLoaded ? "opacity-100" : "opacity-0"}`}
            loading="lazy"
            onLoad={() => setImageLoaded(true)}
            onError={() => setImageError(true)}
          />
        ) : (
          <div className={`w-full aspect-[2/3] flex items-center justify-center ${theme === "dark" ? "bg-gray-800" : "bg-gray-200"}`}>
            <span className={`text-xs text-center px-2 ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>
              {title}
            </span>
          </div>
        )}
        {/* Rating badge */}
        <div className="absolute -bottom-4 left-2 z-10">
          <CircularRating rating={movie.average_rating ?? 0} size={38} />
        </div>
      </div>

      {/* Title and date */}
      <div className="pt-6 px-1">
        <h3 className={`font-bold text-sm line-clamp-2 group-hover:text-tmdb-light-blue transition-colors ${
          theme === "dark" ? "text-white" : "text-gray-900"
        }`}>
          {title}
        </h3>
        {releaseDate && (
          <p className={`text-sm mt-0.5 ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>
            {releaseDate}
          </p>
        )}
      </div>
    </div>
  );
}

// List card view
function MovieCardList({ movie, onClick, language, snippet }: { movie: Movie; onClick: () => void; language: string; snippet?: string }) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const { theme } = useApp();

  const title = language === "bg" ? movie.title_bg || movie.title : movie.title;
  const summary = language === "bg" ? movie.summary_bg || movie.summary : movie.summary;
  const releaseDate = movie.release_date
    ? new Date(movie.release_date).toLocaleDateString(language === "bg" ? "bg-BG" : "en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : null;

  const posterUrl = movie.poster_path 
    ? `https://image.tmdb.org/t/p/w185${movie.poster_path}` 
    : movie.poster_url;

  return (
    <div
      className={`flex rounded-lg cursor-pointer transition-all overflow-hidden border ${
        theme === "dark" 
          ? "bg-gray-900 hover:bg-gray-800 border-gray-800" 
          : "bg-white hover:bg-gray-50 border-gray-200 shadow-sm"
      }`}
      onClick={onClick}
    >
      {/* Poster */}
      <div className="relative flex-shrink-0 w-[94px]">
        {!imageLoaded && !imageError && (
          <div className={`absolute inset-0 animate-pulse ${theme === "dark" ? "bg-gray-700" : "bg-gray-200"}`} />
        )}
        {posterUrl && !imageError ? (
          <img
            src={posterUrl}
            alt={title}
            className={`w-full h-full object-cover min-h-[141px] ${imageLoaded ? "opacity-100" : "opacity-0"}`}
            loading="lazy"
            onLoad={() => setImageLoaded(true)}
            onError={() => setImageError(true)}
          />
        ) : (
          <div className={`w-full h-full min-h-[141px] flex items-center justify-center ${theme === "dark" ? "bg-gray-800" : "bg-gray-200"}`}>
            <span className={`text-xs text-center px-1 ${theme === "dark" ? "text-gray-500" : "text-gray-400"}`}>
              {title}
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 p-4 flex flex-col justify-center min-w-0">
        <div className="flex items-start gap-3">
          <CircularRating rating={movie.average_rating ?? 0} size={40} />
          <div className="min-w-0 flex-1">
            <h3 className={`font-bold text-base hover:text-tmdb-light-blue transition-colors ${
              theme === "dark" ? "text-white" : "text-gray-900"
            }`}>
              {title}
            </h3>
            {releaseDate && (
              <p className={`text-sm ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>
                {releaseDate}
              </p>
            )}
          </div>
        </div>
        {snippet ? (
          <p className={`text-sm mt-3 line-clamp-2 ${theme === "dark" ? "text-emerald-400" : "text-emerald-600"}`}>
            <Sparkles className="w-3 h-3 inline mr-1" />
            {snippet}
          </p>
        ) : summary ? (
          <p className={`text-sm mt-3 line-clamp-2 ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>
            {summary}
          </p>
        ) : null}
      </div>
    </div>
  );
}

type SortOption = "popularity" | "rating" | "title" | "release_date";
type ViewMode = "grid" | "list";

export default function Browse() {
  const navigate = useNavigate();
  const { theme, language } = useApp();
  const [params, setParams] = useSearchParams();

  // State
  const [allMovies, setAllMovies] = useState<Movie[]>([]);
  const [searchResults, setSearchResults] = useState<Movie[]>([]);
  const [snippets, setSnippets] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState(params.get("q") || "");
  const [searchMode, setSearchMode] = useState<"ai" | "title">(params.get("mode") === "title" ? "title" : "ai");
  const [selectedGenre, setSelectedGenre] = useState(params.get("genre") || "all");
  const [sortBy, setSortBy] = useState<SortOption>((params.get("sort") as SortOption) || "popularity");
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("grid");

  // Get unique genres
  const genres = useMemo(() => {
    const genreSet = new Set<string>();
    allMovies.forEach((movie) => {
      const genre = language === "bg" ? movie.genre_bg || movie.genre : movie.genre;
      if (genre) {
        genre.split(",").forEach((g) => genreSet.add(g.trim()));
      }
    });
    return Array.from(genreSet).sort();
  }, [allMovies, language]);

  // Fetch all movies
  useEffect(() => {
    const fetchMovies = async () => {
      const cached = movieCache.get();
      if (cached) {
        setAllMovies(cached);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const data = await moviesApi.getAll();
        movieCache.set(data);
        setAllMovies(data);
      } catch (err) {
        console.error("Failed to fetch movies:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchMovies();
  }, []);

  // Handle search from URL params
  useEffect(() => {
    const q = params.get("q") || "";
    setSearchQuery(q);

    if (!q) {
      setSearchResults([]);
      setSnippets({});
      return;
    }

    const mode = params.get("mode") === "title" ? "title" : "ai";
    setSearchMode(mode);

    const performSearch = async () => {
      setSearching(true);

      if (mode === "title") {
        const lower = q.toLowerCase();
        const filtered = allMovies.filter((m) => {
          const title = (m.title ?? "").toLowerCase();
          const titleBg = (m.title_bg ?? "").toLowerCase();
          return title.includes(lower) || titleBg.includes(lower);
        });
        setSearchResults(filtered);
        setSnippets({});
      } else {
        try {
          const results: SearchResult[] = await moviesApi.search(q);
          setSearchResults(results.map((r) => r.movie));
          const map: Record<number, string> = {};
          results.forEach((r) => {
            if (r.snippet) map[r.movie.id] = r.snippet;
          });
          setSnippets(map);
        } catch {
          // Fallback to title search
          const lower = q.toLowerCase();
          const filtered = allMovies.filter((m) => {
            const title = (m.title ?? "").toLowerCase();
            const titleBg = (m.title_bg ?? "").toLowerCase();
            return title.includes(lower) || titleBg.includes(lower);
          });
          setSearchResults(filtered);
          setSnippets({});
        }
      }

      setSearching(false);
    };

    if (allMovies.length > 0) {
      performSearch();
    }
  }, [params, allMovies]);

  // Get filtered and sorted movies
  const displayMovies = useMemo(() => {
    let movies = searchQuery ? searchResults : allMovies;

    // Filter by genre
    if (selectedGenre !== "all") {
      movies = movies.filter((m) => {
        const genre = language === "bg" ? m.genre_bg || m.genre : m.genre;
        return genre?.toLowerCase().includes(selectedGenre.toLowerCase());
      });
    }

    // Sort
    const sorted = [...movies];
    switch (sortBy) {
      case "popularity":
        sorted.sort((a, b) => ((b as any).review_count ?? 0) - ((a as any).review_count ?? 0));
        break;
      case "rating":
        sorted.sort((a, b) => ((b as any).average_rating ?? 0) - ((a as any).average_rating ?? 0));
        break;
      case "title":
        sorted.sort((a, b) => {
          const titleA = language === "bg" ? a.title_bg || a.title : a.title;
          const titleB = language === "bg" ? b.title_bg || b.title : b.title;
          return titleA.localeCompare(titleB);
        });
        break;
      case "release_date":
        sorted.sort((a, b) => {
          const dateA = (a as any).release_date ? new Date((a as any).release_date).getTime() : 0;
          const dateB = (b as any).release_date ? new Date((b as any).release_date).getTime() : 0;
          return dateB - dateA;
        });
        break;
    }

    return sorted;
  }, [allMovies, searchResults, searchQuery, selectedGenre, sortBy, language]);

  const handleSearch = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const q = searchQuery.trim();
      const newParams = new URLSearchParams();
      if (q) {
        newParams.set("q", q);
        newParams.set("mode", searchMode);
      }
      if (selectedGenre !== "all") newParams.set("genre", selectedGenre);
      if (sortBy !== "popularity") newParams.set("sort", sortBy);
      setParams(newParams);
    },
    [searchQuery, searchMode, selectedGenre, sortBy, setParams]
  );

  const clearSearch = () => {
    setSearchQuery("");
    const newParams = new URLSearchParams(params);
    newParams.delete("q");
    newParams.delete("mode");
    setParams(newParams);
  };

  const handleMovieClick = (movie: Movie) => navigate(`/movie/${movie.id}`);

  const sortLabels: Record<SortOption, { en: string; bg: string }> = {
    popularity: { en: "Popularity", bg: "Популярност" },
    rating: { en: "Rating", bg: "Рейтинг" },
    title: { en: "Title", bg: "Заглавие" },
    release_date: { en: "Release Date", bg: "Дата" },
  };

  return (
    <div className={`min-h-screen transition-colors ${theme === "dark" ? "bg-tmdb-dark" : "bg-gray-50"}`}>
      {/* Page Header */}
      <div className={`border-b ${theme === "dark" ? "bg-tmdb-dark-blue border-gray-800" : "bg-white border-gray-200"}`}>
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-6">
          <h1 className={`text-2xl font-bold ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
            {language === "bg" ? "Популярни филми" : "Popular Movies"}
          </h1>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-8 py-6">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar Filters */}
          <aside className="lg:w-64 flex-shrink-0">
            {/* Sort */}
            <div className={`rounded-lg overflow-hidden border mb-4 ${
              theme === "dark" ? "bg-gray-900 border-gray-800" : "bg-white border-gray-200 shadow-sm"
            }`}>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`w-full px-4 py-3 flex items-center justify-between font-semibold ${
                  theme === "dark" ? "text-white hover:bg-gray-800" : "text-gray-900 hover:bg-gray-50"
                }`}
              >
                <span>{language === "bg" ? "Сортиране" : "Sort"}</span>
                <ChevronDown className={`w-5 h-5 transition-transform ${showFilters ? "rotate-180" : ""}`} />
              </button>
              {showFilters && (
                <div className={`px-4 pb-4 border-t ${theme === "dark" ? "border-gray-800" : "border-gray-200"}`}>
                  <div className="pt-4 space-y-2">
                    {(Object.keys(sortLabels) as SortOption[]).map((option) => (
                      <label
                        key={option}
                        className={`flex items-center gap-2 cursor-pointer ${
                          theme === "dark" ? "text-gray-300" : "text-gray-700"
                        }`}
                      >
                        <input
                          type="radio"
                          name="sort"
                          checked={sortBy === option}
                          onChange={() => setSortBy(option)}
                          className="accent-tmdb-light-blue"
                        />
                        {language === "bg" ? sortLabels[option].bg : sortLabels[option].en}
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Filters */}
            <div className={`rounded-lg overflow-hidden border ${
              theme === "dark" ? "bg-gray-900 border-gray-800" : "bg-white border-gray-200 shadow-sm"
            }`}>
              <div className={`px-4 py-3 font-semibold border-b ${
                theme === "dark" ? "text-white border-gray-800" : "text-gray-900 border-gray-200"
              }`}>
                <Filter className="w-4 h-4 inline mr-2" />
                {language === "bg" ? "Филтри" : "Filters"}
              </div>
              
              {/* Search */}
              <div className={`px-4 py-3 border-b ${theme === "dark" ? "border-gray-800" : "border-gray-200"}`}>
                <form onSubmit={handleSearch}>
                  <div className="flex gap-2 mb-3">
                    <button
                      type="button"
                      onClick={() => setSearchMode("title")}
                      className={`flex-1 px-2 py-1.5 text-xs font-medium rounded transition-colors flex items-center justify-center gap-1 ${
                        searchMode === "title"
                          ? "bg-tmdb-light-blue text-tmdb-dark-blue"
                          : theme === "dark"
                          ? "bg-gray-800 text-gray-300 hover:bg-gray-700"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                    >
                      <Search className="w-3 h-3" />
                      {language === "bg" ? "Заглавие" : "Title"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setSearchMode("ai")}
                      className={`flex-1 px-2 py-1.5 text-xs font-medium rounded transition-colors flex items-center justify-center gap-1 ${
                        searchMode === "ai"
                          ? "bg-gradient-to-r from-emerald-500 to-cyan-500 text-white"
                          : theme === "dark"
                          ? "bg-gray-800 text-gray-300 hover:bg-gray-700"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                    >
                      <Sparkles className="w-3 h-3" />
                      AI
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder={
                        searchMode === "ai"
                          ? language === "bg" ? "Търси с AI..." : "AI search..."
                          : language === "bg" ? "Търси..." : "Search..."
                      }
                      className={`w-full px-3 py-2 pr-8 text-sm rounded-lg border focus:outline-none focus:ring-2 focus:ring-tmdb-light-blue ${
                        theme === "dark"
                          ? "bg-gray-800 border-gray-700 text-white placeholder:text-gray-500"
                          : "bg-gray-50 border-gray-300 text-gray-900 placeholder:text-gray-400"
                      }`}
                    />
                    {searchQuery ? (
                      <button
                        type="button"
                        onClick={clearSearch}
                        className={`absolute right-2 top-1/2 -translate-y-1/2 ${
                          theme === "dark" ? "text-gray-400 hover:text-white" : "text-gray-400 hover:text-gray-600"
                        }`}
                      >
                        <X className="w-4 h-4" />
                      </button>
                    ) : (
                      <Search className={`absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 ${
                        theme === "dark" ? "text-gray-500" : "text-gray-400"
                      }`} />
                    )}
                  </div>
                </form>
              </div>

              {/* Genre Filter */}
              <div className="px-4 py-3">
                <label className={`block text-sm font-medium mb-2 ${
                  theme === "dark" ? "text-gray-300" : "text-gray-700"
                }`}>
                  {language === "bg" ? "Жанр" : "Genre"}
                </label>
                <select
                  value={selectedGenre}
                  onChange={(e) => setSelectedGenre(e.target.value)}
                  className={`w-full px-3 py-2 text-sm rounded-lg border focus:outline-none focus:ring-2 focus:ring-tmdb-light-blue ${
                    theme === "dark"
                      ? "bg-gray-800 border-gray-700 text-white"
                      : "bg-gray-50 border-gray-300 text-gray-900"
                  }`}
                >
                  <option value="all">{language === "bg" ? "Всички" : "All"}</option>
                  {genres.map((genre) => (
                    <option key={genre} value={genre}>
                      {genre}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Active Filters */}
            {(selectedGenre !== "all" || searchQuery) && (
              <div className={`mt-4 p-3 rounded-lg border ${
                theme === "dark" ? "bg-gray-900 border-gray-800" : "bg-white border-gray-200"
              }`}>
                <p className={`text-xs font-medium mb-2 ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>
                  {language === "bg" ? "Активни филтри:" : "Active filters:"}
                </p>
                <div className="flex flex-wrap gap-2">
                  {searchQuery && (
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs ${
                      theme === "dark" ? "bg-tmdb-light-blue/20 text-tmdb-light-blue" : "bg-blue-100 text-blue-700"
                    }`}>
                      {searchMode === "ai" ? <Sparkles className="w-3 h-3" /> : <Search className="w-3 h-3" />}
                      "{searchQuery}"
                      <button onClick={clearSearch} className="hover:opacity-70">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  )}
                  {selectedGenre !== "all" && (
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs ${
                      theme === "dark" ? "bg-purple-500/20 text-purple-400" : "bg-purple-100 text-purple-700"
                    }`}>
                      {selectedGenre}
                      <button onClick={() => setSelectedGenre("all")} className="hover:opacity-70">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  )}
                </div>
              </div>
            )}
          </aside>

          {/* Main Content */}
          <main className="flex-1 min-w-0">
            {/* Results Header */}
            <div className="flex items-center justify-between mb-4">
              <p className={`text-sm ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>
                {searchQuery ? (
                  <>
                    {displayMovies.length} {language === "bg" ? "резултата" : "results"}
                  </>
                ) : (
                  <>
                    {displayMovies.length} {language === "bg" ? "филма" : "movies"}
                  </>
                )}
              </p>
              
              {/* View Toggle */}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setViewMode("grid")}
                  className={`p-2 rounded transition-colors ${
                    viewMode === "grid"
                      ? "bg-tmdb-light-blue text-tmdb-dark-blue"
                      : theme === "dark"
                      ? "text-gray-400 hover:text-white hover:bg-gray-800"
                      : "text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  <Grid className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={`p-2 rounded transition-colors ${
                    viewMode === "list"
                      ? "bg-tmdb-light-blue text-tmdb-dark-blue"
                      : theme === "dark"
                      ? "text-gray-400 hover:text-white hover:bg-gray-800"
                      : "text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  <List className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Movies */}
            {loading || searching ? (
              viewMode === "grid" ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {[...Array(20)].map((_, i) => (
                    <div key={i} className="animate-pulse">
                      <div className={`aspect-[2/3] rounded-lg ${theme === "dark" ? "bg-gray-800" : "bg-gray-200"}`} />
                      <div className={`h-4 w-3/4 rounded mt-6 ${theme === "dark" ? "bg-gray-800" : "bg-gray-200"}`} />
                      <div className={`h-3 w-1/2 rounded mt-2 ${theme === "dark" ? "bg-gray-800" : "bg-gray-200"}`} />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {[...Array(8)].map((_, i) => (
                    <div
                      key={i}
                      className={`flex gap-4 p-4 rounded-lg animate-pulse ${theme === "dark" ? "bg-gray-900" : "bg-white"}`}
                    >
                      <div className={`w-[94px] h-[141px] rounded ${theme === "dark" ? "bg-gray-800" : "bg-gray-200"}`} />
                      <div className="flex-1">
                        <div className={`h-5 w-2/3 rounded ${theme === "dark" ? "bg-gray-800" : "bg-gray-200"}`} />
                        <div className={`h-4 w-1/3 rounded mt-2 ${theme === "dark" ? "bg-gray-800" : "bg-gray-200"}`} />
                        <div className={`h-4 w-full rounded mt-4 ${theme === "dark" ? "bg-gray-800" : "bg-gray-200"}`} />
                      </div>
                    </div>
                  ))}
                </div>
              )
            ) : displayMovies.length === 0 ? (
              <div className={`text-center py-16 ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>
                <Search className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p className="text-xl font-medium">{language === "bg" ? "Няма намерени филми" : "No movies found"}</p>
                <p className="mt-2">
                  {language === "bg" ? "Опитайте с различно търсене или филтри" : "Try different search terms or filters"}
                </p>
              </div>
            ) : viewMode === "grid" ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                {displayMovies.map((movie) => (
                  <MovieCardGrid
                    key={movie.id}
                    movie={movie}
                    onClick={() => handleMovieClick(movie)}
                    language={language}
                  />
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {displayMovies.map((movie) => (
                  <MovieCardList
                    key={movie.id}
                    movie={movie}
                    onClick={() => handleMovieClick(movie)}
                    language={language}
                    snippet={snippets[movie.id]}
                  />
                ))}
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}