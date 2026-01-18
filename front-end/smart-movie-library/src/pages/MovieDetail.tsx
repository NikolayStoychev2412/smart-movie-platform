// src/pages/MovieDetail.tsx
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { moviesApi, reviewsApi, watchlistApi } from "../api/movies";
import {
  Play,
  Star,
  Calendar,
  Clock,
  Bookmark,
  Eye,
  Check,
  X,
  ExternalLink,
  TrendingUp,
  User,
  Film,
  Globe,
} from "lucide-react";

interface CastMember {
  id?: number;
  name: string;
  character?: string;
  profile_path?: string;
  order?: number;
}

interface CrewMember {
  id?: number;
  name: string;
  job: string;
  department?: string;
  profile_path?: string;
}

interface ProductionCompany {
  id?: number;
  name: string;
  logo_path?: string;
  origin_country?: string;
}

export default function MovieDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { theme, language } = useApp();

  const [movie, setMovie] = useState<any>(null);
  const [similarMovies, setSimilarMovies] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [watchlistStatus, setWatchlistStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showTrailer, setShowTrailer] = useState(false);

  const isLoggedIn = !!localStorage.getItem("token");

  useEffect(() => {
    if (id) fetchMovieData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const fetchMovieData = async () => {
    try {
      setLoading(true);

      const movieData = await moviesApi.getById(parseInt(id!, 10));
      setMovie(movieData);

      try {
        const similar = await moviesApi.getSimilar(parseInt(id!, 10), 12);
        setSimilarMovies(similar);
      } catch (err) {
        console.warn("Could not fetch similar movies:", err);
      }

      try {
        const reviewsData = await reviewsApi.getForMovie(parseInt(id!, 10));
        setReviews(Array.isArray(reviewsData) ? reviewsData : reviewsData?.items ?? []);
      } catch (err) {
        console.warn("Could not fetch reviews:", err);
      }

      if (isLoggedIn) {
        try {
          const watchlistData = await watchlistApi.getMyWatchlist();
          const list = Array.isArray(watchlistData) ? watchlistData : watchlistData?.items ?? [];
          const entry = list.find((w: any) => w.movie_id === parseInt(id!, 10));
          setWatchlistStatus(entry?.status ?? null);
        } catch (err) {
          console.warn("Could not fetch watchlist status:", err);
        }
      }
    } catch (err) {
      console.error("Failed to fetch movie data:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleWatchlistToggle = async (status: string) => {
    if (!isLoggedIn) {
      navigate("/login");
      return;
    }

    try {
      if (watchlistStatus) {
        if (watchlistStatus === status) {
          await watchlistApi.remove(parseInt(id!, 10));
          setWatchlistStatus(null);
        } else {
          await watchlistApi.updateStatus(parseInt(id!, 10), status);
          setWatchlistStatus(status);
        }
      } else {
        await watchlistApi.add(parseInt(id!, 10), status);
        setWatchlistStatus(status);
      }
    } catch (err) {
      console.error("Watchlist error:", err);
    }
  };

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${theme === "dark" ? "bg-tmdb-dark" : "bg-gray-100"}`}>
        <div className="w-12 h-12 border-4 border-tmdb-light-blue border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!movie) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${theme === "dark" ? "bg-tmdb-dark" : "bg-gray-100"}`}>
        <div className="text-center">
          <p className="text-gray-400 text-xl mb-4">Movie not found</p>
          <button onClick={() => navigate("/")} className="px-6 py-2 bg-tmdb-light-blue text-white rounded-full hover:opacity-90">
            Go Home
          </button>
        </div>
      </div>
    );
  }

  const title = language === "bg" ? movie.title_bg || movie.title : movie.title;
  const tagline = language === "bg" ? movie.tagline_bg || movie.tagline : movie.tagline;
  const summary = language === "bg" ? movie.summary_bg || movie.summary : movie.summary;

  const genresText =
    typeof (language === "bg" ? (movie.genre_bg ?? movie.genre) : movie.genre) === "string"
      ? (language === "bg" ? (movie.genre_bg ?? movie.genre) : movie.genre)
      : Array.isArray(movie.genres)
        ? movie.genres.map((g: any) => g.name).join(", ")
        : "";

  const cast: CastMember[] = Array.isArray(movie.cast) ? movie.cast : [];
  const crew: CrewMember[] = Array.isArray(movie.crew) ? movie.crew : [];
  const productionCompanies: ProductionCompany[] = Array.isArray(movie.production_companies) ? movie.production_companies : [];

  const posterUrl = movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : movie.poster_url;
  const backdropUrl = movie.backdrop_path ? `https://image.tmdb.org/t/p/w1280${movie.backdrop_path}` : movie.backdrop_url;

  const director = movie.director || crew.find((c) => c.job === "Director")?.name;

  const userScore = Math.round((movie.average_rating ?? 0) * 20);
  const getUserScoreColor = () => {
    if (userScore >= 70) return { stroke: "#21d07a", bg: "#204529" };
    if (userScore >= 50) return { stroke: "#d2d531", bg: "#423d0f" };
    return { stroke: "#db2360", bg: "#571435" };
  };
  const scoreColors = getUserScoreColor();

  const releaseDate =
    movie.release_date && !Number.isNaN(new Date(movie.release_date).getTime())
      ? new Date(movie.release_date).toLocaleDateString(language === "bg" ? "bg-BG" : "en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        })
      : null;

  return (
    <div className={`min-h-screen ${theme === "dark" ? "bg-tmdb-dark" : "bg-gray-100"}`}>
      {/* Hero */}
      <div className="relative">
        {backdropUrl && (
          <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${backdropUrl})` }}>
            <div className="absolute inset-0 bg-gradient-to-r from-tmdb-dark-blue via-tmdb-dark-blue/95 to-tmdb-dark-blue/60" />
            <div className="absolute inset-0 bg-gradient-to-t from-tmdb-dark via-transparent to-transparent" />
          </div>
        )}

        <div className="relative max-w-7xl mx-auto px-6 py-12">
          <div className="flex flex-col lg:flex-row gap-8">
            <div className="flex-shrink-0">
              <div className="w-full lg:w-[300px] rounded-lg overflow-hidden shadow-2xl">
                {posterUrl ? (
                  <img
                    src={posterUrl}
                    alt={title}
                    className="w-full h-auto"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                  />
                ) : (
                  <div className="aspect-[2/3] bg-gray-800 flex items-center justify-center">
                    <Film className="w-20 h-20 text-gray-600" />
                  </div>
                )}
              </div>
            </div>

            <div className="flex-1 text-white">
              <h1 className="text-4xl lg:text-5xl font-bold mb-2">
                {title}
                {movie.release_year && <span className="text-gray-400 font-normal ml-2">({movie.release_year})</span>}
              </h1>

              <div className="flex flex-wrap items-center gap-4 text-sm mb-4">
                {movie.adult && <span className="px-2 py-0.5 border border-gray-400 text-gray-400">R</span>}
                {releaseDate && (
                  <span className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {releaseDate}
                  </span>
                )}
                {movie.runtime && (
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {movie.runtime_formatted || `${movie.runtime}m`}
                  </span>
                )}
              </div>

              {genresText && (
                <div className="flex flex-wrap gap-2 mb-6">
                  {genresText.split(",").map((genre: string, i: number) => (
                    <span key={i} className="px-3 py-1 bg-white/10 backdrop-blur-sm rounded-full text-sm">
                      {genre.trim()}
                    </span>
                  ))}
                </div>
              )}

              {tagline && <p className="text-gray-300 italic text-lg mb-6">"{tagline}"</p>}

              <div className="flex flex-wrap items-center gap-6 mb-6">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <svg className="transform -rotate-90" width="60" height="60" viewBox="0 0 60 60">
                      <circle cx="30" cy="30" r="26" fill="#081c22" stroke={scoreColors.bg} strokeWidth="4" />
                      <circle
                        cx="30"
                        cy="30"
                        r="26"
                        fill="none"
                        stroke={scoreColors.stroke}
                        strokeWidth="4"
                        strokeLinecap="round"
                        strokeDasharray={`${2 * Math.PI * 26}`}
                        strokeDashoffset={`${2 * Math.PI * 26 * (1 - userScore / 100)}`}
                      />
                    </svg>
                    <span className="absolute inset-0 flex items-center justify-center text-white font-bold text-sm">
                      {userScore}
                      <sup className="text-[8px]">%</sup>
                    </span>
                  </div>
                  <div>
                    <div className="text-white font-semibold">User</div>
                    <div className="text-white font-semibold">Score</div>
                  </div>
                </div>

                {isLoggedIn && (
                  <>
                    <button
                      onClick={() => handleWatchlistToggle("planned")}
                      className={`p-3 rounded-full transition-colors ${
                        watchlistStatus === "planned"
                          ? "bg-tmdb-light-blue text-white"
                          : "bg-tmdb-dark-blue/80 hover:bg-tmdb-dark-blue text-white"
                      }`}
                      title="Add to watchlist"
                    >
                      <Bookmark className="w-5 h-5" />
                    </button>

                    <button
                      onClick={() => handleWatchlistToggle("completed")}
                      className={`p-3 rounded-full transition-colors ${
                        watchlistStatus === "completed"
                          ? "bg-green-600 text-white"
                          : "bg-tmdb-dark-blue/80 hover:bg-tmdb-dark-blue text-white"
                      }`}
                      title="Mark as watched"
                    >
                      <Check className="w-5 h-5" />
                    </button>

                    <button
                      onClick={() => handleWatchlistToggle("watching")}
                      className={`p-3 rounded-full transition-colors ${
                        watchlistStatus === "watching"
                          ? "bg-blue-600 text-white"
                          : "bg-tmdb-dark-blue/80 hover:bg-tmdb-dark-blue text-white"
                      }`}
                      title="Currently watching"
                    >
                      <Eye className="w-5 h-5" />
                    </button>
                  </>
                )}

                {movie.trailer_youtube_key && (
                  <button
                    onClick={() => setShowTrailer(true)}
                    className="flex items-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
                  >
                    <Play className="w-5 h-5" />
                    <span className="font-semibold">Play Trailer</span>
                  </button>
                )}
              </div>

              <div className="mb-6">
                <h3 className="text-xl font-semibold mb-2">Overview</h3>
                <p className="text-gray-300 leading-relaxed">{summary || "No overview available."}</p>
              </div>

              {director && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <div className="font-semibold">{director}</div>
                    <div className="text-sm text-gray-400">Director</div>
                  </div>

                  {crew
                    .filter((c) => ["Screenplay", "Writer", "Story"].includes(c.job))
                    .slice(0, 2)
                    .map((person, i) => (
                      <div key={i}>
                        <div className="font-semibold">{person.name}</div>
                        <div className="text-sm text-gray-400">{person.job}</div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Trailer Modal */}
      {showTrailer && movie.trailer_youtube_key && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4" onClick={() => setShowTrailer(false)}>
          <div className="relative w-full max-w-5xl aspect-video" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setShowTrailer(false)} className="absolute -top-12 right-0 text-white hover:text-gray-300">
              <X className="w-8 h-8" />
            </button>
            <iframe
              src={`https://www.youtube.com/embed/${movie.trailer_youtube_key}?autoplay=1`}
              className="w-full h-full rounded-lg"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        </div>
      )}

      {/* Main */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-12">
            {cast.length > 0 && (
              <section>
                <h2 className="text-2xl font-semibold text-white mb-6">Top Billed Cast</h2>
                <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
                  {cast.slice(0, 9).map((person, i) => (
                    <div key={i} className="flex-shrink-0 w-[138px]">
                      <div className="rounded-lg overflow-hidden shadow-lg bg-gray-800">
                        {person.profile_path ? (
                          <img src={`https://image.tmdb.org/t/p/w185${person.profile_path}`} alt={person.name} className="w-full aspect-[2/3] object-cover" />
                        ) : (
                          <div className="w-full aspect-[2/3] bg-gray-700 flex items-center justify-center">
                            <User className="w-12 h-12 text-gray-600" />
                          </div>
                        )}
                        <div className="p-3">
                          <div className="font-semibold text-white text-sm line-clamp-2">{person.name}</div>
                          <div className="text-xs text-gray-400 line-clamp-2 mt-1">{person.character}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {crew.length > 0 && (
              <section>
                <h2 className="text-2xl font-semibold text-white mb-6">Crew</h2>
                <div className="space-y-3">
                  {crew.slice(0, 20).map((person, i) => (
                    <div key={i} className="flex gap-4 bg-gray-800 rounded-lg p-4">
                      {person.profile_path ? (
                        <img
                          src={`https://image.tmdb.org/t/p/w185${person.profile_path}`}
                          alt={person.name}
                          className="w-16 h-16 rounded-full object-cover flex-shrink-0"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-full bg-gray-700 flex items-center justify-center flex-shrink-0">
                          <User className="w-8 h-8 text-gray-500" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-white">{person.name}</div>
                        <div className="text-sm text-gray-400">{person.job}</div>
                        {person.department && <div className="text-xs text-gray-500">{person.department}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            <section>
              <h2 className="text-2xl font-semibold text-white mb-6">Reviews ({reviews.length})</h2>
              {reviews.length === 0 ? (
                <div className="text-center py-12 text-gray-400 bg-gray-800/50 rounded-lg">No reviews yet. Be the first!</div>
              ) : (
                <div className="space-y-6">
                  {reviews.map((review: any) => {
                    const created = review.created_at ? new Date(review.created_at) : null;
                    const createdLabel = created && !Number.isNaN(created.getTime()) ? created.toLocaleDateString() : "";

                    const username =
                      review.username ||
                      review.user_name ||
                      (review.user_id ? `User #${review.user_id}` : "Anonymous");

                    const text = review.comment ?? review.content ?? "";

                    return (
                      <div key={review.id ?? `${username}-${createdLabel}`} className="bg-gray-800 rounded-lg p-6">
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <div className="font-semibold text-white">{username}</div>
                            <div className="flex items-center gap-2 text-sm text-gray-400">
                              <Star className="w-4 h-4 fill-yellow-500 text-yellow-500" />
                              <span>{review.rating}/5</span>
                              {createdLabel && (
                                <>
                                  <span>•</span>
                                  <span>{createdLabel}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        <p className="text-gray-300 leading-relaxed">{text}</p>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {similarMovies.length > 0 && (
              <section>
                <h2 className="text-2xl font-semibold text-white mb-6">Recommendations</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {similarMovies.slice(0, 6).map((similar: any) => (
                    <div key={similar.id} onClick={() => navigate(`/movie/${similar.id}`)} className="cursor-pointer group">
                      <div className="relative rounded-lg overflow-hidden shadow-lg">
                        <div className="aspect-video bg-gray-800">
                          {similar.backdrop_path ? (
                            <img
                              src={`https://image.tmdb.org/t/p/w500${similar.backdrop_path}`}
                              alt={similar.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            />
                          ) : similar.poster_path ? (
                            <img
                              src={`https://image.tmdb.org/t/p/w500${similar.poster_path}`}
                              alt={similar.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Film className="w-12 h-12 text-gray-600" />
                            </div>
                          )}
                        </div>
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-3">
                          <div className="text-white font-semibold text-sm line-clamp-2">
                            {language === "bg" ? similar.title_bg || similar.title : similar.title}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* Right column */}
          <div className="space-y-6">
            <div>
              {movie.homepage && (
                <a href={movie.homepage} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-white hover:text-tmdb-light-blue mb-2">
                  <Globe className="w-5 h-5" />
                  <span>Official Website</span>
                  <ExternalLink className="w-4 h-4" />
                </a>
              )}
              {movie.imdb_id && (
                <a
                  href={`https://www.imdb.com/title/${movie.imdb_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-white hover:text-tmdb-light-blue"
                >
                  <span>IMDb</span>
                  <ExternalLink className="w-4 h-4" />
                </a>
              )}
            </div>

            <div className="text-white">
              <h3 className="font-semibold text-lg mb-4">Facts</h3>
              <div className="space-y-4 text-sm">
                {movie.status && (
                  <div>
                    <div className="text-gray-400 font-semibold">Status</div>
                    <div>{movie.status}</div>
                  </div>
                )}

                {movie.original_language && (
                  <div>
                    <div className="text-gray-400 font-semibold">Original Language</div>
                    <div>{String(movie.original_language).toUpperCase()}</div>
                  </div>
                )}

                {movie.budget && movie.budget > 0 && (
                  <div>
                    <div className="text-gray-400 font-semibold">Budget</div>
                    <div>{movie.budget_formatted || `$${Number(movie.budget).toLocaleString()}`}</div>
                  </div>
                )}

                {movie.revenue && movie.revenue > 0 && (
                  <div>
                    <div className="text-gray-400 font-semibold">Revenue</div>
                    <div>{movie.revenue_formatted || `$${Number(movie.revenue).toLocaleString()}`}</div>
                  </div>
                )}

                {movie.tmdb_rating && (
                  <div>
                    <div className="text-gray-400 font-semibold">TMDB Rating</div>
                    <div className="flex items-center gap-2">
                      <Star className="w-4 h-4 fill-yellow-500 text-yellow-500" />
                      {Number(movie.tmdb_rating).toFixed(1)} ({movie.tmdb_vote_count?.toLocaleString?.() ?? movie.tmdb_vote_count ?? 0} votes)
                    </div>
                  </div>
                )}

                {movie.popularity && (
                  <div>
                    <div className="text-gray-400 font-semibold">Popularity</div>
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-tmdb-light-blue" />
                      {Number(movie.popularity).toFixed(0)}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {productionCompanies.length > 0 && (
              <div className="text-white">
                <h3 className="font-semibold text-lg mb-4">Production</h3>
                <div className="space-y-3">
                  {productionCompanies.map((company, i) => (
                    <div key={i} className="flex items-center gap-3">
                      {company.logo_path ? (
                        <img
                          src={`https://image.tmdb.org/t/p/w92${company.logo_path}`}
                          alt={company.name}
                          className="h-8 object-contain filter brightness-0 invert"
                        />
                      ) : (
                        <div className="text-sm">{company.name}</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {Array.isArray(movie.genres) && movie.genres.length > 0 && (
              <div className="text-white">
                <h3 className="font-semibold text-lg mb-4">Genres</h3>
                <div className="flex flex-wrap gap-2">
                  {movie.genres.map((genre: any, i: number) => (
                    <span key={i} className="px-3 py-1 bg-gray-800 rounded-full text-sm">
                      {genre.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
