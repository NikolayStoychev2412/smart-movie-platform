import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import type { Movie } from "../types";
import { moviesApi } from "../api/movies";
import api from "../api/client";
import { useApp } from "../context/AppContext";
import { Search, Sparkles, Filter, X, Grid, List, ChevronLeft, ChevronRight, Film, TrendingUp, Heart } from "lucide-react";
import RatingBadge from "../components/RatingBadge";
import SkeletonCard from "../components/SkeletonCard";
import EmptyState from "../components/EmptyState";

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

type SortOption = "best" | "rating" | "popularity" | "release_date" | "title";
type ViewMode = "grid" | "list";
type MoodOption = "all" | "funny" | "scary" | "romantic" | "exciting" | "thoughtful" | "dark" | "uplifting";

const MOVIES_PER_PAGE = 20;
const CONFIDENCE_K = 20; // Reviews needed for full confidence
const MIN_SEARCH_LENGTH = 2; // Minimum characters before search triggers

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

const moodLabels: Record<MoodOption, { en: string; bg: string }> = {
  all: { en: "All Moods", bg: "Всички" },
  funny: { en: "Funny", bg: "Забавно" },
  scary: { en: "Scary", bg: "Страшно" },
  romantic: { en: "Romantic", bg: "Романтично" },
  exciting: { en: "Exciting", bg: "Вълнуващо" },
  thoughtful: { en: "Thoughtful", bg: "За размисъл" },
  dark: { en: "Dark", bg: "Мрачно" },
  uplifting: { en: "Uplifting", bg: "Вдъхновяващо" },
};

// ============================================================================
// GRADE CALCULATION SYSTEM
// ============================================================================

interface MovieWithGrade extends Movie {
  _grade?: number;
  _combinedRating?: number;
  _relevance?: number;
  _personalScore?: number;
  _popularityNorm?: number;
  _badge?: "best_for_you" | "matches_search" | "trending" | null;
  favorite_count?: number;
  completed_count?: number;
}

// Utility: clamp value to 0-1 range
const clamp01 = (x: number): number => Math.max(0, Math.min(1, x));

/**
 * Normalize any rating to 0..1.
 * Auto-detects scale: <=5 treated as 5-star, >5 treated as 10-scale
 */
const normRating01 = (rating: number | null | undefined): number => {
  const r = Number(rating) || 0;
  if (r <= 0) return 0;
  // auto-detect scale: <=5 => 5-star, >5 => 10-scale
  return clamp01(r <= 5 ? r / 5 : r / 10);
};

function calculateCombinedRating(movie: Movie): number {
  const tmdbRating = (movie as any).tmdb_rating;
  const appRating = (movie as any).average_rating;
  const reviewCount = (movie as any).review_count || 0;

  const tmdbNorm = normRating01(tmdbRating);
  const appNorm = normRating01(appRating);

  // Handle missing sources
  const hasTmdb = tmdbNorm > 0;
  const hasApp = reviewCount > 0 && appNorm > 0;

  if (hasApp && !hasTmdb) return appNorm;
  if (!hasApp && hasTmdb) return tmdbNorm;
  if (!hasApp && !hasTmdb) return 0.35; // low-neutral fallback for unknown movies

  // Confidence curve: at K reviews, confidence = 50%
  const confidence = clamp01(reviewCount / (reviewCount + CONFIDENCE_K));

  return clamp01(confidence * appNorm + (1 - confidence) * tmdbNorm);
}

/**
 * Get a popularity proxy value with fallback chain:
 *   1. popularity (TMDb popularity score — best)
 *   2. tmdb_vote_count (how many TMDb users rated it)
 *   3. review_count (our app's review count)
 *   4. 0
 */
function getPopProxy(movie: Movie): number {
  const m = movie as any;
  // Prefer TMDb popularity (typically 1-1000+), already a normalized popularity index
  if (m.popularity && m.popularity > 0) return m.popularity;
  // Scale tmdb_vote_count down to match popularity range (vote counts can be 100k+)
  if (m.tmdb_vote_count && m.tmdb_vote_count > 0) return Math.sqrt(m.tmdb_vote_count);
  // Scale review_count up to match (our reviews are typically 0-50)
  if (m.review_count && m.review_count > 0) return m.review_count * 5;
  return 0;
}

function calculatePopularityNorm(movie: Movie, maxPopularity: number): number {
  const popularity = getPopProxy(movie);
  if (maxPopularity <= 0) return 0;
  return clamp01(Math.log(1 + popularity) / Math.log(1 + maxPopularity));
}

