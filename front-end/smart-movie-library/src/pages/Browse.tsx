/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import type { Movie } from "../types";
import { moviesApi } from "../api/movies";
import api from "../api/client";
import { useApp } from "../context/AppContext";
import { Search, Sparkles, Filter, ChevronDown, X, Grid, List, ChevronLeft, ChevronRight, Film } from "lucide-react";

// Cache for movies
const movieCache = {
  all: null as Movie[] | null,
  timestamp: 0,
  TTL: 5 * 60 * 1000,
  get(): Movie[] | null {
    if (this.all && Date.now() - this.timestamp < this.TTL) return this.all;
    return null;
  },
  set(movies: Movie[]) {
    this.all = movies;
    this.timestamp = Date.now();
  },
};

type SortOption = "popularity" | "rating" | "title" | "release_date" | "relevance";
type ViewMode = "grid" | "list";
type MoodOption = "all" | "funny" | "scary" | "romantic" | "exciting" | "thoughtful" | "dark" | "uplifting";

const MOVIES_PER_PAGE = 20;

const moodToGenres: Record<MoodOption, string[]> = {
  all: [],
  funny: ["Comedy"],
  scary: ["Horror", "Thriller"],
  romantic: ["Romance"],
  exciting: ["Action", "Adventure"],
  thoughtful: ["Drama", "Documentary"],
  dark: ["Crime", "Thriller", "Horror", "Mystery"],
  uplifting: ["Family", "Comedy", "Animation", "Musical"],
};

const moodLabels: Record<MoodOption, { en: string; bg: string; emoji: string }> = {
  all: { en: "All Moods", bg: "Всички", emoji: "🎬" },
  funny: { en: "Funny", bg: "Забавно", emoji: "😂" },
  scary: { en: "Scary", bg: "Страшно", emoji: "😱" },
  romantic: { en: "Romantic", bg: "Романтично", emoji: "💕" },
  exciting: { en: "Exciting", bg: "Вълнуващо", emoji: "🔥" },
  thoughtful: { en: "Thoughtful", bg: "За размисъл", emoji: "🤔" },
  dark: { en: "Dark", bg: "Мрачно", emoji: "🌑" },
  uplifting: { en: "Uplifting", bg: "Вдъхновяващо", emoji: "✨" },
};

