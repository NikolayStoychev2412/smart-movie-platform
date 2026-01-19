// src/pages/Watchlist.tsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Clock, CheckCircle, Eye, Trash2, Film, Loader2, 
  Calendar, Star, Filter, XCircle
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import api from '../api/client';
import type { Movie, WatchStatus } from '../types';

interface WatchlistItem {
  id: number;
  movie_id: number;
  status: WatchStatus;
  created_at: string;
  updated_at: string;
  movie: Movie;
}

export default function Watchlist() {
  const navigate = useNavigate();
  const { language, theme, isAuthenticated } = useApp();
  
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<WatchStatus | 'all'>('all');

  useEffect(() => {
    // Check auth after a small delay to let AppContext initialize
    const checkAndFetch = async () => {
      // Check if token exists (more reliable than context state on mount)
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login', { state: { from: '/watchlist' } });
        return;
      }
      await fetchWatchlist();
    };
    
    checkAndFetch();
  }, [navigate]);

  const fetchWatchlist = async () => {
    setLoading(true);
    try {
      const response = await api.get('/watchlist/');
      setItems(response.data || []);
    } catch (err: any) {
      console.error('Error fetching watchlist:', err);
      // If unauthorized, redirect to login
      if (err.response?.status === 401) {
        navigate('/login', { state: { from: '/watchlist' } });
      }
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (movieId: number, newStatus: WatchStatus) => {
    try {
      await api.put(`/watchlist/${movieId}`, { status: newStatus });
      setItems(items.map(item => 
        item.movie_id === movieId ? { ...item, status: newStatus } : item
      ));
    } catch (err) {
      console.error('Error updating status:', err);
    }
  };

  const removeFromWatchlist = async (movieId: number) => {
    try {
      await api.delete(`/watchlist/${movieId}`);
      setItems(items.filter(item => item.movie_id !== movieId));
    } catch (err) {
      console.error('Error removing from watchlist:', err);
    }
  };

  const getStatusIcon = (status: WatchStatus) => {
    switch (status) {
      case 'planned': return <Clock className="w-4 h-4" />;
      case 'watching': return <Eye className="w-4 h-4" />;
      case 'completed': return <CheckCircle className="w-4 h-4" />;
      case 'dropped': return <XCircle className="w-4 h-4" />;
    }
  };

  const getStatusColor = (status: WatchStatus) => {
    switch (status) {
      case 'planned': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'watching': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      case 'completed': return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'dropped': return 'bg-red-500/10 text-red-500 border-red-500/20';
    }
  };

  const getStatusLabel = (status: WatchStatus) => {
    if (language === 'bg') {
      switch (status) {
        case 'planned': return 'Планиран';
        case 'watching': return 'Гледам';
        case 'completed': return 'Изгледан';
        case 'dropped': return 'Отказан';
      }
    } else {
      switch (status) {
        case 'planned': return 'Planned';
        case 'watching': return 'Watching';
        case 'completed': return 'Completed';
        case 'dropped': return 'Dropped';
      }
    }
  };

  const filteredItems = filter === 'all' 
    ? items 
    : items.filter(item => item.status === filter);

  const stats = {
    total: items.length,
    planned: items.filter(i => i.status === 'planned').length,
    watching: items.filter(i => i.status === 'watching').length,
    completed: items.filter(i => i.status === 'completed').length,
    dropped: items.filter(i => i.status === 'dropped').length,
  };

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${theme === 'dark' ? 'bg-tmdb-dark' : 'bg-gray-50'}`}>
        <Loader2 className="w-8 h-8 animate-spin text-tmdb-light-blue" />
      </div>
    );
  }

  return (
    <div className={`min-h-screen transition-colors ${theme === 'dark' ? 'bg-tmdb-dark' : 'bg-gray-50'}`}>
      {/* Header */}
      <div className={`border-b ${theme === 'dark' ? 'bg-gray-900/50 border-gray-800' : 'bg-white border-gray-200'}`}>
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">
          <h1 className={`text-3xl font-bold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            {language === 'bg' ? 'Моят списък' : 'My Watchlist'}
          </h1>
          <p className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
            {language === 'bg' 
              ? 'Следете филмите, които искате да гледате'
              : 'Keep track of movies you want to watch'
            }
          </p>

          {/* Stats */}
          <div className="flex flex-wrap gap-3 mt-6">
            <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${theme === 'dark' ? 'bg-gray-800' : 'bg-gray-100'}`}>
              <Film className={`w-5 h-5 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`} />
              <span className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{stats.total}</span>
              <span className={theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}>{language === 'bg' ? 'Общо' : 'Total'}</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-blue-500/10 rounded-lg">
              <Clock className="w-5 h-5 text-blue-500" />
              <span className="text-blue-500 font-medium">{stats.planned}</span>
              <span className="text-blue-500/70">{language === 'bg' ? 'Планирани' : 'Planned'}</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-yellow-500/10 rounded-lg">
              <Eye className="w-5 h-5 text-yellow-500" />
              <span className="text-yellow-500 font-medium">{stats.watching}</span>
              <span className="text-yellow-500/70">{language === 'bg' ? 'Гледам' : 'Watching'}</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-green-500/10 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <span className="text-green-500 font-medium">{stats.completed}</span>
              <span className="text-green-500/70">{language === 'bg' ? 'Изгледани' : 'Completed'}</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-red-500/10 rounded-lg">
              <XCircle className="w-5 h-5 text-red-500" />
              <span className="text-red-500 font-medium">{stats.dropped}</span>
              <span className="text-red-500/70">{language === 'bg' ? 'Отказани' : 'Dropped'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">
        {/* Filter */}
        <div className="flex items-center gap-2 mb-6 flex-wrap">
          <Filter className={`w-5 h-5 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`} />
          <span className={`mr-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
            {language === 'bg' ? 'Филтър:' : 'Filter:'}
          </span>
          {(['all', 'planned', 'watching', 'completed', 'dropped'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                filter === status
                  ? 'bg-tmdb-light-blue text-tmdb-dark-blue'
                  : theme === 'dark' 
                    ? 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {status === 'all' 
                ? (language === 'bg' ? 'Всички' : 'All')
                : getStatusLabel(status)
              }
            </button>
          ))}
        </div>

        {/* Watchlist Items */}
        {filteredItems.length === 0 ? (
          <div className={`rounded-xl p-12 text-center ${theme === 'dark' ? 'bg-gray-900' : 'bg-white border border-gray-200'}`}>
            <Film className={`w-16 h-16 mx-auto mb-4 ${theme === 'dark' ? 'text-gray-700' : 'text-gray-300'}`} />
            <h3 className={`text-xl font-medium mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              {language === 'bg' ? 'Списъкът е празен' : 'Your watchlist is empty'}
            </h3>
            <p className={`mb-6 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
              {language === 'bg' 
                ? 'Добавете филми от началната страница'
                : 'Add movies from the home page'
              }
            </p>
            <button
              onClick={() => navigate('/browse')}
              className="px-6 py-2 bg-tmdb-light-blue hover:bg-tmdb-light-blue/90 text-tmdb-dark-blue font-medium rounded-lg transition-colors"
            >
              {language === 'bg' ? 'Разгледай филми' : 'Browse Movies'}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredItems.map((item) => {
              const movie = item.movie;
              if (!movie) return null;
              
              const title = language === 'bg' ? (movie.title_bg || movie.title) : movie.title;
              const genre = language === 'bg' ? (movie.genre_bg || movie.genre) : movie.genre;
              const posterUrl = movie.poster_url || (movie.poster_path ? `https://image.tmdb.org/t/p/w185${movie.poster_path}` : null);
              
              return (
                <div
                  key={item.id}
                  className={`rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow ${
                    theme === 'dark' ? 'bg-gray-900' : 'bg-white border border-gray-200'
                  }`}
                >
                  <div className="flex gap-4">
                    {/* Poster */}
                    <div 
                      className="w-24 h-36 flex-shrink-0 rounded-lg overflow-hidden cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={() => navigate(`/movie/${movie.id}`)}
                    >
                      {posterUrl ? (
                        <img src={posterUrl} alt={title} className="w-full h-full object-cover" />
                      ) : (
                        <div className={`w-full h-full flex items-center justify-center ${theme === 'dark' ? 'bg-gray-800' : 'bg-gray-200'}`}>
                          <Film className="w-8 h-8 text-gray-500" />
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-grow min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <h3 
                            className={`text-lg font-semibold cursor-pointer hover:text-tmdb-light-blue transition-colors truncate ${
                              theme === 'dark' ? 'text-white' : 'text-gray-900'
                            }`}
                            onClick={() => navigate(`/movie/${movie.id}`)}
                          >
                            {title}
                          </h3>
                          <p className={`text-sm ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>{genre}</p>
                        </div>

                        {/* Status Badge */}
                        <div className={`flex items-center gap-1 px-3 py-1 rounded-full border flex-shrink-0 ${getStatusColor(item.status)}`}>
                          {getStatusIcon(item.status)}
                          <span className="text-sm font-medium">{getStatusLabel(item.status)}</span>
                        </div>
                      </div>

                      {/* Rating & Date */}
                      <div className={`flex items-center gap-4 mt-2 text-sm ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
                        {movie.average_rating && (
                          <div className="flex items-center gap-1">
                            <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                            <span>{movie.average_rating.toFixed(1)}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          <span>
                            {language === 'bg' ? 'Добавен: ' : 'Added: '}
                            {new Date(item.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 mt-4 flex-wrap">
                        <span className={`text-sm mr-2 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
                          {language === 'bg' ? 'Статус:' : 'Status:'}
                        </span>
                        {(['planned', 'watching', 'completed', 'dropped'] as const).map((status) => (
                          <button
                            key={status}
                            onClick={() => updateStatus(item.movie_id, status)}
                            className={`flex items-center gap-1 px-3 py-1 rounded-lg text-sm transition-colors ${
                              item.status === status
                                ? getStatusColor(status) + ' border'
                                : theme === 'dark'
                                  ? 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                          >
                            {getStatusIcon(status)}
                            {getStatusLabel(status)}
                          </button>
                        ))}

                        <button
                          onClick={() => removeFromWatchlist(item.movie_id)}
                          className="ml-auto flex items-center gap-1 px-3 py-1 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                          {language === 'bg' ? 'Премахни' : 'Remove'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}