function calculateEngagementNorm(movie: MovieWithGrade, maxFavorites: number, maxCompleted: number): number {
  const favoriteCount = movie.favorite_count || 0;
  const completedCount = movie.completed_count || 0;
  
  // Log normalization to prevent outliers from dominating
  const favNorm = maxFavorites > 0 ? Math.log(1 + favoriteCount) / Math.log(1 + maxFavorites) : 0;
  const compNorm = maxCompleted > 0 ? Math.log(1 + completedCount) / Math.log(1 + maxCompleted) : 0;
  
  // Favorites are slightly stronger signal than completed (more intentional)
  // 60% favorites + 40% completed
  return clamp01(0.6 * favNorm + 0.4 * compNorm);
}

function calculateGrade(
  movie: MovieWithGrade,
  maxPopularity: number,
  maxFavorites: number,
  maxCompleted: number,
  relevanceScores: Record<number, number>,
  personalScores: Record<number, number>,
  isAISearch: boolean
): number {
  const combinedRating = calculateCombinedRating(movie);
  const popNorm = calculatePopularityNorm(movie, maxPopularity);
  const engagementNorm = calculateEngagementNorm(movie, maxFavorites, maxCompleted);
  const searchNorm = relevanceScores[movie.id] || 0;
  const personalNorm = personalScores[movie.id] || 0;

  movie._combinedRating = combinedRating;
  movie._relevance = searchNorm;
  movie._personalScore = personalNorm;
  movie._popularityNorm = popNorm;

  let grade: number;

  if (isAISearch && searchNorm > 0) {
    // AI SEARCH: Semantic dominates, personal score boosts "best for you" movies
    // FinalScore = 0.55 Semantic + 0.25 Personal + 0.15 Popularity + 0.05 Quality
    grade = clamp01(
      0.55 * searchNorm +
      0.25 * personalNorm +
      0.15 * popNorm +
      0.05 * combinedRating
    );
  } else {
    // BROWSE (no search): quality + engagement + popularity
    grade = clamp01(
      0.50 * combinedRating +
      0.30 * engagementNorm +
      0.20 * popNorm
    );
  }

  // Assign badge (only during AI search)
  movie._badge = null;
  if (isAISearch && searchNorm > 0) {
    if (personalNorm >= 0.7) {
      movie._badge = "best_for_you";
    } else if (searchNorm >= 0.8) {
      movie._badge = "matches_search";
    } else if (popNorm >= 0.75 && searchNorm >= 0.4) {
      // Trending requires BOTH high popularity AND decent query match
      // Prevents badging popular movies that barely match the search
      movie._badge = "trending";
    }
  }

  return grade;
}

// ============================================================================
// COMPONENTS
// ============================================================================

function MovieBadge({ badge, language }: { badge: MovieWithGrade["_badge"]; language: string }) {
  if (!badge) return null;

  const config = {
    best_for_you: {
      label: language === "bg" ? "За теб" : "Best for you",
      icon: <Heart className="w-3 h-3" />,
      classes: "bg-primary text-white"
    },
    matches_search: {
      label: language === "bg" ? "Точно съвпадение" : "Great match",
      icon: <Sparkles className="w-3 h-3" />,
      classes: "bg-blue-600 text-white"
    },
    trending: {
      label: language === "bg" ? "Trending" : "Trending",
      icon: <TrendingUp className="w-3 h-3" />,
      classes: "bg-orange-500 text-white"
    },
  };

  const c = config[badge];
  return (
    <div className={`absolute top-2 left-2 flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold shadow-lg ${c.classes}`}>
      {c.icon}
      {c.label}
    </div>
  );
}

