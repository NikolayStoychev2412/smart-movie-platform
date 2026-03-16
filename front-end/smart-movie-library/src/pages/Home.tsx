import { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { moviesApi } from "../api/movies";
import api from "../api/client";
import type { Movie, Recommendation } from "../types";
import { translateGenre } from "../constants/preferences";
import type { Language } from "../i18n/translations";
import {
  ChevronLeft, ChevronRight, Play, TrendingUp, Star, Calendar, Sparkles, Heart, ListPlus,
  Award, Info
} from "lucide-react";
import RatingBadge from "../components/RatingBadge";

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const logNorm = (x: number, max: number) => (max > 0 ? Math.log1p(x) / Math.log1p(max) : 0);

const normRating01 = (rating: number | undefined) => {
  const r = Number(rating) || 0;
  if (r <= 0) return 0;
  return clamp01(r <= 5 ? r / 5 : r / 10);
};

const combinedRating01 = (m: Movie, K = 30) => {
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

const getTimeDecay = (releaseDate: string | null | undefined): number => {
  if (!releaseDate) return 0.3;
  const now = new Date();
  const release = new Date(releaseDate);
  const yearsOld = (now.getTime() - release.getTime()) / (365.25 * 24 * 60 * 60 * 1000);

  if (yearsOld < 1) return 1.0;      // < 1 year: full weight
  if (yearsOld < 2) return 0.9;      // 1-2 years: slight decay
  if (yearsOld < 3) return 0.75;     // 2-3 years: moderate decay
  if (yearsOld < 5) return 0.5;      // 3-5 years: significant decay
  if (yearsOld < 10) return 0.25;    // 5-10 years: heavy decay
  return 0.1;                         // 10+ years: almost filtered out
};


interface UserState {
  isLoggedIn: boolean;
  hasActivity: boolean;
  personalizedCount: number;
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

  const communityRating = movie.average_rating || 0;
  const reviewCount = movie.review_count || 0;

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
          <div className="w-full h-full bg-gradient-to-br from-surface to-bg" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
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
              <RatingBadge value={movie.tmdb_rating ?? 0} size="md" />

              {reviewCount > 0 && (
                <RatingBadge value={communityRating} scale={5} size="md" />
              )}

              <button
                onClick={() => navigate(`/movie/${movie.id}`)}
                className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white font-semibold rounded-lg hover:bg-primary-hover"
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

function OnboardingCard({ language, theme, onNavigate }: { language: string; theme: string; onNavigate: () => void }) {
  return (
    <section className="relative">
      <div className={`rounded-2xl p-6 md:p-8 ${theme === "dark"
        ? "bg-surface-2 border border-border"
        : "bg-white border border-border"}`}>
        <div className="flex flex-col md:flex-row items-center gap-6">
          <div className="p-4 rounded-full bg-primary">
            <ListPlus className="w-10 h-10 text-white" />
          </div>
          <div className="flex-1 text-center md:text-left">
            <h3 className={`text-xl md:text-2xl font-bold mb-2 text-text`}>
              {language === "bg" ? "Започни своите препоръки" : "Start Your Recommendations"}
            </h3>
            <p className={`text-muted`}>
              {language === "bg"
                ? "Добави филми в списъка си или ги оцени, за да отключиш персонализирани препоръки."
                : "Add movies to your watchlist or rate them to unlock personalized recommendations."}
            </p>
          </div>
          <button
            onClick={onNavigate}
            className="px-6 py-3 bg-primary text-white font-semibold rounded-lg hover:bg-primary-hover transition-all flex items-center gap-2"
          >
            <TrendingUp className="w-5 h-5" />
            {language === "bg" ? "Разгледай Trending" : "Browse Trending"}
          </button>
        </div>
      </div>
    </section>
  );
}

function ForYouCarousel({ recommendations, language, userState, allMovies }: { recommendations: Recommendation[]; language: string; userState: UserState; allMovies: Movie[] }) {
  const navigate = useNavigate();
  const { theme, t } = useApp();
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

  const getSectionInfo = () => {
    if (!userState.hasActivity) {
      return { title: t.forYou, subtitle: t.forYouSubNew };
    }
    return { title: t.forYou, subtitle: t.forYouSubActive };
  };

  const { title, subtitle } = getSectionInfo();

  const findBulgarianTitle = (englishTitle: string): string => {
    // Search in allMovies for a matching movie by English title
    const found = allMovies.find(m =>
      m.title?.toLowerCase() === englishTitle.toLowerCase()
    );
    if (found && found.title_bg) {
      return found.title_bg;
    }
    return englishTitle; // Fallback to English if not found
  };

  const getReason = (rec: Recommendation): string | null => {
    if (!rec.explanation) return null;
    const { reasons, reasons_bg, score_breakdown, based_on, based_on_bg, similar_to, similar_to_bg, genre, mood, matched_genres } = rec.explanation;
    const lang = language as Language;

    // Pick the correct-language backend reason first
    let reason: string | null = language === "bg" ? (reasons_bg?.[0] ?? null) : (reasons?.[0] ?? null);

    if (!reason || reason === "undefined" || reason.trim() === "" ||
      reason.toLowerCase().includes("your watched movies") ||
      reason.toLowerCase().includes("вашите гледани филми")
    ) {
      reason = null;
    }

    // Genre reason — translate genre IDs via preferences.ts GENRES constant
    if (!reason && matched_genres?.length) {
      const genres = matched_genres.map(g => translateGenre(g, lang)).join(', ');
      reason = `${t.becauseYouLike} ${genres}`;
    }

    if (!reason && similar_to) {
      const title = language === "bg" ? (similar_to_bg || findBulgarianTitle(similar_to)) : similar_to;
      reason = `${t.similarTo} ${title}`;
    }

    if (!reason && based_on && based_on.length > 0) {
      const title = language === "bg" ? (based_on_bg?.[0] || findBulgarianTitle(based_on[0])) : based_on[0];
      reason = `${t.becauseYouLiked} ${title}`;
    }

    if (!reason && genre) {
      reason = `${t.genreLabel}: ${translateGenre(genre, lang)}`;
    }

    if (!reason && mood) {
      reason = `${t.moodLabel}: ${mood}`;
    }

    if (!reason && score_breakdown) {
      const topEntry = Object.entries(score_breakdown).filter(([, v]) => v > 0.1).sort((a, b) => b[1] - a[1])[0];
      if (topEntry) {
        const labels: Record<string, string> = {
          genre_similarity: t.similarGenreReason,
          director_match: t.sameDirectorReason,
          mood_match: t.matchingMoodReason,
          popularity: t.popularChoiceReason,
        };
        reason = labels[topEntry[0]] || null;
      }
    }

    if (!reason && !userState.hasActivity) {
      const movieGenreEn = rec.movie.genre?.split(',')[0]?.trim();
      if (movieGenreEn) {
        // Use genre_bg from DB (already translated), fall back to translateGenre
        const displayGenre = language === "bg"
          ? (rec.movie.genre_bg?.split(',')[0]?.trim() || translateGenre(movieGenreEn, lang))
          : movieGenreEn;
        reason = `${t.popularPrefix} ${displayGenre.toLowerCase()}`;
      }
    }

    if (!reason && rec.score >= 0.8) {
      reason = t.highlyRecommended;
    }

    return reason;
  };

  if (!recommendations || recommendations.length < 3) return null;

  return (
    <section className="relative">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/20">
            <Heart className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className={`text-xl font-bold text-text`}>{title}</h2>
            <p className={`text-sm text-muted`}>{subtitle}</p>
          </div>
        </div>
      </div>

      <div className="relative group">
        {canScrollLeft && (
          <button onClick={() => scroll("left")} className={`absolute -left-4 top-1/3 z-10 p-2 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-all ${theme === "dark" ? "bg-border/90 text-white hover:bg-border" : "bg-white text-text hover:bg-surface-2 shadow-md border border-border"}`}>
            <ChevronLeft className="w-6 h-6" />
          </button>
        )}
        {canScrollRight && (
          <button onClick={() => scroll("right")} className={`absolute -right-4 top-1/3 z-10 p-2 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-all ${theme === "dark" ? "bg-border/90 text-white hover:bg-border" : "bg-white text-text hover:bg-surface-2 shadow-md border border-border"}`}>
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
                    <div className={`w-full aspect-[2/3] flex items-center justify-center ${theme === "dark" ? "bg-border" : "bg-gray-200"}`}>
                      <Sparkles className="w-10 h-10 text-muted" />
                    </div>
                  )}
                  <div className="absolute top-2 right-2 px-2 py-1 rounded-md bg-primary text-white text-xs font-bold shadow-lg z-10">
                    {matchPercent}% {t.match}
                  </div>
                  {/* Reason hover overlay */}
                  {reason && (
                    <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/50 to-transparent opacity-0 group-hover/card:opacity-100 transition-all duration-300 flex flex-col justify-end p-3">
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <Heart className="w-3 h-3 text-[#2DD4BF]" />
                        <span className="text-[10px] font-bold text-[#2DD4BF] uppercase tracking-wider">
                          {t.why}
                        </span>
                      </div>
                      <p className="text-white/90 text-[11px] leading-relaxed line-clamp-3">{reason}</p>
                    </div>
                  )}
                </div>
                <div className="pt-3 px-1">
                  <h3 className={`font-semibold text-sm line-clamp-1 group-hover/card:text-primary transition-colors text-text`}>{movieTitle}</h3>
                  {movie.release_date && <p className={`text-xs mt-1 text-muted`}>{new Date(movie.release_date).getFullYear()}</p>}
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
        <h2 className={`text-xl font-bold flex items-center gap-2 text-text`}>
          {Icon && <Icon className="w-5 h-5 text-primary" />}
          {title}
        </h2>
        <button onClick={() => navigate("/browse")} className="text-primary hover:underline text-sm font-medium">
          {language === "bg" ? "Виж всички" : "View All"}
        </button>
      </div>

      <div className="relative group">
        {canScrollLeft && (
          <button onClick={() => scroll("left")} className={`absolute -left-4 top-1/3 z-10 p-2 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-all ${theme === "dark" ? "bg-border/90 text-white hover:bg-border" : "bg-white text-text hover:bg-surface-2 shadow-md border border-border"}`}>
            <ChevronLeft className="w-6 h-6" />
          </button>
        )}
        {canScrollRight && (
          <button onClick={() => scroll("right")} className={`absolute -right-4 top-1/3 z-10 p-2 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-all ${theme === "dark" ? "bg-border/90 text-white hover:bg-border" : "bg-white text-text hover:bg-surface-2 shadow-md border border-border"}`}>
            <ChevronRight className="w-6 h-6" />
          </button>
        )}

        <div ref={scrollRef} className="flex gap-4 overflow-x-auto scrollbar-hide pb-4" style={{ scrollSnapType: "x mandatory" }}>
          {movies.map((movie) => {
            const movieTitle = language === "bg" ? movie.title_bg || movie.title : movie.title;
            const posterUrl = movie.poster_path ? `https://image.tmdb.org/t/p/w342${movie.poster_path}` : movie.poster_url;
            const releaseDate = movie.release_date ? new Date(movie.release_date).toLocaleDateString(language === "bg" ? "bg-BG" : "en-US", { year: "numeric", month: "short", day: "numeric" }) : null;
            const tmdbRating = movie.tmdb_rating || 0;
            const communityRating = movie.average_rating || 0;
            const reviewCount = movie.review_count || 0;

            return (
              <div key={movie.id} onClick={() => navigate(`/movie/${movie.id}`)} className="flex-shrink-0 w-[150px] cursor-pointer group/card" style={{ scrollSnapAlign: "start" }}>
                <div className="relative rounded-lg overflow-hidden shadow-lg">
                  {posterUrl ? (
                    <img src={posterUrl} alt={movieTitle} className="w-full aspect-[2/3] object-cover group-hover/card:scale-105 transition-transform duration-300" loading="lazy" />
                  ) : (
                    <div className={`w-full aspect-[2/3] flex items-center justify-center ${theme === "dark" ? "bg-border" : "bg-gray-200"}`}>
                      <Star className="w-10 h-10 text-muted" />
                    </div>
                  )}
                  <div className="absolute bottom-2 left-2">
                    <RatingBadge value={tmdbRating} size="sm" />
                  </div>
                  {reviewCount > 0 && (
                    <div className="absolute bottom-2 right-2">
                      <RatingBadge value={communityRating} scale={5} size="sm" />
                    </div>
                  )}
                </div>
                <div className="pt-3 px-1">
                  <h3 className={`font-semibold text-sm line-clamp-2 group-hover/card:text-primary transition-colors text-text`}>{movieTitle}</h3>
                  {releaseDate && <p className={`text-xs mt-1 text-muted`}>{releaseDate}</p>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function SpotlightCard({ movie, language }: {
  movie: Movie;
  language: string;
}) {
  const navigate = useNavigate();
  const title = language === "bg" ? movie.title_bg || movie.title : movie.title;
  const summary = language === "bg" ? movie.summary_bg || movie.summary : movie.summary;
  const genre = language === "bg" ? movie.genre_bg || movie.genre : movie.genre;
  const backdropUrl = movie.backdrop_path
    ? `https://image.tmdb.org/t/p/w1280${movie.backdrop_path}`
    : movie.backdrop_url;

  return (
    <section
      onClick={() => navigate(`/movie/${movie.id}`)}
      className="relative rounded-2xl overflow-hidden cursor-pointer group"
      style={{ height: "240px" }}
    >
      {backdropUrl && (
        <img
          src={backdropUrl}
          alt={title}
          className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/50 to-transparent" />

      <div className="relative h-full flex items-center px-6 md:px-10">
        <div className="max-w-lg">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/90 text-white text-xs font-bold mb-3">
            <Award className="w-3.5 h-3.5" />
            {language === "bg" ? "Избор на редактора" : "Editor's Pick"}
          </div>
          <h3 className="text-2xl md:text-3xl font-bold text-white mb-1.5">{title}</h3>
          {genre && (
            <p className="text-sm text-gray-300 mb-2">{genre}</p>
          )}
          {summary && (
            <p className="text-sm text-gray-300 line-clamp-2 mb-3 max-w-md">{summary}</p>
          )}
          <div className="flex items-center gap-3">
            <RatingBadge value={movie.tmdb_rating ?? 0} size="sm" />
            {(movie.review_count || 0) > 0 && (
              <RatingBadge value={movie.average_rating || 0} scale={5} size="sm" />
            )}
            <button className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-white/15 backdrop-blur-sm text-white text-sm font-medium rounded-lg hover:bg-white/25 transition-colors">
              <Info className="w-4 h-4" />
              {language === "bg" ? "Повече" : "More Info"}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

const HERO_MOVIE_IDS = [
  1870,  // Interstellar - Sci-Fi
  1892,  // The Dark Knight - Action/Thriller
  1999,  // Parasite - Thriller/Drama
  1891,  // Inception - Sci-Fi/Action
  1922,  // Avengers: Endgame - Adventure/Action
];

const EDITOR_PICK_IDS = [
  1924,  // Dune: Part Two
  2011,  // Whiplash
  1918,  // Oppenheimer
  2126,  // The Intouchables
  1948,  // Spider-Man: Into the Spider-Verse
  2121,  // The Wild Robot
  1906,  // Spider-Man: Across the Spider-Verse
];

export default function Home() {
  const { theme, language, isAuthenticated } = useApp();
  const navigate = useNavigate();

  const [featuredMovies, setFeaturedMovies] = useState<Movie[]>([]);
  const [trendingMovies, setTrendingMovies] = useState<Movie[]>([]);
  const [topRatedMovies, setTopRatedMovies] = useState<Movie[]>([]);
  const [recentMovies, setRecentMovies] = useState<Movie[]>([]);
  const [allMoviesData, setAllMoviesData] = useState<Movie[]>([]);
  const [forYouRecs, setForYouRecs] = useState<Recommendation[]>([]);
  const [aiError, setAiError] = useState(false);
  const [loading, setLoading] = useState(true);

  const [userState, setUserState] = useState<UserState>({
    isLoggedIn: false,
    hasActivity: false,
    personalizedCount: 0
  });

  const spotlightMovie = useMemo(() => {
    if (allMoviesData.length === 0) return null;
    const movieById = new Map(allMoviesData.map(m => [m.id, m]));
    const now = new Date();
    const utcStart = Date.UTC(now.getUTCFullYear(), 0, 0);
    const dayOfYear = Math.floor((Date.now() - utcStart) / 86400000);
    const pickIndex = dayOfYear % EDITOR_PICK_IDS.length;

    for (let i = 0; i < EDITOR_PICK_IDS.length; i++) {
      const idx = (pickIndex + i) % EDITOR_PICK_IDS.length;
      const movie = movieById.get(EDITOR_PICK_IDS[idx]);
      if (movie && (movie.backdrop_path || movie.backdrop_url)) return movie;
    }
    return topRatedMovies.find(m => m.backdrop_path || m.backdrop_url) || null;
  }, [allMoviesData, topRatedMovies]);

  const isPersonalized = (rec: Recommendation): boolean => {
    if (!rec.explanation) return false;
    const { based_on, similar_to, reasons, reasons_bg, reason } = rec.explanation;

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

  useEffect(() => {
    const fetchMovies = async () => {
      setLoading(true);
      try {
        const allMovies = await moviesApi.getAll();
        setAllMoviesData(allMovies);
        const usedIds = new Set<number>();

        const getPopProxy = (m: Movie): number => {
          return Number(m.popularity) || Number(m.tmdb_vote_count) || Number(m.review_count) || 0;
        };
        let maxPop = 1;
        for (const m of allMovies) maxPop = Math.max(maxPop, getPopProxy(m));

        const movieById = new Map(allMovies.map(m => [m.id, m]));
        const featured = HERO_MOVIE_IDS
          .map(id => movieById.get(id))
          .filter((m): m is Movie => !!m && !!(m.backdrop_path || m.backdrop_url));

        if (featured.length < 3) {
          const fallback = [...allMovies]
            .filter(m => m.backdrop_path || m.backdrop_url)
            .sort((a, b) => {
              const qa = combinedRating01(a, 30);
              const qb = combinedRating01(b, 30);
              const pa = logNorm(getPopProxy(a), maxPop);
              const pb = logNorm(getPopProxy(b), maxPop);
              return (0.7 * qb + 0.3 * pb) - (0.7 * qa + 0.3 * pa);
            })
            .slice(0, 5);
          featured.length = 0;
          featured.push(...fallback);
        }
        featured.forEach(m => usedIds.add(m.id));
        setFeaturedMovies(featured);

        const trending = [...allMovies]
          .filter(m => !usedIds.has(m.id))
          .map(m => {
            const decay = getTimeDecay(m.release_date);
            const pop = logNorm(getPopProxy(m), maxPop);
            const rating = combinedRating01(m, 30);
            const score = decay * (0.65 * pop + 0.35 * rating);
            return { m, score };
          })
          .sort((a, b) => b.score - a.score)
          .slice(0, 20)
          .map(x => x.m);
        trending.forEach(m => usedIds.add(m.id));
        setTrendingMovies(trending);

        const MIN_VOTES = 10;
        const topRated = [...allMovies]
          .filter(m => !usedIds.has(m.id))
          .filter(m => {
            const hasRating = (Number(m.tmdb_rating) || 0) > 0;
            const votes = Number(m.tmdb_vote_count) || Number(m.review_count) || 0;
            return hasRating && votes >= MIN_VOTES;
          })
          .sort((a, b) => {
            const ra = combinedRating01(a, 30);
            const rb = combinedRating01(b, 30);
            if (Math.abs(rb - ra) > 0.01) return rb - ra;
            const va = Number(a.tmdb_vote_count) || Number(a.review_count) || 0;
            const vb = Number(b.tmdb_vote_count) || Number(b.review_count) || 0;
            return vb - va;
          })
          .slice(0, 20);
        topRated.forEach(m => usedIds.add(m.id));
        setTopRatedMovies(topRated);

        const recent = [...allMovies]
          .filter(m => !usedIds.has(m.id))
          .filter(m => m.release_date)
          .sort((a, b) => new Date(b.release_date || '1970-01-01').getTime() - new Date(a.release_date || '1970-01-01').getTime())
          .slice(0, 20);
        setRecentMovies(recent);

      } catch {
      } finally {
        setLoading(false);
      }
    };
    fetchMovies();
  }, []);

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
        setAiError(false);

        // Determine user state based on personalization level
        const personalizedCount = recs.filter(isPersonalized).length;
        setUserState({
          isLoggedIn: true,
          hasActivity: personalizedCount >= 3,
          personalizedCount
        });
      } catch {
        setForYouRecs([]);
        setAiError(true);
        setUserState({ isLoggedIn: true, hasActivity: false, personalizedCount: 0 });
      }
    };

    fetchForYou();
  }, [isAuthenticated]);

  if (loading) {
    return (
      <div className={`min-h-screen bg-bg`}>
        <div className={`h-[500px] md:h-[600px] animate-pulse ${theme === "dark" ? "bg-border" : "bg-gray-300"}`} />
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

  const showForYou = forYouRecs.length >= 3;
  const showOnboarding = isAuthenticated && !showForYou;

  return (
    <div className={`min-h-screen bg-bg`}>
      <HeroCarousel movies={featuredMovies} language={language} />

      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 space-y-10">
        {/* For You - Shows when logged in with recommendations */}
        {showForYou && (
          <ForYouCarousel recommendations={forYouRecs} language={language} userState={userState} allMovies={allMoviesData} />
        )}

        {/* Onboarding Card - Shows when logged in but no recommendations yet */}
        {showOnboarding && !aiError && (
          <OnboardingCard language={language} theme={theme} onNavigate={() => navigate("/browse")} />
        )}

        {/* AI Error notice */}
        {isAuthenticated && aiError && (
          <div className={`rounded-lg p-4 text-sm ${theme === "dark" ? "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20" : "bg-yellow-50 text-yellow-700 border border-yellow-200"}`}>
            {language === "bg"
              ? "AI препоръките са временно недостъпни. Разгледайте популярните филми по-долу."
              : "AI recommendations are temporarily unavailable. Browse trending movies below."}
          </div>
        )}

        <MovieCarousel movies={trendingMovies} title={language === "bg" ? "Популярни" : "Trending"} icon={TrendingUp} language={language} />

        {/* Spotlight Card */}
        {spotlightMovie && (
          <SpotlightCard movie={spotlightMovie} language={language} />
        )}

        <MovieCarousel movies={topRatedMovies} title={language === "bg" ? "Топ рейтинг" : "Top Rated"} icon={Star} language={language} />

        <MovieCarousel movies={recentMovies} title={language === "bg" ? "Нови филми" : "Recently Released"} icon={Calendar} language={language} />

        {/* AI Search Promo */}
        <section className={`relative rounded-2xl p-8 overflow-hidden ${theme === "dark"
          ? "bg-surface-2 border border-border"
          : "bg-white border border-border"}`}>
          <div className="relative flex flex-col md:flex-row items-center gap-6">
            <div className="p-4 rounded-2xl bg-primary">
              <Sparkles className="w-10 h-10 text-white" />
            </div>
            <div className="flex-1 text-center md:text-left">
              <h3 className={`text-2xl font-bold mb-2 text-text`}>
                {language === "bg" ? "AI Интелигентно търсене" : "AI Smart Search"}
              </h3>
              <p className="text-muted">
                {language === "bg"
                  ? "Не знаеш точното заглавие? Опиши какво искаш да гледаш и нашият AI ще намери перфектния филм за теб."
                  : "Don't know the exact title? Describe what you want to watch and our AI will find the perfect movie for you."}
              </p>
            </div>
            <button onClick={() => navigate("/browse")} className="px-6 py-3 bg-primary text-white font-semibold rounded-xl hover:bg-primary-hover transition-all flex items-center gap-2 whitespace-nowrap">
              <Sparkles className="w-5 h-5" />{language === "bg" ? "Опитай AI" : "Try AI Search"}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
