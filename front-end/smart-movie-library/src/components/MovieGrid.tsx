// src/components/MovieGrid.tsx
import { memo, useMemo } from 'react';
import { type Movie } from '../types';
import MovieCard from './MovieCard';
import { useApp } from '../context/AppContext';

interface MovieGridProps {
  movies: Movie[];
  onMovieClick?: (movie: Movie) => void;
  loading?: boolean;
  emptyMessage?: string;
}

const MovieGrid = memo(function MovieGrid({ 
  movies, 
  onMovieClick, 
  loading = false,
  emptyMessage
}: MovieGridProps) {
  const { theme, t } = useApp();
  
  const priorityCount = useMemo(() => 12, []);

  const defaultEmptyMessage = emptyMessage || t.noMoviesFound;

  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {[...Array(12)].map((_, i) => (
          <div 
            key={i} 
            className="animate-pulse"
            style={{ animationDelay: `${i * 50}ms` }}
          >
            <div className={`aspect-[2/3] rounded-lg relative overflow-hidden ${
              theme === 'dark' ? 'bg-gray-800' : 'bg-gray-300'
            }`}>
              <div className={`absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent ${
                theme === 'dark' ? 'via-gray-700/50' : 'via-gray-200/50'
              } to-transparent`} />
            </div>
            <div className={`mt-2 h-4 rounded w-3/4 ${theme === 'dark' ? 'bg-gray-800' : 'bg-gray-300'}`} />
            <div className={`mt-1 h-3 rounded w-1/2 ${theme === 'dark' ? 'bg-gray-800' : 'bg-gray-300'}`} />
          </div>
        ))}
      </div>
    );
  }

  if (movies.length === 0) {
    return (
      <div className={`flex flex-col items-center justify-center py-16 ${
        theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
      }`}>
        <svg className="w-16 h-16 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
        </svg>
        <p className="text-lg">{defaultEmptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
      {movies.map((movie, index) => (
        <MovieCard
          key={movie.id}
          movie={movie}
          onClick={() => onMovieClick?.(movie)}
          priority={index < priorityCount}
        />
      ))}
    </div>
  );
});

export default MovieGrid;