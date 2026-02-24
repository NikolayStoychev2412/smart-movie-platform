import { useState, useEffect } from "react";
import api from "../../../api/client";
import type { WatchlistEntry, Movie } from "../../../types";
import { Check } from "lucide-react";
import MovieCarousel from "../components/MovieCarousel";
import { translations } from "../../../i18n/translations";

export default function CompletedSection({
  theme,
  language,
  onCount,
}: {
  theme: string;
  language: string;
  onCount: (n: number) => void;
}) {
  const t = translations[language as "bg" | "en"];
  const [completed, setCompleted] = useState<WatchlistEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/watchlist/")
      .then(r => {
        const c = (r.data || []).filter((e: WatchlistEntry) => e.status === "completed");
        setCompleted(c);
        onCount(c.length);
      })
      .catch(() => setCompleted([]))
      .finally(() => setLoading(false));
  }, []);

  const movies = completed.filter(e => e.movie).map(e => ({
    movie: e.movie as Movie,
    badge: (
      <div className="absolute top-2 right-2 p-1.5 rounded-full bg-green-500">
        <Check className="w-3 h-3 text-white" />
      </div>
    ),
  }));

  return (
    <MovieCarousel
      movies={movies} theme={theme} language={language} loading={loading}
      emptyIcon={Check}
      emptyText={t.noCompleted}
      emptyCta={{ label: t.browseMovies, to: "/browse" }}
    />
  );
}
