// src/components/MovieCard.tsx
import { useState, useEffect, useRef, memo } from 'react';
import { type Movie } from '../types';

interface MovieCardProps {
  movie: Movie;
  onClick?: () => void;
  priority?: boolean; // For above-the-fold images
}

// Memoized component - prevents unnecessary re-renders
const MovieCard = memo(function MovieCard({ movie, onClick, priority = false }: MovieCardProps) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [isVisible, setIsVisible] = useState(priority);
  const cardRef = useRef<HTMLDivElement>(null);

  // Intersection Observer for true lazy loading
  useEffect(() => {
    if (priority) return; // Skip for priority images
    
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '100px' } // Start loading 100px before visible
    );

    if (cardRef.current) {
      observer.observe(cardRef.current);
    }

    return () => observer.disconnect();
  }, [priority]);

  // Rating color based on score
  const getRatingColor = (rating: number): string => {
    if (rating >= 4) return 'text-green-500 border-green-500';
    if (rating >= 3) return 'text-yellow-500 border-yellow-500';
    if (rating >= 2) return 'text-orange-500 border-orange-500';
    return 'text-red-500 border-red-500';
  };

  // TMDb poster URLs support different sizes - use smaller for grid
  const getOptimizedPosterUrl = (url: string | undefined): string => {
    if (!url) return '';
    // TMDb: Replace w500 with w342 for faster loading in grid view
    if (url.includes('image.tmdb.org')) {
      return url.replace('/w500/', '/w342/').replace('/original/', '/w342/');
    }
    return url;
  };

  const posterUrl = getOptimizedPosterUrl(movie.poster_url);
  const hasPoster = posterUrl && !imageError;

  return (
    <div
      ref={cardRef}
      onClick={onClick}
      className="group relative bg-gray-900 rounded-lg overflow-hidden shadow-lg cursor-pointer transform transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:z-10"
    >
      {/* Poster Container */}
      <div className="relative aspect-[2/3] overflow-hidden bg-gray-800">
        {/* Skeleton placeholder - always visible until image loads */}
        {!imageLoaded && (
          <div className="absolute inset-0 bg-gray-800 animate-pulse flex items-center justify-center">
            <svg className="w-12 h-12 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
            </svg>
          </div>
        )}

        {/* Actual image - only render when visible */}
        {isVisible && hasPoster && (
          <img
            src={posterUrl}
            alt={movie.title}
            className={`w-full h-full object-cover transition-all duration-500 group-hover:scale-110 ${
              imageLoaded ? 'opacity-100' : 'opacity-0'
            }`}
            loading={priority ? 'eager' : 'lazy'}
            decoding="async"
            onLoad={() => setImageLoaded(true)}
            onError={() => {
              setImageError(true);
              setImageLoaded(true);
            }}
          />
        )}

        {/* Fallback for no poster */}
        {(!hasPoster && isVisible) && (
          <div className="absolute inset-0 bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
            <div className="text-center p-4">
              <svg className="w-12 h-12 text-gray-600 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
              </svg>
              <span className="text-gray-500 text-xs">{movie.title}</span>
            </div>
          </div>
        )}
        
        {/* Gradient overlay on hover */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        
        {/* Rating badge */}
        <div
          className={`absolute top-2 right-2 w-10 h-10 rounded-full border-2 flex items-center justify-center text-sm font-bold bg-gray-900/80 ${getRatingColor(movie.average_rating)}`}
        >
          {movie.average_rating.toFixed(1)}
        </div>

        {/* Hover info */}
        <div className="absolute bottom-0 left-0 right-0 p-4 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
          <p className="text-gray-300 text-sm line-clamp-3">
            {movie.summary}
          </p>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-xs text-gray-400">
              {movie.review_count} reviews
            </span>
          </div>
        </div>
      </div>

      {/* Title & Genre */}
      <div className="p-3">
        <h3 className="text-white font-semibold truncate text-sm group-hover:text-blue-400 transition-colors">
          {movie.title}
        </h3>
        <p className="text-gray-500 text-xs mt-1 truncate">
          {movie.genre}
        </p>
      </div>
    </div>
  );
});

export default MovieCard;