// src/pages/Watchlist.tsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Clock, CheckCircle, Eye, Trash2, Film, Loader2,
  Calendar, Star, Filter, XCircle
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import api from '../api/client';
import MoviePoster from '../components/MoviePoster';
import EmptyState from '../components/EmptyState';
import type { Movie, WatchStatus, ApiError } from '../types';

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
  const { language, theme, t } = useApp();

  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<WatchStatus | 'all'>('all');

  useEffect(() => {
    const checkAndFetch = async () => {
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
    } catch (err) {
      if ((err as ApiError).response?.status === 401) {
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
    } catch {
    }
  };

  const removeFromWatchlist = async (movieId: number) => {
    try {
      await api.delete(`/watchlist/${movieId}`);
      setItems(items.filter(item => item.movie_id !== movieId));
    } catch {
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
    switch (status) {
      case 'planned': return t.plannedStatus;
      case 'watching': return t.watchingStatus;
      case 'completed': return t.completedStatus;
      case 'dropped': return t.droppedStatus;
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
      <div className={`min-h-screen flex items-center justify-center bg-bg`}>
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className={`min-h-screen transition-colors bg-bg`}>
      {/* Header */}
      <div className={`border-b ${theme === 'dark' ? 'bg-surface border-border' : 'bg-white border-border'}`}>
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">
          <h1 className={`text-page-title mb-2 text-text`}>
            {t.myWatchlist}
          </h1>
          <p className="text-muted">
            {t.watchlistSubtitle}
          </p>

          {/* Stats */}
          <div className="flex flex-wrap gap-3 mt-6">
            <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${theme === 'dark' ? 'bg-surface-2' : 'bg-gray-100'}`}>
              <Film className={`w-5 h-5 text-muted`} />
              <span className={`font-medium text-text`}>{stats.total}</span>
              <span className="text-muted">{t.totalLabel}</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-blue-500/10 rounded-lg">
              <Clock className="w-5 h-5 text-blue-500" />
              <span className="text-blue-500 font-medium">{stats.planned}</span>
              <span className="text-blue-500/70">{t.plannedPlural}</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-yellow-500/10 rounded-lg">
              <Eye className="w-5 h-5 text-yellow-500" />
              <span className="text-yellow-500 font-medium">{stats.watching}</span>
              <span className="text-yellow-500/70">{t.watchingStatus}</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-green-500/10 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <span className="text-green-500 font-medium">{stats.completed}</span>
              <span className="text-green-500/70">{t.completedPlural}</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-red-500/10 rounded-lg">
              <XCircle className="w-5 h-5 text-red-500" />
              <span className="text-red-500 font-medium">{stats.dropped}</span>
              <span className="text-red-500/70">{t.droppedPlural}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">
        {/* Filter */}
        <div className="flex items-center gap-2 mb-6 flex-wrap">
          <Filter className={`w-5 h-5 text-muted`} />
          <span className={`mr-2 text-muted`}>
            {t.filterLabel}
          </span>
          {(['all', 'planned', 'watching', 'completed', 'dropped'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filter === status
                  ? 'bg-primary text-white'
                  : theme === 'dark'
                    ? 'bg-surface-2 text-muted hover:bg-border'
                    : 'bg-gray-100 text-muted hover:bg-gray-200'
              }`}
            >
              {status === 'all' ? t.all : getStatusLabel(status)}
            </button>
          ))}
        </div>

        {/* Watchlist Items */}
        {filteredItems.length === 0 ? (
          <EmptyState
            icon={Film}
            title={t.watchlistEmpty}
            description={t.addMoviesHint}
            action={{ label: t.browseMovies, to: '/browse' }}
          />
        ) : (
          <div className="space-y-4">
            {filteredItems.map((item) => {
              const movie = item.movie;
              if (!movie) return null;

              const title = language === 'bg' ? (movie.title_bg || movie.title) : movie.title;
              const genre = language === 'bg' ? (movie.genre_bg || movie.genre) : movie.genre;

              return (
                <div
                  key={item.id}
                  className={`rounded-lg p-4 border ${
                    theme === 'dark' ? 'bg-surface-2 border-border' : 'bg-white border-border shadow-sm'
                  }`}
                >
                  <div className="flex gap-4">
                    {/* Poster */}
                    <div
                      className="w-24 flex-shrink-0 cursor-pointer"
                      onClick={() => navigate(`/movie/${movie.id}`)}
                    >
                      <MoviePoster
                        posterPath={movie.poster_path}
                        posterUrl={movie.poster_url}
                        alt={title}
                        size="sm"
                      />
                    </div>

                    {/* Info */}
                    <div className="flex-grow min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <h3
                            className={`text-lg font-semibold cursor-pointer hover:text-primary transition-colors truncate text-text`}
                            onClick={() => navigate(`/movie/${movie.id}`)}
                          >
                            {title}
                          </h3>
                          <p className={`text-sm text-muted`}>{genre}</p>
                        </div>

                        {/* Status Badge */}
                        <div className={`flex items-center gap-1 px-3 py-1 rounded-lg border flex-shrink-0 ${getStatusColor(item.status)}`}>
                          {getStatusIcon(item.status)}
                          <span className="text-sm font-medium">{getStatusLabel(item.status)}</span>
                        </div>
                      </div>

                      {/* Rating & Date */}
                      <div className={`flex items-center gap-4 mt-2 text-sm text-muted`}>
                        {movie.average_rating && (
                          <div className="flex items-center gap-1">
                            <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                            <span>{movie.average_rating.toFixed(1)}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          <span>
                            {t.addedLabel} {new Date(item.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 mt-4 flex-wrap">
                        <span className={`text-sm mr-2 text-muted`}>
                          {t.statusLabel}
                        </span>
                        {(['planned', 'watching', 'completed', 'dropped'] as const).map((status) => (
                          <button
                            key={status}
                            onClick={() => updateStatus(item.movie_id, status)}
                            className={`flex items-center gap-1 px-3 py-1 rounded-lg text-sm transition-colors ${
                              item.status === status
                                ? getStatusColor(status) + ' border'
                                : theme === 'dark'
                                  ? 'bg-border text-muted hover:bg-[#3A3A5A]'
                                  : 'bg-gray-100 text-muted hover:bg-gray-200'
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
                          {t.removeBtn}
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