function MovieCardGrid({ movie, onClick, language, theme, snippet }: { movie: MovieWithGrade; onClick: () => void; language: string; theme: string; snippet?: string }) {
  const title = language === "bg" ? movie.title_bg || movie.title : movie.title;
  const posterUrl = movie.poster_path ? `https://image.tmdb.org/t/p/w342${movie.poster_path}` : movie.poster_url;
  const releaseDate = movie.release_date ? new Date(movie.release_date).toLocaleDateString(language === "bg" ? "bg-BG" : "en-US", { year: "numeric", month: "short", day: "numeric" }) : null;

  const tmdbRating = (movie as any).tmdb_rating || 0;
  const appRating = (movie as any).average_rating || 0;
  const reviewCount = (movie as any).review_count || 0;
  const displayAppRating = appRating <= 5 ? appRating : appRating / 2;

  return (
    <div className="cursor-pointer group" onClick={onClick}>
      <div className="relative rounded-lg overflow-hidden shadow-lg">
        {posterUrl ? (
          <img src={posterUrl} alt={title} className="w-full aspect-[2/3] object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
        ) : (
          <div className={`w-full aspect-[2/3] flex items-center justify-center ${theme === "dark" ? "bg-[#2A2A4A]" : "bg-gray-200"}`}>
            <Film className="w-10 h-10 text-[#A7A7C7]" />
          </div>
        )}
        {/* Ratings — hidden on snippet hover */}
        <div className={`absolute bottom-2 left-2 flex items-center gap-1.5 transition-opacity duration-300 ${snippet ? "group-hover:opacity-0" : ""}`}>
          <RatingBadge value={tmdbRating} scale={10} size="sm" />
          {reviewCount > 0 && appRating > 0 && (
            <RatingBadge value={displayAppRating} scale={5} size="sm" />
          )}
        </div>
        <MovieBadge badge={movie._badge} language={language} />
        {/* AI snippet hover overlay */}
        {snippet && (
          <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col justify-end p-3">
            <div className="flex items-center gap-1.5 mb-1.5">
              <Sparkles className="w-3 h-3 text-[#A78BFA]" />
              <span className="text-[10px] font-bold text-[#A78BFA] uppercase tracking-wider">
                {language === "bg" ? "AI съвпадение" : "AI Match"}
              </span>
            </div>
            <p className="text-white/90 text-[11px] leading-relaxed line-clamp-4">{snippet}</p>
          </div>
        )}
      </div>
      <div className="pt-3 px-1">
        <h3 className={`font-bold text-sm line-clamp-2 group-hover:text-primary transition-colors ${theme === "dark" ? "text-white" : "text-[#1A1B2E]"}`}>{title}</h3>
        {releaseDate && <p className={`text-sm mt-0.5 ${theme === "dark" ? "text-[#A7A7C7]" : "text-[#5B5D78]"}`}>{releaseDate}</p>}
      </div>
    </div>
  );
}

