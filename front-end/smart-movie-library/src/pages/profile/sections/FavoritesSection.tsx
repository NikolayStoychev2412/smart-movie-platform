import { useState, useEffect } from "react";
import api from "../../../api/client";
import { Heart } from "lucide-react";
import MovieCarousel from "../components/MovieCarousel";
import { translations } from "../../../i18n/translations";
import type { FavoriteEntry } from "../types";

export default function FavoritesSection({
  theme,
  language,
  onCount,
}: {
  theme: string;
  language: string;
  onCount: (n: number) => void;
}) {
  const t = translations[language as "bg" | "en"];
  const [favorites, setFavorites] = useState<FavoriteEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/favorites/")
      .then(r => { setFavorites(r.data || []); onCount((r.data || []).length); })
      .catch(() => setFavorites([]))
      .finally(() => setLoading(false));
  }, []);

  const movies = favorites.map(f => ({
    movie: f.movie,
    badge: (
      <div className="absolute top-2 right-2 p-1.5 rounded-full bg-secondary">
        <Heart className="w-3 h-3 text-white fill-white" />
      </div>
    ),
  }));

  return (
    <MovieCarousel
      movies={movies} theme={theme} language={language} loading={loading}
      emptyIcon={Heart}
      emptyText={t.noFavorites}
      emptyCta={{ label: t.browseMovies, to: "/browse" }}
    />
  );
}