function CircularRating({ rating, size = 36 }: { rating: number; size?: number }) {
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

function MovieCardGrid({ movie, onClick, language, theme, snippet }: { movie: Movie; onClick: () => void; language: string; theme: string; snippet?: string }) {
  const title = language === "bg" ? movie.title_bg || movie.title : movie.title;
  const posterUrl = movie.poster_path ? `https://image.tmdb.org/t/p/w342${movie.poster_path}` : movie.poster_url;
  const releaseDate = movie.release_date ? new Date(movie.release_date).toLocaleDateString(language === "bg" ? "bg-BG" : "en-US", { year: "numeric", month: "short", day: "numeric" }) : null;

  return (
    <div className="cursor-pointer group" onClick={onClick}>
      <div className="relative rounded-lg overflow-hidden shadow-lg">
        {posterUrl ? (
          <img src={posterUrl} alt={title} className="w-full aspect-[2/3] object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
        ) : (
          <div className={`w-full aspect-[2/3] flex items-center justify-center ${theme === "dark" ? "bg-gray-800" : "bg-gray-200"}`}>
            <Film className="w-10 h-10 text-gray-500" />
          </div>
        )}
        <div className="absolute bottom-2 left-2">
          <CircularRating rating={movie.average_rating ?? 0} size={36} />
        </div>
      </div>
      <div className="pt-3 px-1">
        <h3 className={`font-bold text-sm line-clamp-2 group-hover:text-tmdb-light-blue transition-colors ${theme === "dark" ? "text-white" : "text-gray-900"}`}>{title}</h3>
        {releaseDate && <p className={`text-sm mt-0.5 ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>{releaseDate}</p>}
        {snippet && <p className="text-xs mt-1 text-purple-400 line-clamp-2 italic">{snippet}</p>}
      </div>
    </div>
  );
}

function MovieCardList({ movie, onClick, language, theme, snippet }: { movie: Movie; onClick: () => void; language: string; theme: string; snippet?: string }) {
  const title = language === "bg" ? movie.title_bg || movie.title : movie.title;
  const summary = language === "bg" ? movie.summary_bg || movie.summary : movie.summary;
  const posterUrl = movie.poster_path ? `https://image.tmdb.org/t/p/w185${movie.poster_path}` : movie.poster_url;
  const releaseDate = movie.release_date ? new Date(movie.release_date).toLocaleDateString(language === "bg" ? "bg-BG" : "en-US", { year: "numeric", month: "short", day: "numeric" }) : null;

  return (
    <div className={`flex rounded-lg cursor-pointer transition-all overflow-hidden border ${theme === "dark" ? "bg-gray-900 hover:bg-gray-800 border-gray-800" : "bg-white hover:bg-gray-50 border-gray-200 shadow-sm"}`} onClick={onClick}>
      <div className="relative flex-shrink-0 w-[94px]">
        {posterUrl ? (
          <img src={posterUrl} alt={title} className="w-full h-full object-cover min-h-[141px]" loading="lazy" />
        ) : (
          <div className={`w-full h-full min-h-[141px] flex items-center justify-center ${theme === "dark" ? "bg-gray-800" : "bg-gray-200"}`}>
            <Film className="w-8 h-8 text-gray-500" />
          </div>
        )}
      </div>
      <div className="flex-1 p-4 flex flex-col justify-center min-w-0">
        <div className="flex items-start gap-3">
          <CircularRating rating={movie.average_rating ?? 0} size={40} />
          <div className="flex-1 min-w-0">
            <h3 className={`font-bold line-clamp-1 ${theme === "dark" ? "text-white" : "text-gray-900"}`}>{title}</h3>
            {releaseDate && <p className={`text-sm ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>{releaseDate}</p>}
          </div>
        </div>
        {snippet ? (
          <p className="text-sm mt-2 text-purple-400 line-clamp-2 italic">{snippet}</p>
        ) : summary ? (
          <p className={`text-sm mt-2 line-clamp-2 ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>{summary}</p>
        ) : null}
      </div>
    </div>
  );
}

// Pagination Component
function Pagination({ currentPage, totalPages, onPageChange, theme, language }: { currentPage: number; totalPages: number; onPageChange: (page: number) => void; theme: string; language: string }) {
  if (totalPages <= 1) return null;

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const showPages = 5;
    
    if (totalPages <= showPages + 2) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      
      if (currentPage > 3) pages.push("...");
      
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      
      for (let i = start; i <= end; i++) pages.push(i);
      
      if (currentPage < totalPages - 2) pages.push("...");
      
      pages.push(totalPages);
    }
    
    return pages;
  };

  return (
    <div className="flex items-center justify-center gap-2 mt-8">
      {/* Previous */}
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className={`p-2 rounded-lg transition-colors ${
          currentPage === 1
            ? "opacity-50 cursor-not-allowed"
            : theme === "dark"
            ? "bg-gray-800 text-white hover:bg-gray-700"
            : "bg-white text-gray-900 hover:bg-gray-100 border"
        }`}
      >
        <ChevronLeft className="w-5 h-5" />
      </button>

      {/* Page Numbers */}
      {getPageNumbers().map((page, idx) => (
        page === "..." ? (
          <span key={`ellipsis-${idx}`} className={`px-2 ${theme === "dark" ? "text-gray-500" : "text-gray-400"}`}>...</span>
        ) : (
          <button
            key={page}
            onClick={() => onPageChange(page as number)}
            className={`min-w-[40px] h-10 rounded-lg font-medium transition-colors ${
              currentPage === page
                ? "bg-tmdb-light-blue text-tmdb-dark-blue"
                : theme === "dark"
                ? "bg-gray-800 text-gray-300 hover:bg-gray-700"
                : "bg-white text-gray-700 hover:bg-gray-100 border"
            }`}
          >
            {page}
          </button>
        )
      ))}

      {/* Next */}
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className={`p-2 rounded-lg transition-colors ${
          currentPage === totalPages
            ? "opacity-50 cursor-not-allowed"
            : theme === "dark"
            ? "bg-gray-800 text-white hover:bg-gray-700"
            : "bg-white text-gray-900 hover:bg-gray-100 border"
        }`}
      >
        <ChevronRight className="w-5 h-5" />
      </button>
    </div>
  );
}

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
  const [selectedMood, setSelectedMood] = useState<MoodOption>((params.get("mood") as MoodOption) || "all");
  const [sortBy, setSortBy] = useState<SortOption>((params.get("sort") as SortOption) || "rating");
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("grid");

  // Pagination
  const [currentPage, setCurrentPage] = useState(parseInt(params.get("page") || "1"));

  // Get unique genres
  const genres = useMemo(() => {
    const genreSet = new Set<string>();
    allMovies.forEach((movie) => {
      const genre = language === "bg" ? movie.genre_bg || movie.genre : movie.genre;
      if (genre) genre.split(",").forEach((g) => genreSet.add(g.trim()));
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
        // Title search - local filtering
        const lower = q.toLowerCase();
        const filtered = allMovies.filter((m) => {
          const title = (m.title ?? "").toLowerCase();
          const titleBg = (m.title_bg ?? "").toLowerCase();
          return title.includes(lower) || titleBg.includes(lower);
        });
        setSearchResults(filtered);
        setSnippets({});
      } else {
        // AI search - call /ai/search endpoint
        try {
          const response = await api.get('/ai/search', { params: { q, top_k: 50 } });
          const results = response.data || [];
          setSearchResults(results.map((r: any) => r.movie));
          const map: Record<number, string> = {};
          results.forEach((r: any) => {
            if (r.snippet) map[r.movie.id] = r.snippet;
          });
          setSnippets(map);
          // Default to relevance sort for AI search
          if (sortBy !== "relevance") setSortBy("relevance");
        } catch (err) {
          console.error("AI search failed, falling back to title search:", err);
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
      setCurrentPage(1);
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

    // Filter by mood
    if (selectedMood !== "all") {
      const moodGenres = moodToGenres[selectedMood];
      if (moodGenres.length > 0) {
        movies = movies.filter((m) => {
          const genre = (language === "bg" ? m.genre_bg || m.genre : m.genre) || "";
          return moodGenres.some((mg) => genre.toLowerCase().includes(mg.toLowerCase()));
        });
      }
    }

    // Sort - always apply sorting (even for AI search if user changes sort)
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
      case "relevance":
        // Keep original order (AI relevance) - don't sort
        return movies;
    }
    return sorted;
  }, [allMovies, searchResults, searchQuery, selectedGenre, selectedMood, sortBy, language]);

  // Pagination
  const totalPages = Math.ceil(displayMovies.length / MOVIES_PER_PAGE);
  const paginatedMovies = useMemo(() => {
    const start = (currentPage - 1) * MOVIES_PER_PAGE;
    return displayMovies.slice(start, start + MOVIES_PER_PAGE);
  }, [displayMovies, currentPage]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSearch = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim();
    const newParams = new URLSearchParams();
    if (q) {
      newParams.set("q", q);
      newParams.set("mode", searchMode);
    }
    if (selectedGenre !== "all") newParams.set("genre", selectedGenre);
    if (selectedMood !== "all") newParams.set("mood", selectedMood);
    if (sortBy !== "popularity") newParams.set("sort", sortBy);
    setParams(newParams);
  }, [searchQuery, searchMode, selectedGenre, selectedMood, sortBy, setParams]);

  const clearSearch = () => {
    setSearchQuery("");
    const newParams = new URLSearchParams(params);
    newParams.delete("q");
    newParams.delete("mode");
    setParams(newParams);
  };

  const handleMovieClick = (movie: Movie) => navigate(`/movie/${movie.id}`);

  const sortLabels: Record<SortOption, { en: string; bg: string }> = {
    relevance: { en: "Relevance", bg: "Релевантност" },
    rating: { en: "Rating", bg: "Рейтинг" },
    popularity: { en: "Popularity", bg: "Популярност" },
    release_date: { en: "Release Date", bg: "Дата" },
    title: { en: "Title", bg: "Заглавие" },
  };

  return (
    <div className={`min-h-screen transition-colors ${theme === "dark" ? "bg-tmdb-dark" : "bg-gray-50"}`}>
      {/* Page Header */}
      <div className={`border-b ${theme === "dark" ? "bg-tmdb-dark-blue border-gray-800" : "bg-white border-gray-200"}`}>
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-6">
          <h1 className={`text-2xl font-bold ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
            {language === "bg" ? "Разгледай филми" : "Browse Movies"}
          </h1>

          {/* Search */}
          <form onSubmit={handleSearch} className="mt-4">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={searchMode === "ai" 
                    ? (language === "bg" ? "Опиши какъв филм търсиш..." : "Describe what movie you're looking for...")
                    : (language === "bg" ? "Търси по заглавие..." : "Search by title...")}
                  className={`w-full pl-12 pr-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-tmdb-light-blue ${
                    theme === "dark" ? "bg-gray-900 border-gray-700 text-white placeholder-gray-500" : "bg-white border-gray-300 text-gray-900 placeholder-gray-400"
                  }`}
                />
                {searchMode === "ai" ? (
                  <Sparkles className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 ${theme === "dark" ? "text-purple-400" : "text-purple-500"}`} />
                ) : (
                  <Search className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 ${theme === "dark" ? "text-gray-500" : "text-gray-400"}`} />
                )}
                {searchQuery && (
                  <button type="button" onClick={clearSearch} className={`absolute right-4 top-1/2 -translate-y-1/2 ${theme === "dark" ? "text-gray-500 hover:text-gray-300" : "text-gray-400 hover:text-gray-600"}`}>
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>

              {/* Search Mode Toggle */}
              <div className={`flex rounded-xl border overflow-hidden ${theme === "dark" ? "border-gray-700" : "border-gray-300"}`}>
                <button
                  type="button"
                  onClick={() => setSearchMode("ai")}
                  className={`px-4 py-3 flex items-center gap-2 font-medium transition-colors ${
                    searchMode === "ai"
                      ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white"
                      : theme === "dark" ? "bg-gray-900 text-gray-400 hover:text-white" : "bg-white text-gray-500 hover:text-gray-700"
                  }`}
                >
                  <Sparkles className="w-4 h-4" />
                  <span className="hidden sm:inline">AI</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSearchMode("title")}
                  className={`px-4 py-3 flex items-center gap-2 font-medium transition-colors ${
                    searchMode === "title"
                      ? "bg-tmdb-light-blue text-tmdb-dark-blue"
                      : theme === "dark" ? "bg-gray-900 text-gray-400 hover:text-white" : "bg-white text-gray-500 hover:text-gray-700"
                  }`}
                >
                  <Search className="w-4 h-4" />
                  <span className="hidden sm:inline">{language === "bg" ? "Заглавие" : "Title"}</span>
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-6">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar */}
          <aside className={`lg:w-60 flex-shrink-0 ${showFilters ? "block" : "hidden lg:block"}`}>
            <div className={`rounded-xl border overflow-hidden sticky top-24 ${theme === "dark" ? "bg-gray-900 border-gray-800" : "bg-white border-gray-200"}`}>
              <div className={`px-4 py-3 border-b font-semibold flex items-center gap-2 ${theme === "dark" ? "border-gray-800 text-white" : "border-gray-200 text-gray-900"}`}>
                <Filter className="w-4 h-4" />
                {language === "bg" ? "Филтри" : "Filters"}
              </div>

              {/* Sort */}
              <div className={`px-4 py-3 border-b ${theme === "dark" ? "border-gray-800" : "border-gray-200"}`}>
                <label className={`block text-sm font-medium mb-2 ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}>
                  {language === "bg" ? "Сортирай" : "Sort by"}
                </label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortOption)}
                  className={`w-full px-3 py-2 rounded-lg border ${theme === "dark" ? "bg-gray-800 border-gray-700 text-white" : "bg-gray-50 border-gray-200 text-gray-900"}`}
                >
                  {(Object.keys(sortLabels) as SortOption[]).map((s) => (
                    <option key={s} value={s}>{language === "bg" ? sortLabels[s].bg : sortLabels[s].en}</option>
                  ))}
                </select>
              </div>

              {/* Genre */}
              <div className={`px-4 py-3 border-b ${theme === "dark" ? "border-gray-800" : "border-gray-200"}`}>
                <label className={`block text-sm font-medium mb-2 ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}>
                  {language === "bg" ? "Жанр" : "Genre"}
                </label>
                <select
                  value={selectedGenre}
                  onChange={(e) => { setSelectedGenre(e.target.value); setCurrentPage(1); }}
                  className={`w-full px-3 py-2 rounded-lg border ${theme === "dark" ? "bg-gray-800 border-gray-700 text-white" : "bg-gray-50 border-gray-200 text-gray-900"}`}
                >
                  <option value="all">{language === "bg" ? "Всички" : "All"}</option>
                  {genres.map((g) => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>

              {/* Mood */}
              <div className="px-4 py-3">
                <label className={`block text-sm font-medium mb-2 ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}>
                  {language === "bg" ? "Настроение" : "Mood"}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(Object.keys(moodLabels) as MoodOption[]).map((mood) => (
                    <button
                      key={mood}
                      onClick={() => { setSelectedMood(mood); setCurrentPage(1); }}
                      className={`px-2 py-2 text-xs rounded-lg border transition-colors text-left ${
                        selectedMood === mood
                          ? "bg-tmdb-light-blue text-tmdb-dark-blue border-tmdb-light-blue font-medium"
                          : theme === "dark" ? "bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700" : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100"
                      }`}
                    >
                      <span className="mr-1">{moodLabels[mood].emoji}</span>
                      {language === "bg" ? moodLabels[mood].bg : moodLabels[mood].en}
                    </button>
                  ))}
                </div>
              </div>

              {/* Active Filters */}
              {(selectedGenre !== "all" || selectedMood !== "all" || searchQuery) && (
                <div className={`px-4 py-3 border-t ${theme === "dark" ? "border-gray-800" : "border-gray-200"}`}>
                  <p className={`text-xs font-medium mb-2 ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>
                    {language === "bg" ? "Активни:" : "Active:"}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {searchQuery && (
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs ${theme === "dark" ? "bg-purple-500/20 text-purple-400" : "bg-purple-100 text-purple-700"}`}>
                        {searchMode === "ai" ? <Sparkles className="w-3 h-3" /> : <Search className="w-3 h-3" />}
                        "{searchQuery.length > 15 ? searchQuery.slice(0, 15) + "..." : searchQuery}"
                        <button onClick={clearSearch}><X className="w-3 h-3" /></button>
                      </span>
                    )}
                    {selectedGenre !== "all" && (
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs ${theme === "dark" ? "bg-blue-500/20 text-blue-400" : "bg-blue-100 text-blue-700"}`}>
                        {selectedGenre}
                        <button onClick={() => setSelectedGenre("all")}><X className="w-3 h-3" /></button>
                      </span>
                    )}
                    {selectedMood !== "all" && (
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs ${theme === "dark" ? "bg-amber-500/20 text-amber-400" : "bg-amber-100 text-amber-700"}`}>
                        {moodLabels[selectedMood].emoji}
                        <button onClick={() => setSelectedMood("all")}><X className="w-3 h-3" /></button>
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </aside>

          {/* Main */}
          <main className="flex-1 min-w-0">
            {/* Results Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <button onClick={() => setShowFilters(!showFilters)} className={`lg:hidden p-2 rounded-lg ${theme === "dark" ? "bg-gray-800 text-white" : "bg-white text-gray-700 border"}`}>
                  <Filter className="w-5 h-5" />
                </button>
                <p className={`text-sm ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>
                  {displayMovies.length} {language === "bg" ? "филма" : "movies"}
                  {totalPages > 1 && ` • ${language === "bg" ? "Страница" : "Page"} ${currentPage}/${totalPages}`}
                </p>
              </div>

              <div className="flex items-center gap-1">
                <button onClick={() => setViewMode("grid")} className={`p-2 rounded ${viewMode === "grid" ? "bg-tmdb-light-blue text-tmdb-dark-blue" : theme === "dark" ? "text-gray-400 hover:bg-gray-800" : "text-gray-400 hover:bg-gray-100"}`}>
                  <Grid className="w-5 h-5" />
                </button>
                <button onClick={() => setViewMode("list")} className={`p-2 rounded ${viewMode === "list" ? "bg-tmdb-light-blue text-tmdb-dark-blue" : theme === "dark" ? "text-gray-400 hover:bg-gray-800" : "text-gray-400 hover:bg-gray-100"}`}>
                  <List className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Loading */}
            {(loading || searching) && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {[...Array(20)].map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className={`aspect-[2/3] rounded-lg ${theme === "dark" ? "bg-gray-800" : "bg-gray-200"}`} />
                    <div className={`h-4 w-3/4 rounded mt-3 ${theme === "dark" ? "bg-gray-800" : "bg-gray-200"}`} />
                    <div className={`h-3 w-1/2 rounded mt-2 ${theme === "dark" ? "bg-gray-800" : "bg-gray-200"}`} />
                  </div>
                ))}
              </div>
            )}

            {/* Empty */}
            {!loading && !searching && displayMovies.length === 0 && (
              <div className={`text-center py-16 ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>
                <Search className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p className="text-xl font-medium">{language === "bg" ? "Няма намерени филми" : "No movies found"}</p>
                <p className="mt-2">{language === "bg" ? "Опитайте с различно търсене" : "Try different search"}</p>
              </div>
            )}

            {/* Movies Grid/List */}
            {!loading && !searching && displayMovies.length > 0 && (
              <>
                {viewMode === "grid" ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
                    {paginatedMovies.map((movie) => (
                      <MovieCardGrid
                        key={movie.id}
                        movie={movie}
                        onClick={() => handleMovieClick(movie)}
                        language={language}
                        theme={theme}
                        snippet={snippets[movie.id]}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {paginatedMovies.map((movie) => (
                      <MovieCardList
                        key={movie.id}
                        movie={movie}
                        onClick={() => handleMovieClick(movie)}
                        language={language}
                        theme={theme}
                        snippet={snippets[movie.id]}
                      />
                    ))}
                  </div>
                )}

                {/* Pagination */}
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={handlePageChange}
                  theme={theme}
                  language={language}
                />
              </>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}