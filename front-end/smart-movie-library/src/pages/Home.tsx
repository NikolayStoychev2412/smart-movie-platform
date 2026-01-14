// src/pages/Home.tsx
import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Movie } from '../types';
import { moviesApi } from '../api/movies';
import MovieGrid from '../components/MovieGrid';
import SearchBar from '../components/SearchBar';
import MoodFilter from '../components/MoodFilter';
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

export default function Home() {
  const navigate = useNavigate();
  const { theme, t, language } = useApp();
  
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMood, setSelectedMood] = useState('all');
  const [isSearching, setIsSearching] = useState(false);
  
  const [displayCount, setDisplayCount] = useState(24);
  const [allMovies, setAllMovies] = useState<Movie[]>([]);
  const loaderRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && displayCount < allMovies.length) {
          setDisplayCount(prev => Math.min(prev + 12, allMovies.length));
        }
      },
      { rootMargin: '200px' }
    );

    if (loaderRef.current) {
      observer.observe(loaderRef.current);
    }

    return () => observer.disconnect();
  }, [displayCount, allMovies.length]);

  useEffect(() => {
    setMovies(allMovies.slice(0, displayCount));
  }, [allMovies, displayCount]);

  const fetchMovies = useCallback(async () => {
    try {
      const cached = movieCache.get();
      if (cached) {
        setAllMovies(cached);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      const data = await moviesApi.getAll();
      
      movieCache.set(data);
      setAllMovies(data);
      setDisplayCount(24);
    } catch (err) {
      setError(t.loadError);
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [t.loadError]);

  useEffect(() => {
    fetchMovies();
  }, [fetchMovies]);

  const handleSearch = useCallback(async (query: string, mode: 'ai' | 'title' = 'ai') => {
    setSearchQuery(query);
    setSelectedMood('all');
    setDisplayCount(24);

    if (!query.trim()) {
      const cached = movieCache.get();
      if (cached) {
        setAllMovies(cached);
      } else {
        fetchMovies();
      }
      return;
    }

    try {
      setIsSearching(true);
      setError(null);
      
      if (mode === 'ai') {
        const results = await moviesApi.search(query);
        setAllMovies(results.map(r => r.movie));
      } else {
        let allData = movieCache.get();
        
        if (!allData || allData.length === 0) {
          allData = await moviesApi.getAll();
          movieCache.set(allData);
        }
        
        const searchLower = query.toLowerCase();
        const filtered = allData.filter(movie => {
          const title = (movie.title || '').toLowerCase();
          const titleBg = (movie.title_bg || '').toLowerCase();
          return title.includes(searchLower) || titleBg.includes(searchLower);
        });
        
        setAllMovies(filtered);
      }
    } catch (err) {
      setError(t.searchError);
      console.error(err);
    } finally {
      setIsSearching(false);
    }
  }, [fetchMovies, t.searchError]);

  const handleMoodSelect = useCallback(async (mood: string) => {
    setSelectedMood(mood);
    setSearchQuery('');
    setDisplayCount(24);

    if (mood === 'all') {
      const cached = movieCache.get();
      if (cached) {
        setAllMovies(cached);
      } else {
        fetchMovies();
      }
      return;
    }

    try {
      setIsSearching(true);
      setError(null);
      const results = await moviesApi.searchByMood(mood);
      setAllMovies(results.map(r => r.movie));
    } catch (err) {
      setError(t.loadError);
      console.error(err);
    } finally {
      setIsSearching(false);
    }
  }, [fetchMovies, t.loadError]);

  const handleMovieClick = useCallback((movie: Movie) => {
    navigate(`/movie/${movie.id}`);
  }, [navigate]);

  const getSectionTitle = () => {
    if (searchQuery) {
      return `${t.resultsFor} "${searchQuery}"`;
    }
    if (selectedMood !== 'all') {
      const moodLabels: Record<string, string> = {
        funny: t.funny,
        scary: t.scary,
        romantic: t.romantic,
        exciting: t.exciting,
        sad: t.sad,
        thoughtful: t.thoughtful,
      };
      return `${moodLabels[selectedMood] || selectedMood} ${language === 'bg' ? 'филми' : 'Movies'}`;
    }
    return t.popularMovies;
  };

  return (
    <div className={`min-h-screen transition-colors ${
      theme === 'dark' ? 'bg-gray-950' : 'bg-gray-50'
    }`}>
      {/* Hero Section */}
      <div className={`relative py-16 ${
        theme === 'dark' 
          ? 'bg-gradient-to-b from-gray-900 to-gray-950' 
          : 'bg-gradient-to-b from-blue-50 to-gray-50'
      }`}>
        <div className={`absolute inset-0 bg-[url('/grid.svg')] ${
          theme === 'dark' ? 'opacity-10' : 'opacity-5'
        }`} />
        
        <div className="relative max-w-7xl mx-auto px-4">
          {/* Title */}
          <h1 className={`text-4xl md:text-5xl font-bold text-center mb-2 ${
            theme === 'dark' ? 'text-white' : 'text-gray-900'
          }`}>
            {t.heroTitle}
            <span className="text-blue-500"> {t.heroHighlight}</span>
          </h1>
          <p className={`text-center mb-8 max-w-2xl mx-auto ${
            theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
          }`}>
            {t.heroSubtitle}
          </p>

          {/* Search Bar */}
          <SearchBar onSearch={(query, mode) => handleSearch(query, mode)} initialValue={searchQuery} />

          {/* Mood Filter */}
          <div className="mt-8">
            <MoodFilter onMoodSelect={handleMoodSelect} selectedMood={selectedMood} />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Section Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className={`text-xl font-semibold ${
            theme === 'dark' ? 'text-white' : 'text-gray-900'
          }`}>
            {getSectionTitle()}
          </h2>
          <span className={`text-sm ${
            theme === 'dark' ? 'text-gray-500' : 'text-gray-600'
          }`}>
            {movies.length}{allMovies.length > displayCount ? ` / ${allMovies.length}` : ''} {t.movies}
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
            <button
              onClick={fetchMovies}
              className="text-red-500 underline mt-2 text-sm"
            >
              {t.tryAgain}
            </button>
          </div>
        )}

        {/* Movie Grid */}
        <MovieGrid
          movies={movies}
          loading={loading || isSearching}
          onMovieClick={handleMovieClick}
        />

        {/* Load more trigger */}
        {allMovies.length > displayCount && (
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

      {/* Footer */}
      <footer className={`border-t py-8 mt-16 ${
        theme === 'dark' ? 'border-gray-800' : 'border-gray-200'
      }`}>
        <div className={`max-w-7xl mx-auto px-4 text-center text-sm ${
          theme === 'dark' ? 'text-gray-500' : 'text-gray-600'
        }`}>
          <p>{t.footerTitle}</p>
          <p className="mt-1">{t.footerPowered}</p>
        </div>
      </footer>
    </div>
  );
}