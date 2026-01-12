// src/pages/Watchlist.tsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Clock, CheckCircle, Eye, Trash2, Film, Loader2, 
  Calendar, Star, Filter, XCircle
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import api from '../api/client';
import type { Movie } from '../types';

// Backend uses lowercase status values
type WatchlistStatus = 'planned' | 'watching' | 'completed' | 'dropped';

interface WatchlistItem {
  id: number;
  movie_id: number;
  status: WatchlistStatus;
  created_at: string;
  updated_at: string;
  movie: Movie;
}

export default function Watchlist() {
  const navigate = useNavigate();
  const { language } = useApp();
  
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<WatchlistStatus | 'all'>('all');
  
  const isLoggedIn = !!localStorage.getItem('token');

  useEffect(() => {
    if (!isLoggedIn) {
      navigate('/login');
      return;
    }
    fetchWatchlist();
  }, [isLoggedIn, navigate]);

  const fetchWatchlist = async () => {
    setLoading(true);
    try {
      const response = await api.get('/watchlist/');
      setItems(response.data);
    } catch (err) {
      console.error('Error fetching watchlist:', err);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (movieId: number, newStatus: WatchlistStatus) => {
    try {
      // PUT uses movie_id in URL
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
      // DELETE uses movie_id in URL
      await api.delete(`/watchlist/${movieId}`);
      setItems(items.filter(item => item.movie_id !== movieId));
    } catch (err) {
      console.error('Error removing from watchlist:', err);
    }
  };

  const getStatusIcon = (status: WatchlistStatus) => {
    switch (status) {
      case 'planned': return <Clock className="w-4 h-4" />;
      case 'watching': return <Eye className="w-4 h-4" />;
      case 'completed': return <CheckCircle className="w-4 h-4" />;
      case 'dropped': return <XCircle className="w-4 h-4" />;
    }
  };

  const getStatusColor = (status: WatchlistStatus) => {
    switch (status) {
      case 'planned': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'watching': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      case 'completed': return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'dropped': return 'bg-red-500/10 text-red-500 border-red-500/20';
    }
  };

  const getStatusLabel = (status: WatchlistStatus) => {
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
      <div className="min-h-screen bg-gray-100 dark:bg-gray-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-950 transition-colors">
      {/* Header */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            {language === 'bg' ? 'Моят списък' : 'My Watchlist'}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {language === 'bg' 
              ? 'Следете филмите, които искате да гледате'
              : 'Keep track of movies you want to watch'
            }
          </p>

          {/* Stats */}
          <div className="flex flex-wrap gap-4 mt-6">
            <div className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
              <Film className="w-5 h-5 text-gray-500" />
              <span className="text-gray-900 dark:text-white font-medium">{stats.total}</span>
              <span className="text-gray-500">{language === 'bg' ? 'Общо' : 'Total'}</span>
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
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Filter */}
        <div className="flex items-center gap-2 mb-6 flex-wrap">
          <Filter className="w-5 h-5 text-gray-500" />
          <span className="text-gray-600 dark:text-gray-400 mr-2">
            {language === 'bg' ? 'Филтър:' : 'Filter:'}
          </span>
          {(['all', 'planned', 'watching', 'completed', 'dropped'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                filter === status
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-700'
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
          <div className="bg-white dark:bg-gray-900 rounded-xl p-12 text-center">
            <Film className="w-16 h-16 text-gray-300 dark:text-gray-700 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-2">
              {language === 'bg' ? 'Списъкът е празен' : 'Your watchlist is empty'}
            </h3>
            <p className="text-gray-500 mb-6">
              {language === 'bg' 
                ? 'Добавете филми от началната страница'
                : 'Add movies from the home page'
              }
            </p>
            <button
              onClick={() => navigate('/')}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              {language === 'bg' ? 'Разгледай филми' : 'Browse Movies'}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredItems.map((item) => {
              const movie = item.movie;
              const title = language === 'bg' ? (movie.title_bg || movie.title) : movie.title;
              const genre = language === 'bg' ? (movie.genre_bg || movie.genre) : movie.genre;
              
              return (
                <div
                  key={item.id}
                  className="bg-white dark:bg-gray-900 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex gap-4">
                    {/* Poster */}
                    <img
                      src={movie.poster_url || 'https://via.placeholder.com/100x150?text=No+Poster'}
                      alt={title}
                      className="w-24 h-36 object-cover rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={() => navigate(`/movie/${movie.id}`)}
                    />

                    {/* Info */}
                    <div className="flex-grow">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 
                            className="text-lg font-semibold text-gray-900 dark:text-white cursor-pointer hover:text-blue-500 transition-colors"
                            onClick={() => navigate(`/movie/${movie.id}`)}
                          >
                            {title}
                          </h3>
                          <p className="text-sm text-gray-500">{genre}</p>
                        </div>

                        {/* Status Badge */}
                        <div className={`flex items-center gap-1 px-3 py-1 rounded-full border ${getStatusColor(item.status)}`}>
                          {getStatusIcon(item.status)}
                          <span className="text-sm font-medium">{getStatusLabel(item.status)}</span>
                        </div>
                      </div>

                      {/* Rating & Date */}
                      <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                        <div className="flex items-center gap-1">
                          <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                          <span>{movie.average_rating.toFixed(1)}</span>
                        </div>
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
                        <span className="text-sm text-gray-500 mr-2">
                          {language === 'bg' ? 'Статус:' : 'Status:'}
                        </span>
                        {(['planned', 'watching', 'completed', 'dropped'] as const).map((status) => (
                          <button
                            key={status}
                            onClick={() => updateStatus(item.movie_id, status)}
                            className={`flex items-center gap-1 px-3 py-1 rounded-lg text-sm transition-colors ${
                              item.status === status
                                ? getStatusColor(status) + ' border'
                                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
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