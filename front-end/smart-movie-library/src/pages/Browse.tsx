// src/pages/Browse.tsx
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Movie } from '../types';
import { moviesApi } from '../api/movies';
import MovieGrid from '../components/MovieGrid';
import SearchBar from '../components/SearchBar';
import AdvancedFilters from '../components/AdvancedFilters';
import { useApp } from '../context/AppContext';

// Simple in-memory cache for movies
const movieCache = {
  all: null as Movie[] | null,
  timestamp: 0,
  TTL: 5 * 60 * 1000,
  
  get(): Movie[] | null {
    if (this.all && Date.now() - this.timestamp < this.TTL) {
      return this.all;
    }
    return null;
  },
  
  set(movies: Movie[]) {
    this.all = movies;
    this.timestamp = Date.now();
  }
};

export default function Browse() {
  const navigate = useNavigate();
  const { theme, t, language } = useApp();
  
  const [allMovies, setAllMovies] = useState<Movie[]>([]);
  const [filteredMovies, setFilteredMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMood, setSelectedMood] = useState('all');
  const [isSearching, setIsSearching] = useState(false);
  
  // Pagination
  const [displayCount, setDisplayCount] = useState(36);
  const loaderRef = useRef<HTMLDivElement>(null);

  // Infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && displayCount < filteredMovies.length) {
          setDisplayCount(prev => Math.min(prev + 24, filteredMovies.length));
        }
      },
      { rootMargin: '200px' }
    );

    if (loaderRef.current) {
      observer.observe(loaderRef.current);
    }

    return () => observer.disconnect();
  }, [displayCount, filteredMovies.length]);

  // Fetch movies on mount
  useEffect(() => {
    fetchMovies();
  }, []);

  const fetchMovies = useCallback(async () => {
    try {
      const cached = movieCache.get();
      if (cached) {
        setAllMovies(cached);
        setFilteredMovies(cached);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      const data = await moviesApi.getAll();
      
      movieCache.set(data);
      setAllMovies(data);
      setFilteredMovies(data);
    } catch (err) {
      setError(t.loadError);
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [t.loadError]);

  // Get unique genres
  const genres = useMemo(() => {
    const genreSet = new Set<string>();
    allMovies.forEach(movie => {
      if (movie.genre) {
        movie.genre.split(',').forEach(g => genreSet.add(g.trim()));
      }
    });
    return Array.from(genreSet).sort();
  }, [allMovies]);

  // Handle search
  const handleSearch = useCallback(async (query: string, mode: 'ai' | 'title' = 'ai') => {
    setSearchQuery(query);
    setSelectedMood('all');
    setDisplayCount(36);

    if (!query.trim()) {
      setFilteredMovies(allMovies);
      return;
    }

    try {
      setIsSearching(true);
      setError(null);
      
      if (mode === 'ai') {
        const results = await moviesApi.search(query);
        setFilteredMovies(results.map(r => r.movie));
      } else {
        const searchLower = query.toLowerCase();
        const filtered = allMovies.filter(movie => {
          const title = (movie.title || '').toLowerCase();
          const titleBg = (movie.title_bg || '').toLowerCase();
          return title.includes(searchLower) || titleBg.includes(searchLower);
        });
        setFilteredMovies(filtered);
      }
    } catch (err) {
      setError(t.searchError);
      console.error(err);
    } finally {
      setIsSearching(false);
    }
  }, [allMovies, t.searchError]);

  // Handle mood filter
  const handleMoodSelect = useCallback(async (mood: string) => {
    setSelectedMood(mood);
    setSearchQuery('');
    setDisplayCount(36);

    if (mood === 'all') {
      setFilteredMovies(allMovies);
      return;
    }

    try {
      setIsSearching(true);
      setError(null);
      const results = await moviesApi.searchByMood(mood);
      setFilteredMovies(results.map(r => r.movie));
    } catch (err) {
      setError(t.loadError);
      console.error(err);
    } finally {
      setIsSearching(false);
    }
  }, [allMovies, t.loadError]);

  // Handle advanced filters
  const handleFilterChange = useCallback((filters: { genre: string; mood: string; minRating: number; sortBy: string }) => {
    let filtered = [...allMovies];

    // Filter by genre
    if (filters.genre !== 'all') {
      filtered = filtered.filter(m => m.genre?.toLowerCase().includes(filters.genre.toLowerCase()));
    }

    // Filter by rating
    if (filters.minRating > 0) {
      filtered = filtered.filter(m => m.average_rating >= filters.minRating);
    }

    // Sort
    if (filters.sortBy === 'rating') {
      filtered = filtered.sort((a, b) => b.average_rating - a.average_rating);
    } else if (filters.sortBy === 'title') {
      filtered = filtered.sort((a, b) => a.title.localeCompare(b.title));
    } else if (filters.sortBy === 'reviews') {
      filtered = filtered.sort((a, b) => b.review_count - a.review_count);
    }

    setFilteredMovies(filtered);
    setDisplayCount(36);

    // Handle mood separately (AI search)
    if (filters.mood !== 'all' && filters.mood !== selectedMood) {
      handleMoodSelect(filters.mood);
    }
  }, [allMovies, selectedMood, handleMoodSelect]);

  const handleMovieClick = useCallback((movie: Movie) => {
    navigate(`/movie/${movie.id}`);
  }, [navigate]);

  // Get section title
  const getSectionTitle = () => {
    if (searchQuery) {
      return `${t.resultsFor} "${searchQuery}"`;
    }
    if (selectedMood !== 'all') {
      const moodLabels: Record<string, string> = {
        funny: language === 'bg' ? 'Смешни' : 'Funny',
        scary: language === 'bg' ? 'Страшни' : 'Scary',
        romantic: language === 'bg' ? 'Романтични' : 'Romantic',
        exciting: language === 'bg' ? 'Вълнуващи' : 'Exciting',
        sad: language === 'bg' ? 'Тъжни' : 'Sad',
        thoughtful: language === 'bg' ? 'За размисъл' : 'Thoughtful',
        dark: language === 'bg' ? 'Мрачни' : 'Dark',
        uplifting: language === 'bg' ? 'Вдъхновяващи' : 'Uplifting',
      };
      return `${moodLabels[selectedMood] || selectedMood} ${language === 'bg' ? 'филми' : 'Movies'}`;
    }
    return language === 'bg' ? 'Всички филми' : 'All Movies';
  };

  const displayedMovies = filteredMovies.slice(0, displayCount);

  return (
    <div className={`min-h-screen transition-colors ${
      theme === 'dark' ? 'bg-gray-950' : 'bg-gray-50'
    }`}>
      {/* Header */}
      <div className={`sticky top-16 z-40 border-b ${
        theme === 'dark' 
          ? 'bg-gray-950/95 backdrop-blur-sm border-gray-800' 
          : 'bg-gray-50/95 backdrop-blur-sm border-gray-200'
      }`}>
        <div className="max-w-7xl mx-auto px-4 py-6">
          <h1 className={`text-3xl font-bold mb-6 ${
            theme === 'dark' ? 'text-white' : 'text-gray-900'
          }`}>
            {language === 'bg' ? '🎬 Разгледай филми' : '🎬 Browse Movies'}
          </h1>

          {/* Search Bar */}
          <SearchBar onSearch={handleSearch} initialValue={searchQuery} />
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Advanced Filters */}
        <AdvancedFilters onFilterChange={handleFilterChange} genres={genres} />

        {/* Results Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className={`text-xl font-semibold ${
            theme === 'dark' ? 'text-white' : 'text-gray-900'
          }`}>
            {getSectionTitle()}
          </h2>
          <span className={`text-sm ${
            theme === 'dark' ? 'text-gray-500' : 'text-gray-600'
          }`}>
            {displayedMovies.length}
            {filteredMovies.length > displayCount ? ` / ${filteredMovies.length}` : ''} {t.movies}
          </span>
        </div>

        {/* Error Message */}
        {error && (
          <div className={`rounded-lg p-4 mb-6 ${
            theme === 'dark' 
              ? 'bg-red-500/10 border border-red-500/20' 
              : 'bg-red-50 border border-red-200'
          }`}>
            <p className="text-red-500">{error}</p>
            <button onClick={fetchMovies} className="text-red-500 underline mt-2 text-sm">
              {t.tryAgain}
            </button>
          </div>
        )}

        {/* Movie Grid */}
        <MovieGrid
          movies={displayedMovies}
          loading={loading || isSearching}
          onMovieClick={handleMovieClick}
          emptyMessage={
            searchQuery
              ? `${language === 'bg' ? 'Няма намерени филми за' : 'No movies found for'} "${searchQuery}"`
              : language === 'bg' ? 'Няма намерени филми' : 'No movies found'
          }
        />

        {/* Load more trigger */}
        {filteredMovies.length > displayCount && (
          <div ref={loaderRef} className="h-20 flex items-center justify-center">
            <div className={`flex items-center gap-2 ${
              theme === 'dark' ? 'text-gray-500' : 'text-gray-600'
            }`}>
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span>{language === 'bg' ? 'Зареждане...' : 'Loading more...'}</span>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}