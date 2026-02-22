import { useState, useEffect } from "react";
import api from "../../../api/client";
import type { WatchlistEntry, Movie } from "../../../types";
import { Bookmark } from "lucide-react";
import MovieCarousel from "../components/MovieCarousel";

export default function WatchlistSection({
  theme,
  language,
  onCount,
}: {
  theme: string;
  language: string;
  onCount: (n: number) => void;
}) {
  const [watchlist, setWatchlist] = useState<WatchlistEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/watchlist/")
      .then(r => {
        const w = (r.data || []).filter((e: WatchlistEntry) => e.status === "planned" || e.status === "watching");
        setWatchlist(w);
        onCount(w.length);
      })
      .catch(() => setWatchlist([]))
      .finally(() => setLoading(false));
  }, []);

  const movies = watchlist.filter(e => e.movie).map(e => ({
    movie: e.movie as Movie,
    badge: (
      <div className={`absolute top-2 right-2 p-1.5 rounded-full ${e.status === "watching" ? "bg-yellow-500" : "bg-blue-500"}`}>
        <Bookmark className="w-3 h-3 text-white" />
      </div>
    ),
  }));

  return (
    <MovieCarousel
      movies={movies} theme={theme} language={language} loading={loading}
      emptyIcon={Bookmark}
      emptyText={language === "bg" ? "Списъкът е празен" : "Watchlist is empty"}
      emptyCta={{ label: language === "bg" ? "Разгледай филми" : "Browse Movies", to: "/browse" }}
    />
  );
}
