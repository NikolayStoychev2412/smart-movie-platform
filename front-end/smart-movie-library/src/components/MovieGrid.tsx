// src/components/MovieGrid.tsx
import type { Movie } from '../types';
import MovieCard from './MovieCard';
import { useApp } from '../context/AppContext';

interface MovieGridProps {
  movies: Movie[];
  onMovieClick?: (movie: Movie) => void;
  loading?: boolean;
  emptyMessage?: string;
}

export default function MovieGrid({ movies, onMovieClick, loading = false, emptyMessage }: MovieGridProps) {
  const { t } = useApp();
  
  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {[...Array(12)].map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="aspect-[2/3] bg-gray-300 dark:bg-gray-800 rounded-lg" />
            <div className="mt-2 h-4 bg-gray-300 dark:bg-gray-800 rounded w-3/4" />
            <div className="mt-1 h-3 bg-gray-300 dark:bg-gray-800 rounded w-1/2" />
          </div>
        ))}
      </div>
    );
  }

  if (movies.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-gray-500 dark:text-gray-400">
        <svg className="w-16 h-16 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
        </svg>
        <p className="text-lg">{emptyMessage || t.noMoviesFound}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
      {movies.map((movie) => (
        <MovieCard key={movie.id} movie={movie} onClick={() => onMovieClick?.(movie)} />
      ))}
    </div>
  );
}