function MovieCardList({ movie, onClick, language, theme, snippet }: { movie: MovieWithGrade; onClick: () => void; language: string; theme: string; snippet?: string }) {
  const title = language === "bg" ? movie.title_bg || movie.title : movie.title;
  const summary = language === "bg" ? movie.summary_bg || movie.summary : movie.summary;
  const posterUrl = movie.poster_path ? `https://image.tmdb.org/t/p/w185${movie.poster_path}` : movie.poster_url;
  const releaseDate = movie.release_date ? new Date(movie.release_date).toLocaleDateString(language === "bg" ? "bg-BG" : "en-US", { year: "numeric", month: "short", day: "numeric" }) : null;

  const tmdbRating = (movie as any).tmdb_rating || 0;
  const appRating = (movie as any).average_rating || 0;
  const reviewCount = (movie as any).review_count || 0;
  const displayAppRating = appRating <= 5 ? appRating : appRating / 2;

  return (
    <div className={`flex rounded-lg cursor-pointer transition-all overflow-hidden border ${theme === "dark" ? "bg-[#1A1A33] hover:bg-[#2A2A4A] border-[#2A2A4A]" : "bg-white hover:bg-[#F8F9FC] border-[#E2E4F0] shadow-sm"}`} onClick={onClick}>
      <div className="relative flex-shrink-0 w-[94px]">
        {posterUrl ? (
          <img src={posterUrl} alt={title} className="w-full h-full object-cover min-h-[141px]" loading="lazy" />
        ) : (
          <div className={`w-full h-full min-h-[141px] flex items-center justify-center ${theme === "dark" ? "bg-[#2A2A4A]" : "bg-gray-200"}`}>
            <Film className="w-8 h-8 text-[#A7A7C7]" />
          </div>
        )}
        {movie._badge && (
          <div className="absolute top-1 left-1 right-1">
            <MovieBadge badge={movie._badge} language={language} />
          </div>
        )}
      </div>
      <div className="flex-1 p-4 flex flex-col justify-center min-w-0">
        <div className="flex items-start gap-3">
          <div className="flex items-center gap-1.5 self-center">
            <RatingBadge value={tmdbRating} scale={10} size="md" />
            {reviewCount > 0 && appRating > 0 && (
              <RatingBadge value={displayAppRating} scale={5} size="md" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className={`font-bold line-clamp-1 ${theme === "dark" ? "text-white" : "text-[#1A1B2E]"}`}>{title}</h3>
            <div className="flex items-center gap-2 flex-wrap">
              {releaseDate && <p className={`text-sm ${theme === "dark" ? "text-[#A7A7C7]" : "text-[#5B5D78]"}`}>{releaseDate}</p>}
            </div>
          </div>
        </div>
        {snippet ? (
          <div className="flex items-start gap-2 mt-2 px-3 py-2 rounded-lg bg-primary/10 border border-primary/20">
            <Sparkles className="w-3.5 h-3.5 text-primary flex-shrink-0 mt-0.5" />
            <p className="text-xs text-primary line-clamp-2 leading-relaxed">{snippet}</p>
          </div>
        ) : summary ? (
          <p className={`text-sm mt-2 line-clamp-2 ${theme === "dark" ? "text-[#A7A7C7]" : "text-[#5B5D78]"}`}>{summary}</p>
        ) : null}
      </div>
    </div>
  );
}

// Pagination Component
function Pagination({ currentPage, totalPages, onPageChange, theme }: { currentPage: number; totalPages: number; onPageChange: (page: number) => void; theme: string }) {
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
            ? "bg-[#2A2A4A] text-white hover:bg-[#2A2A4A]"
            : "bg-white text-[#1A1B2E] hover:bg-[#ECEEF8] border"
        }`}
      >
        <ChevronLeft className="w-5 h-5" />
      </button>

      {/* Page Numbers */}
      {getPageNumbers().map((page, idx) => (
        page === "..." ? (
          <span key={`ellipsis-${idx}`} className={`px-2 ${theme === "dark" ? "text-[#A7A7C7]" : "text-[#5B5D78]"}`}>...</span>
        ) : (
          <button
            key={page}
            onClick={() => onPageChange(page as number)}
            className={`min-w-[40px] h-10 rounded-lg font-medium transition-colors ${
              currentPage === page
                ? "bg-primary text-white"
                : theme === "dark"
                ? "bg-[#2A2A4A] text-[#A7A7C7] hover:bg-[#2A2A4A]"
                : "bg-white text-[#5B5D78] hover:bg-[#ECEEF8] border"
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
            ? "bg-[#2A2A4A] text-white hover:bg-[#2A2A4A]"
            : "bg-white text-[#1A1B2E] hover:bg-[#ECEEF8] border"
        }`}
      >
        <ChevronRight className="w-5 h-5" />
      </button>
    </div>
  );
}

export default function Browse() {
  const navigate = useNavigate();
  const { theme, language, isAuthenticated } = useApp();
  const [params, setParams] = useSearchParams();

  // State
  const [allMovies, setAllMovies] = useState<Movie[]>([]);
  const [searchResults, setSearchResults] = useState<Movie[]>([]);
  const [snippets, setSnippets] = useState<Record<number, string>>({});
  const [relevanceScores, setRelevanceScores] = useState<Record<number, number>>({});
  const [personalScores, setPersonalScores] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState(params.get("q") || "");
  const [selectedGenre, setSelectedGenre] = useState(params.get("genre") || "all");
  const [selectedMood, setSelectedMood] = useState<MoodOption>((params.get("mood") as MoodOption) || "all");
  const [sortBy, setSortBy] = useState<SortOption>((params.get("sort") as SortOption) || "best");
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("grid");

  // Pagination
  const [currentPage, setCurrentPage] = useState(parseInt(params.get("page") || "1"));

  // Search refs
  const activeQueryRef = useRef<string>("");

  // Fetch personal scores (for-me recommendations) — used to boost "Best for you" in AI search
  // Re-fetches on mount AND when user returns to the tab (picks up watchlist/favorite changes)
  useEffect(() => {
    const fetchPersonalScores = async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        setPersonalScores({});
        return;
      }
      try {
        const response = await api.get("/ai/recommend/for-me", { params: { top_k: 50 } });
        const recs = response.data || [];
        const scoreMap: Record<number, number> = {};
        recs.forEach((rec: any, idx: number) => {
          const movieId = rec.movie?.id;
          if (movieId) {
            scoreMap[movieId] = clamp01(1 - idx / Math.max(recs.length, 1));
          }
        });
        setPersonalScores(scoreMap);
      } catch {
        setPersonalScores({});
      }
    };
    fetchPersonalScores();

    // Re-fetch when user returns to this tab (catches watchlist/favorite changes made elsewhere)
    const onFocus = () => fetchPersonalScores();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [isAuthenticated]);

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
      } catch {
        // Failed to fetch movies
      } finally {
        setLoading(false);
      }
    };
    fetchMovies();
  }, []);

  // Handle search from URL params (always AI semantic search)
  useEffect(() => {
    const q = params.get("q") || "";
    setSearchQuery(q);

    if (!q) {
      setSearchResults([]);
      setSnippets({});
      setRelevanceScores({});
      return;
    }

    const performSearch = async () => {
      setSearching(true);

      try {
        const response = await api.get('/ai/search', { params: { q, top_k: 50, language } });
        const results = response.data || [];
        setSearchResults(results.map((r: any) => r.movie));

        const snippetMap: Record<number, string> = {};
        results.forEach((r: any) => {
          if (r.snippet) snippetMap[r.movie.id] = r.snippet;
        });
        setSnippets(snippetMap);

        const raw = results.map((r: any) => Number(r.relevance) || 0);
        const minRel = raw.length > 1 ? Math.min(...raw) : 0;
        const maxRel = raw.length > 0 ? Math.max(...raw) : 1;
        const denom = maxRel - minRel || 1;

        const relevanceMap: Record<number, number> = {};
        results.forEach((r: any) => {
          const rel = Number(r.relevance) || 0;
          relevanceMap[r.movie.id] = clamp01((rel - minRel) / denom);
        });
        setRelevanceScores(relevanceMap);
      } catch {
        setSearchResults([]);
        setSnippets({});
        setRelevanceScores({});
      }

      setSearching(false);
      setCurrentPage(1);
      activeQueryRef.current = q;
    };

    if (allMovies.length > 0) {
      performSearch();
    }
  }, [params, allMovies]);

  // Get filtered and sorted movies
  const displayMovies = useMemo(() => {
    // Use search results only if we actually have results from a completed search.
    // While typing a new query (searchResults empty), keep showing all movies.
    const hasActiveResults = searchResults.length > 0;
    let movies: MovieWithGrade[] = hasActiveResults ? [...searchResults] : [...allMovies];

    // Filter by genre
    if (selectedGenre !== "all") {
      movies = movies.filter((m) => {
        const genre = language === "bg" ? m.genre_bg || m.genre : m.genre;
        return genre?.toLowerCase().includes(selectedGenre.toLowerCase());
      });
    }

    // Filter by mood (always match against English genres since moodToGenres uses English names)
    if (selectedMood !== "all") {
      const moodGenres = moodToGenres[selectedMood];
      if (moodGenres.length > 0) {
        movies = movies.filter((m) => {
          const genre = (m.genre || "").toLowerCase();
          return moodGenres.some((mg) => genre.includes(mg.toLowerCase()));
        });
      }
    }

    // Calculate max values for normalization (popularity uses fallback chain)
    const maxPopularity = Math.max(...movies.map(m => getPopProxy(m)), 1);
    const maxFavorites = Math.max(...movies.map(m => (m as MovieWithGrade).favorite_count || 0), 1);
    const maxCompleted = Math.max(...movies.map(m => (m as MovieWithGrade).completed_count || 0), 1);
    const isAISearch = searchQuery.trim() !== "";

    // Calculate grades for all movies (includes personal score + badges)
    movies.forEach(m => {
      m._grade = calculateGrade(m, maxPopularity, maxFavorites, maxCompleted, relevanceScores, personalScores, isAISearch);
    });

    // Sort based on selected option
    switch (sortBy) {
      case "best":
        // Blended: quality + engagement + popularity (the "smart" default)
        movies.sort((a, b) => (b._grade || 0) - (a._grade || 0));
        break;
      case "rating":
        // PURE QUALITY: highest rated first, regardless of popularity
        // Uses TMDB rating directly (not the blended combinedRating which mixes in app ratings)
        // Tiebreak by vote count (more votes = more trustworthy rating)
        movies.sort((a, b) => {
          const rA = (a as any).tmdb_rating || (a as any).average_rating || 0;
          const rB = (b as any).tmdb_rating || (b as any).average_rating || 0;
          if (rB !== rA) return rB - rA;
          // Tiebreak: more votes = more credible
          const vA = (a as any).tmdb_vote_count || (a as any).review_count || 0;
          const vB = (b as any).tmdb_vote_count || (b as any).review_count || 0;
          return vB - vA;
        });
        break;
      case "popularity":
        // PURE TRENDING: most popular/viral first, regardless of quality
        // Uses fallback chain: popularity → tmdb_vote_count → review_count
        // Tiebreak by rating (if equally popular, show the better one)
        movies.sort((a, b) => {
          const pA = getPopProxy(a);
          const pB = getPopProxy(b);
          if (pB !== pA) return pB - pA;
          const rA = (a as any).tmdb_rating || 0;
          const rB = (b as any).tmdb_rating || 0;
          return rB - rA;
        });
        break;
      case "title":
        movies.sort((a, b) => {
          const titleA = language === "bg" ? a.title_bg || a.title : a.title;
          const titleB = language === "bg" ? b.title_bg || b.title : b.title;
          return titleA.localeCompare(titleB);
        });
        break;
      case "release_date":
        movies.sort((a, b) => {
          const dateA = (a as any).release_date ? new Date((a as any).release_date).getTime() : 0;
          const dateB = (b as any).release_date ? new Date((b as any).release_date).getTime() : 0;
          return dateB - dateA;
        });
        break;
    }

    return movies;
  }, [allMovies, searchResults, searchQuery, selectedGenre, selectedMood, sortBy, language, relevanceScores, personalScores]);

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

  // Clear stale results when user types (AI search fires on Enter)
  const handleInputChange = (value: string) => {
    setSearchQuery(value);

    if (value.trim() !== activeQueryRef.current) {
      if (value.trim() === "") {
        setSearchResults([]);
        setSnippets({});
        setRelevanceScores({});
        activeQueryRef.current = "";
        const newParams = new URLSearchParams(params);
        newParams.delete("q");
        newParams.delete("mode");
        setParams(newParams, { replace: true });
      } else {
        // Clear old results while typing — actual search fires on Enter
        setSearchResults([]);
        setSnippets({});
        setRelevanceScores({});
      }
    }
  };

  const handleSearch = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (q.length < MIN_SEARCH_LENGTH) return;
    const newParams = new URLSearchParams();
    newParams.set("q", q);
    newParams.set("mode", "ai");
    if (selectedGenre !== "all") newParams.set("genre", selectedGenre);
    if (selectedMood !== "all") newParams.set("mood", selectedMood);
    if (sortBy !== "best") newParams.set("sort", sortBy);
    setParams(newParams);
  }, [searchQuery, selectedGenre, selectedMood, sortBy, setParams]);

  const clearSearch = () => {
    setSearchQuery("");
    setSearchResults([]);
    setSnippets({});
    setRelevanceScores({});
    activeQueryRef.current = "";
    const newParams = new URLSearchParams(params);
    newParams.delete("q");
    newParams.delete("mode");
    setParams(newParams, { replace: true });
  };

  const handleMovieClick = (movie: Movie) => navigate(`/movie/${movie.id}`);

  const sortLabels: Record<SortOption, { en: string; bg: string }> = {
    best: { en: "Best", bg: "Най-добри" },
    rating: { en: "Rating", bg: "Рейтинг" },
    popularity: { en: "Popularity", bg: "Популярност" },
    release_date: { en: "Release Date", bg: "Дата" },
    title: { en: "Title", bg: "Заглавие" },
  };

  const availableSortOptions: SortOption[] = ["best", "rating", "popularity", "release_date", "title"];

  return (
    <div className={`min-h-screen transition-colors ${theme === "dark" ? "bg-[#0B0B12]" : "bg-[#F8F9FC]"}`}>
      {/* Page Header */}
      <div className={`border-b ${theme === "dark" ? "bg-[#121226] border-[#2A2A4A]" : "bg-white border-[#E2E4F0]"}`}>
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-6">
          <h1 className={`text-2xl font-bold ${theme === "dark" ? "text-white" : "text-[#1A1B2E]"}`}>
            {language === "bg" ? "Разгледай филми" : "Browse Movies"}
          </h1>

          {/* AI Search */}
          <form onSubmit={handleSearch} className="mt-4">
            <div className={`relative rounded-lg border transition-all ${
              searchQuery
                ? "border-primary/50 ring-1 ring-primary/20"
                : theme === "dark" ? "border-[#2A2A4A] hover:border-[#3A3A5A]" : "border-[#E2E4F0] hover:border-[#D0D2E4]"
            }`}>
              <Sparkles className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 pointer-events-none text-primary" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleInputChange(e.target.value)}
                placeholder={language === "bg" ? "Опиши какъв филм търсиш... напр. \"забавна комедия за семейството\"" : "Describe what you're looking for... e.g. \"fun family comedy\""}
                className={`w-full pl-12 pr-12 py-3.5 rounded-lg bg-transparent focus:outline-none ${
                  theme === "dark" ? "text-white placeholder-gray-500" : "text-[#1A1B2E] placeholder-gray-400"
                }`}
              />
              <button
                type="button"
                onClick={clearSearch}
                className={`absolute right-3 top-1/2 -translate-y-1/2 flex items-center justify-center transition-colors ${
                  searchQuery
                    ? theme === "dark" ? "text-[#A7A7C7] hover:text-[#EDEDF7]" : "text-[#A7A7C7] hover:text-[#5B5D78]"
                    : "pointer-events-none opacity-0"
                }`}
                tabIndex={searchQuery ? 0 : -1}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex items-center justify-between mt-2">
              <p className={`text-xs flex items-center gap-1.5 ${theme === "dark" ? "text-[#A7A7C7]" : "text-[#5B5D78]"}`}>
                <Sparkles className="w-3 h-3 text-primary" />
                {language === "bg" ? "AI семантично търсене — опиши жанр, настроение или сюжет" : "AI semantic search — describe genre, mood, or plot"}
              </p>
              {searchQuery.trim().length >= MIN_SEARCH_LENGTH && searchResults.length === 0 && !searching && (
                <p className="text-xs font-medium text-primary">
                  {language === "bg" ? "Натисни Enter \u21B5" : "Press Enter \u21B5"}
                </p>
              )}
            </div>
          </form>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-6">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar */}
          <aside className={`lg:w-64 flex-shrink-0 ${showFilters ? "block" : "hidden lg:block"}`}>
            <div className={`rounded-xl border overflow-hidden sticky top-24 ${theme === "dark" ? "bg-[#1A1A33] border-[#2A2A4A]" : "bg-white border-[#E2E4F0] shadow-sm"}`}>
              <div className={`px-4 py-3 border-b font-semibold flex items-center gap-2 ${theme === "dark" ? "border-[#2A2A4A] text-white" : "border-[#E2E4F0] text-[#1A1B2E]"}`}>
                <Filter className="w-4 h-4" />
                {language === "bg" ? "Филтри" : "Filters"}
              </div>

              {/* Sort */}
              <div className={`px-4 py-3 border-b ${theme === "dark" ? "border-[#2A2A4A]" : "border-[#E2E4F0]"}`}>
                <label className={`block text-sm font-medium mb-2 ${theme === "dark" ? "text-[#A7A7C7]" : "text-[#5B5D78]"}`}>
                  {language === "bg" ? "Сортирай" : "Sort by"}
                </label>
                <select
                  value={sortBy}
                  onChange={(e) => { setSortBy(e.target.value as SortOption); setCurrentPage(1); }}
                  className={`w-full px-3 py-2 rounded-lg border ${theme === "dark" ? "bg-[#2A2A4A] border-[#2A2A4A] text-white" : "bg-[#F8F9FC] border-[#E2E4F0] text-[#1A1B2E]"}`}
                >
                  {availableSortOptions.map((s) => (
                    <option key={s} value={s}>
                      {language === "bg" ? sortLabels[s].bg : sortLabels[s].en}
                    </option>
                  ))}
                </select>
              </div>

              {/* Genre */}
              <div className={`px-4 py-3 border-b ${theme === "dark" ? "border-[#2A2A4A]" : "border-[#E2E4F0]"}`}>
                <label className={`block text-sm font-medium mb-2 ${theme === "dark" ? "text-[#A7A7C7]" : "text-[#5B5D78]"}`}>
                  {language === "bg" ? "Жанр" : "Genre"}
                </label>
                <select
                  value={selectedGenre}
                  onChange={(e) => { setSelectedGenre(e.target.value); setCurrentPage(1); }}
                  className={`w-full px-3 py-2 rounded-lg border ${theme === "dark" ? "bg-[#2A2A4A] border-[#2A2A4A] text-white" : "bg-[#F8F9FC] border-[#E2E4F0] text-[#1A1B2E]"}`}
                >
                  <option value="all">{language === "bg" ? "Всички" : "All"}</option>
                  {genres.map((g) => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>

              {/* Mood */}
              <div className="px-4 py-3">
                <label className={`block text-sm font-medium mb-2 ${theme === "dark" ? "text-[#A7A7C7]" : "text-[#5B5D78]"}`}>
                  {language === "bg" ? "Настроение" : "Mood"}
                </label>
                <div className="flex flex-col gap-1.5">
                  {(Object.keys(moodLabels) as MoodOption[]).map((mood) => (
                    <button
                      key={mood}
                      onClick={() => { setSelectedMood(mood); setCurrentPage(1); }}
                      className={`px-3 py-2 text-sm rounded-lg border transition-colors text-left flex items-center gap-2 ${
                        selectedMood === mood
                          ? "bg-primary text-white border-primary font-medium"
                          : theme === "dark" ? "bg-[#2A2A4A] border-[#2A2A4A] text-[#A7A7C7] hover:bg-[#3A3A5A]" : "bg-[#F8F9FC] border-[#E2E4F0] text-[#5B5D78] hover:bg-[#ECEEF8]"
                      }`}
                    >
                      <span className="truncate">{language === "bg" ? moodLabels[mood].bg : moodLabels[mood].en}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Active Filters */}
              {(selectedGenre !== "all" || selectedMood !== "all" || searchQuery) && (
                <div className={`px-4 py-3 border-t ${theme === "dark" ? "border-[#2A2A4A]" : "border-[#E2E4F0]"}`}>
                  <p className={`text-xs font-medium mb-2 ${theme === "dark" ? "text-[#A7A7C7]" : "text-[#5B5D78]"}`}>
                    {language === "bg" ? "Активни:" : "Active:"}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {searchQuery && (
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs ${theme === "dark" ? "bg-primary/20 text-primary" : "bg-primary/10 text-primary"}`}>
                        <Sparkles className="w-3 h-3 flex-shrink-0" />
                        <span className="truncate max-w-[120px]">"{searchQuery.length > 15 ? searchQuery.slice(0, 15) + "..." : searchQuery}"</span>
                        <button onClick={clearSearch} className="flex-shrink-0 w-4 h-4 flex items-center justify-center rounded hover:bg-primary/30 transition-colors"><X className="w-3 h-3" /></button>
                      </span>
                    )}
                    {selectedGenre !== "all" && (
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs ${theme === "dark" ? "bg-blue-500/20 text-blue-400" : "bg-blue-100 text-blue-700"}`}>
                        {selectedGenre}
                        <button onClick={() => setSelectedGenre("all")} className="flex-shrink-0 w-4 h-4 flex items-center justify-center rounded hover:bg-blue-500/30 transition-colors"><X className="w-3 h-3" /></button>
                      </span>
                    )}
                    {selectedMood !== "all" && (
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs ${theme === "dark" ? "bg-amber-500/20 text-amber-400" : "bg-amber-100 text-amber-700"}`}>
                        {language === "bg" ? moodLabels[selectedMood].bg : moodLabels[selectedMood].en}
                        <button onClick={() => setSelectedMood("all")} className="flex-shrink-0 w-4 h-4 flex items-center justify-center rounded hover:bg-amber-500/30 transition-colors"><X className="w-3 h-3" /></button>
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
                <button onClick={() => setShowFilters(!showFilters)} className={`lg:hidden p-2 rounded-lg ${theme === "dark" ? "bg-[#2A2A4A] text-white" : "bg-white text-[#5B5D78] border"}`}>
                  <Filter className="w-5 h-5" />
                </button>
                <p className={`text-sm ${theme === "dark" ? "text-[#A7A7C7]" : "text-[#5B5D78]"}`}>
                  {displayMovies.length} {language === "bg" ? "филма" : "movies"}
                  {totalPages > 1 && ` • ${language === "bg" ? "Страница" : "Page"} ${currentPage}/${totalPages}`}
                </p>
              </div>

              <div className="flex items-center gap-1">
                <button onClick={() => setViewMode("grid")} className={`p-2 rounded ${viewMode === "grid" ? "bg-primary text-white" : theme === "dark" ? "text-[#A7A7C7] hover:bg-[#2A2A4A]" : "text-[#A7A7C7] hover:bg-[#ECEEF8]"}`}>
                  <Grid className="w-5 h-5" />
                </button>
                <button onClick={() => setViewMode("list")} className={`p-2 rounded ${viewMode === "list" ? "bg-primary text-white" : theme === "dark" ? "text-[#A7A7C7] hover:bg-[#2A2A4A]" : "text-[#A7A7C7] hover:bg-[#ECEEF8]"}`}>
                  <List className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Loading */}
            {(loading || searching) && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {[...Array(20)].map((_, i) => (
                  <SkeletonCard key={i} variant="poster" />
                ))}
              </div>
            )}

            {/* Empty */}
            {!loading && !searching && displayMovies.length === 0 && (
              <EmptyState
                icon={Search}
                title={language === "bg" ? "Няма намерени филми" : "No movies found"}
                description={language === "bg" ? "Опитайте с различно търсене" : "Try a different search"}
              />
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
                />
              </>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}