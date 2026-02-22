import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import type { Movie } from "../../../types";
import { ChevronLeft, ChevronRight, Film, Star, Compass } from "lucide-react";
import SkeletonCard from "./SkeletonCard";

interface MovieCarouselProps {
  movies: { movie: Movie; badge?: React.ReactNode }[];
  theme: string;
  language: string;
  emptyIcon: React.ComponentType<{ className?: string }>;
  emptyText: string;
  emptyCta?: { label: string; to: string };
  loading?: boolean;
}

export default function MovieCarousel({
  movies,
  theme,
  language,
  emptyIcon: EmptyIcon,
  emptyText,
  emptyCta,
  loading = false,
}: MovieCarouselProps) {
  const navigate = useNavigate();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setCanScrollLeft(scrollLeft > 5);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 5);
    }
  };

  const scroll = (direction: "left" | "right") => {
    scrollRef.current?.scrollBy({ left: direction === "left" ? -300 : 300, behavior: "smooth" });
    setTimeout(checkScroll, 350);
  };

  useEffect(() => {
    checkScroll();
    const ref = scrollRef.current;
    ref?.addEventListener("scroll", checkScroll);
    return () => ref?.removeEventListener("scroll", checkScroll);
  }, [movies]);

  if (loading) {
    return (
      <div className="flex gap-4 overflow-hidden pb-4 px-1">
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonCard key={i} theme={theme} />
        ))}
      </div>
    );
  }

  if (movies.length === 0) {
    return (
      <div className={`text-center py-12 rounded-xl ${theme === "dark" ? "bg-surface-2/50" : "bg-surface-2"}`}>
        <EmptyIcon className={`w-12 h-12 mx-auto mb-3 text-muted`} />
        <p className={`text-sm mb-4 text-muted`}>{emptyText}</p>
        {emptyCta && (
          <Link
            to={emptyCta.to}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary text-white font-semibold text-sm hover:brightness-110 transition"
          >
            <Compass className="w-4 h-4" />
            {emptyCta.label}
          </Link>
        )}
      </div>
    );
  }

  return (
    <div className="relative group">
      {canScrollLeft && (
        <button
          onClick={() => scroll("left")}
          className={`hidden md:block absolute -left-4 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-all ${
            theme === "dark" ? "bg-border text-white hover:bg-border" : "bg-white text-gray-800 hover:bg-bg border"
          }`}
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
      )}
      {canScrollRight && (
        <button
          onClick={() => scroll("right")}
          className={`hidden md:block absolute -right-4 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-all ${
            theme === "dark" ? "bg-border text-white hover:bg-border" : "bg-white text-gray-800 hover:bg-bg border"
          }`}
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      )}

      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto pb-4 px-1"
        style={{ scrollbarWidth: "none", scrollSnapType: "x mandatory" }}
      >
        {movies.map(({ movie, badge }, idx) => {
          const title = language === "bg" ? movie.title_bg || movie.title : movie.title;
          const posterUrl = movie.poster_url || (movie.poster_path ? `https://image.tmdb.org/t/p/w342${movie.poster_path}` : null);
          const rating = movie.tmdb_rating || movie.average_rating;

          return (
            <div
              key={movie.id || idx}
              onClick={() => navigate(`/movie/${movie.id}`)}
              className="flex-shrink-0 w-[140px] cursor-pointer group/card"
              style={{ scrollSnapAlign: "start" }}
            >
              <div className="relative rounded-lg overflow-hidden shadow-lg">
                {posterUrl ? (
                  <img src={posterUrl} alt={title} className="w-full aspect-[2/3] object-cover group-hover/card:scale-105 transition-transform duration-300" loading="lazy" />
                ) : (
                  <div className={`w-full aspect-[2/3] flex items-center justify-center ${theme === "dark" ? "bg-border" : "bg-gray-200"}`}>
                    <Film className="w-10 h-10 text-muted" />
                  </div>
                )}
                {badge}
                {rating && rating > 0 && (
                  <div className="absolute bottom-2 left-2 px-1.5 py-0.5 rounded bg-black/70 flex items-center gap-1">
                    <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                    <span className="text-white text-xs font-medium">{(rating > 5 ? rating : rating * 2).toFixed(1)}</span>
                  </div>
                )}
                <div className="absolute inset-0 bg-black/0 group-hover/card:bg-black/40 transition-all duration-200 hidden md:flex items-center justify-center opacity-0 group-hover/card:opacity-100">
                  <span className="text-white text-xs font-medium px-3 py-1.5 rounded-lg bg-white/20">
                    {language === "bg" ? "Детайли" : "Details"}
                  </span>
                </div>
              </div>
              <div className="pt-2 px-0.5">
                <h3 className={`font-medium text-sm line-clamp-2 group-hover/card:text-primary transition-colors text-text`}>
                  {title}
                </h3>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
