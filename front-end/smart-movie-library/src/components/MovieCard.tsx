// src/components/MovieCard.tsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Check, Loader2 } from 'lucide-react';
import type { Movie } from '../types';
import { useApp } from '../context/AppContext';
import api from '../api/client';

interface MovieCardProps {
  movie: Movie;
  onClick?: () => void;
}

export default function MovieCard({ movie, onClick }: MovieCardProps) {
  const navigate = useNavigate();
  const { language, t } = useApp();
  const [inWatchlist, setInWatchlist] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const isLoggedIn = !!localStorage.getItem('token');

  useEffect(() => {
    if (isLoggedIn) {
      checkWatchlistStatus();
    }
  }, [isLoggedIn, movie.id]);

  const checkWatchlistStatus = async () => {
    try {
      const response = await api.get('/watchlist/');
      const inList = response.data.some((i: { movie_id: number }) => i.movie_id === movie.id);
      setInWatchlist(inList);
    } catch {
      setInWatchlist(false);
    }
  };

  const handleWatchlistClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!isLoggedIn) {
      navigate('/login');
      return;
    }

    setLoading(true);
    try {
      if (inWatchlist) {
        // DELETE uses movie_id in URL
        await api.delete(`/watchlist/${movie.id}`);
        setInWatchlist(false);
      } else {
        // POST with lowercase status
        await api.post('/watchlist/', { 
          movie_id: movie.id, 
          status: 'planned'  // lowercase!
        });
        setInWatchlist(true);
      }
    } catch (err) {
      console.error('Watchlist error:', err);
    } finally {
      setLoading(false);
    }
  };

  const getRatingColor = (rating: number): string => {
    if (rating >= 4) return 'text-green-500 border-green-500';
    if (rating >= 3) return 'text-yellow-500 border-yellow-500';
    if (rating >= 2) return 'text-orange-500 border-orange-500';
    return 'text-red-500 border-red-500';
  };

  const posterUrl = movie.poster_url || 'https://via.placeholder.com/300x450?text=No+Poster';
  const title = language === 'bg' ? (movie.title_bg || movie.title) : movie.title;
  const genre = language === 'bg' ? (movie.genre_bg || movie.genre) : movie.genre;
  const summary = language === 'bg' ? (movie.summary_bg || movie.summary) : movie.summary;

  return (
    <div
      onClick={onClick}
      className="group relative bg-white dark:bg-gray-900 rounded-lg overflow-hidden shadow-lg cursor-pointer transform transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:z-10"
    >
      <div className="relative aspect-[2/3] overflow-hidden">
        <img
          src={posterUrl}
          alt={title}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
          loading="lazy"
        />
        
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        
        {/* Rating badge */}
        <div
          className={`absolute top-2 right-2 w-10 h-10 rounded-full border-2 flex items-center justify-center text-sm font-bold bg-white dark:bg-gray-900/80 ${getRatingColor(movie.average_rating)}`}
        >
          {movie.average_rating.toFixed(1)}
        </div>

        {/* Watchlist Button - GREEN when in watchlist */}
        <button
          onClick={handleWatchlistClick}
          className={`absolute top-2 left-2 p-2 rounded-full transition-all ${
            inWatchlist
              ? 'bg-green-600 text-white hover:bg-green-700'
              : 'bg-gray-900/70 text-white hover:bg-gray-800'
          }`}
          title={inWatchlist 
            ? (language === 'bg' ? 'Премахни от списък' : 'Remove from watchlist')
            : (language === 'bg' ? 'Добави в списък' : 'Add to watchlist')
          }
        >
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : inWatchlist ? (
            <Check className="w-5 h-5" />
          ) : (
            <Plus className="w-5 h-5" />
          )}
        </button>

        {/* Hover info */}
        <div className="absolute bottom-0 left-0 right-0 p-4 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
          <p className="text-gray-300 text-sm line-clamp-3">{summary}</p>
          <span className="text-xs text-gray-400 mt-2 block">{movie.review_count} {t.reviews}</span>
        </div>
      </div>

      <div className="p-3">
        <h3 className="text-gray-900 dark:text-white font-semibold truncate text-sm group-hover:text-blue-500 transition-colors">{title}</h3>
        <p className="text-gray-500 text-xs mt-1 truncate">{genre}</p>
      </div>
    </div>
  );
}