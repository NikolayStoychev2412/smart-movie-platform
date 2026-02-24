import { useNavigate } from "react-router-dom";
import { Film } from "lucide-react";
import MoviePoster from "../../../components/MoviePoster";
import RatingBadge from "../../../components/RatingBadge";
import { translations } from "../../../i18n/translations";
import type { Movie } from "../../../types";

export default function SimilarMoviesSidebar({ movies, theme, language }: { movies: Movie[]; theme: string; language: string }) {
  const navigate = useNavigate();
  const t = translations[language as "bg" | "en"];

  if (!movies?.length) return null;

  return (
    <div className={`rounded-lg p-5 ${theme === "dark" ? "bg-surface-2" : "bg-white border shadow-sm"}`}>
      <h3 className={`font-bold text-lg mb-4 flex items-center gap-2 text-text`}>
        <Film className="w-5 h-5 text-primary" />
        {t.similarMovies}
      </h3>
      <div className="space-y-3">
        {movies.slice(0, 6).map((m, i) => {
          const movieTitle = language === "bg" ? m.title_bg || m.title : m.title;
          const rating = m.tmdb_rating || m.average_rating || 0;
          const year = m.release_date ? new Date(m.release_date).getFullYear() : null;

          return (
            <div
              key={m.id || i}
              onClick={() => navigate(`/movie/${m.id}`)}
              className={`flex gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                theme === "dark" ? "hover:bg-border" : "hover:bg-surface-2"
              }`}
            >
              <div className="w-12 flex-shrink-0">
                <MoviePoster posterPath={m.poster_path} posterUrl={m.poster_url} alt={movieTitle} size="sm" />
              </div>
              <div className="flex-1 min-w-0">
                <p className={`font-medium text-sm line-clamp-2 text-text`}>
                  {movieTitle}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  {year && (
                    <span className={`text-xs text-muted`}>
                      {year}
                    </span>
                  )}
                  {rating > 0 && (
                    <RatingBadge value={rating > 10 ? rating / 10 : rating} scale={10} size="sm" />
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {movies.length > 6 && (
        <p className={`text-xs text-center mt-4 text-muted`}>
          +{movies.length - 6} {t.more}
        </p>
      )}
    </div>
  );
}
