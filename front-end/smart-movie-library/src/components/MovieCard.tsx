// src/components/MovieCard.tsx
import { type Movie} from '../types/index';

interface MovieCardProps {
  movie: Movie;
  onClick?: () => void;
}

export default function MovieCard({ movie, onClick }: MovieCardProps) {
  // Rating color based on score
  const getRatingColor = (rating: number): string => {
    if (rating >= 4) return 'text-green-500 border-green-500';
    if (rating >= 3) return 'text-yellow-500 border-yellow-500';
    if (rating >= 2) return 'text-orange-500 border-orange-500';
    return 'text-red-500 border-red-500';
  };

  // Default poster if none provided
  const posterUrl = movie.poster_url || 'https://via.placeholder.com/300x450?text=No+Poster';

  return (
    <div
      onClick={onClick}
      className="group relative bg-gray-900 rounded-lg overflow-hidden shadow-lg cursor-pointer transform transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:z-10"
    >
      {/* Poster Image */}
      <div className="relative aspect-[2/3] overflow-hidden">
        <img
          src={posterUrl}
          alt={movie.title}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
          loading="lazy"
        />
        
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
}