// src/components/MovieCarousel.tsx
import { useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import type { Movie } from '../types';

interface MovieCarouselProps {
  title: string;
  movies: Movie[];
  loading?: boolean;
  showReason?: boolean;
  reason?: string;
  reasons?: string[];
}

export default function MovieCarousel({ 
  title, 
  movies, 
  loading = false,
  showReason = false,
  reason,
  reasons = []
}: MovieCarouselProps) {
  const { theme, language } = useApp();
  const navigate = useNavigate();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(true);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = 300;
      const newScrollLeft = scrollRef.current.scrollLeft + (direction === 'left' ? -scrollAmount : scrollAmount);
      scrollRef.current.scrollTo({ left: newScrollLeft, behavior: 'smooth' });
    }
  };

  const handleScroll = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setShowLeftArrow(scrollLeft > 0);
      setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  const getTitle = (movie: Movie) => language === 'bg' ? (movie.title_bg || movie.title) : movie.title;

  const getRatingColor = (rating: number): string => {
    if (rating >= 4) return 'text-green-500 border-green-500';
    if (rating >= 3) return 'text-yellow-500 border-yellow-500';
    if (rating >= 2) return 'text-orange-500 border-orange-500';
    return 'text-red-500 border-red-500';
  };

  if (loading) {
    return (
      <div className="mb-8">
        <h2 className={`text-xl font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
          {title}
        </h2>
        <div className="flex gap-4 overflow-hidden">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="flex-shrink-0 w-40">
              <div className={`aspect-[2/3] rounded-lg animate-pulse ${
                theme === 'dark' ? 'bg-gray-800' : 'bg-gray-300'
              }`} />
              <div className={`h-4 mt-2 rounded animate-pulse ${
                theme === 'dark' ? 'bg-gray-800' : 'bg-gray-300'
              }`} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (movies.length === 0) return null;

  return (
    <div className="mb-8 relative group">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            {title}
          </h2>
          {showReason && reason && (
            <p className={`text-sm mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              {reason}
            </p>
          )}
        </div>
        <span className={`text-sm ${theme === 'dark' ? 'text-gray-500' : 'text-gray-600'}`}>
          {movies.length} {language === 'bg' ? 'филма' : 'movies'}
        </span>
      </div>

      {/* Left Arrow */}
      {showLeftArrow && (
        <button
          onClick={() => scroll('left')}
          className={`absolute left-0 top-1/2 transform -translate-y-1/2 z-10 p-2 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity ${
            theme === 'dark' 
              ? 'bg-gray-800 hover:bg-gray-700 text-white' 
              : 'bg-white hover:bg-gray-100 text-gray-900'
          }`}
          style={{ marginTop: '20px' }}
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
      )}

      {/* Right Arrow */}
      {showRightArrow && (
        <button
          onClick={() => scroll('right')}
          className={`absolute right-0 top-1/2 transform -translate-y-1/2 z-10 p-2 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity ${
            theme === 'dark' 
              ? 'bg-gray-800 hover:bg-gray-700 text-white' 
              : 'bg-white hover:bg-gray-100 text-gray-900'
          }`}
          style={{ marginTop: '20px' }}
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      )}

      {/* Carousel */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex gap-4 overflow-x-auto scrollbar-hide scroll-smooth pb-4"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {movies.map((movie, index) => (
          <div
            key={movie.id}
            onClick={() => navigate(`/movie/${movie.id}`)}
            className="flex-shrink-0 w-40 cursor-pointer group/card transition-transform hover:scale-105"
          >
            {/* Poster */}
            <div className="relative aspect-[2/3] rounded-lg overflow-hidden shadow-lg">
              <img
                src={movie.poster_url || 'https://via.placeholder.com/160x240?text=No+Poster'}
                alt={getTitle(movie)}
                className="w-full h-full object-cover"
                loading="lazy"
              />
              
              {/* Rating Badge */}
              <div className={`absolute top-2 right-2 w-9 h-9 rounded-full border-2 flex items-center justify-center text-xs font-bold ${
                theme === 'dark' ? 'bg-gray-900/80' : 'bg-white/90'
              } ${getRatingColor(movie.average_rating)}`}>
                {movie.average_rating.toFixed(1)}
              </div>

              {/* Hover Overlay */}
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/card:opacity-100 transition-opacity flex items-center justify-center">
                <span className="text-white text-sm font-medium">
                  {language === 'bg' ? 'Виж детайли' : 'View Details'}
                </span>
              </div>
            </div>

            {/* Title */}
            <h3 className={`mt-2 text-sm font-medium truncate ${
              theme === 'dark' ? 'text-white' : 'text-gray-900'
            }`}>
              {getTitle(movie)}
            </h3>
            
            {/* Per-movie reason OR genre */}
            {reasons[index] ? (
              <p className={`text-xs truncate mt-0.5 ${
                theme === 'dark' ? 'text-blue-400' : 'text-blue-600'
              }`}>
                {reasons[index]}
              </p>
            ) : (
              <p className={`text-xs truncate ${
                theme === 'dark' ? 'text-gray-500' : 'text-gray-600'
              }`}>
                {language === 'bg' ? (movie.genre_bg || movie.genre) : movie.genre}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}