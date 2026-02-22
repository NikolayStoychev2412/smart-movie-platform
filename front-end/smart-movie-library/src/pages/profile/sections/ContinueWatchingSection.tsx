import { useState, useEffect } from "react";
import api from "../../../api/client";
import type { WatchlistEntry, Movie } from "../../../types";
import { Play } from "lucide-react";
import MovieCarousel from "../components/MovieCarousel";
import SectionHeader from "../components/SectionHeader";

export default function ContinueWatchingSection({
  theme,
  language,
  onCount,
}: {
  theme: string;
  language: string;
  onCount: (n: number) => void;
}) {
  const [watching, setWatching] = useState<WatchlistEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/watchlist/")
      .then(r => {
        const w = (r.data || []).filter((e: WatchlistEntry) => e.status === "watching");
        setWatching(w);
        onCount(w.length);
      })
      .catch(() => setWatching([]))
      .finally(() => setLoading(false));
  }, []);

  const movies = watching.filter(e => e.movie).map(e => ({
    movie: e.movie as Movie,
    badge: (
      <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-yellow-500 flex items-center gap-1">
        <Play className="w-3 h-3 text-white fill-white" />
        <span className="text-white text-[10px] font-bold hidden sm:inline">
          {language === "bg" ? "Гледам" : "Watching"}
        </span>
      </div>
    ),
  }));

  if (!loading && movies.length === 0) return null;

  return (
    <section>
      <SectionHeader
        icon={Play} iconColor="bg-yellow-500/10 text-yellow-500"
        label={language === "bg" ? "Продължи да гледаш" : "Continue Watching"}
        count={movies.length}
        viewAllTo="/watchlist" viewAllLabel={language === "bg" ? "Виж всички" : "View All"}
        theme={theme}
      />
      <MovieCarousel
        movies={movies} theme={theme} language={language} loading={loading}
        emptyIcon={Play}
        emptyText=""
      />
    </section>
  );
}
