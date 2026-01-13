// src/pages/Home.tsx
import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Movie } from '../types';
import { moviesApi } from '../api/movies';
import MovieGrid from '../components/MovieGrid';
import SearchBar from '../components/SearchBar';
import MoodFilter from '../components/MoodFilter';

// Simple in-memory cache for movies
const movieCache = {
  all: null as Movie[] | null,
  timestamp: 0,
  TTL: 5 * 60 * 1000, // 5 minutes
  
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
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMood, setSelectedMood] = useState('all');
  const [isSearching, setIsSearching] = useState(false);
  
  // Pagination state
  const [displayCount, setDisplayCount] = useState(24); // Show 24 initially (4 rows of 6)
  const [allMovies, setAllMovies] = useState<Movie[]>([]);
  const loaderRef = useRef<HTMLDivElement>(null);

  // Infinite scroll observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && displayCount < allMovies.length) {
          // Load 12 more movies
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

  // Update displayed movies when allMovies or displayCount changes
  useEffect(() => {
    setMovies(allMovies.slice(0, displayCount));
  }, [allMovies, displayCount]);

  // Fetch all movies on mount
  useEffect(() => {
    fetchMovies();
  }, []);

  const fetchMovies = useCallback(async () => {
    try {
      // Check cache first
      const cached = movieCache.get();
      if (cached) {
        setAllMovies(cached);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      const data = await moviesApi.getAll();
      
      // Cache the result
      movieCache.set(data);
      setAllMovies(data);
      setDisplayCount(24); // Reset pagination
    } catch (err) {
      setError('Failed to load movies. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Handle search
  const handleSearch = useCallback(async (query: string) => {
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
      const results = await moviesApi.search(query);
      setAllMovies(results.map(r => r.movie));
    } catch (err) {
      setError('Search failed. Please try again.');
      console.error(err);
    } finally {
      setIsSearching(false);
    }
  }, [fetchMovies]);

  // Handle mood filter
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
      setError('Failed to filter by mood. Please try again.');
      console.error(err);
    } finally {
      setIsSearching(false);
    }
  }, [fetchMovies]);

  // Navigate to movie detail
  const handleMovieClick = useCallback((movie: Movie) => {
    navigate(`/movie/${movie.id}`);
  }, [navigate]);

  // Section title based on current state
  const getSectionTitle = () => {
    if (searchQuery) {
      return `Results for "${searchQuery}"`;
    }
    if (selectedMood !== 'all') {
      const moodLabel = selectedMood.charAt(0).toUpperCase() + selectedMood.slice(1);
      return `${moodLabel} Movies`;
    }
    return 'Popular Movies';
  };

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Hero Section */}
      <div className="relative bg-gradient-to-b from-gray-900 to-gray-950 py-16">
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />
        
        <div className="relative max-w-7xl mx-auto px-4">
          {/* Title */}
          <h1 className="text-4xl md:text-5xl font-bold text-white text-center mb-2">
            Discover Your Next
            <span className="text-blue-500"> Favorite Movie</span>
          </h1>
          <p className="text-gray-400 text-center mb-8 max-w-2xl mx-auto">
            Search in English or Bulgarian • AI-powered recommendations
          </p>

          {/* Search Bar */}
          <SearchBar onSearch={handleSearch} initialValue={searchQuery} />

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
          <h2 className="text-xl font-semibold text-white">
            {getSectionTitle()}
          </h2>
          <span className="text-gray-500 text-sm">
            {movies.length}{allMovies.length > displayCount ? ` / ${allMovies.length}` : ''} movies
          </span>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-6">
            <p className="text-red-400">{error}</p>
            <button
              onClick={fetchMovies}
              className="text-red-400 underline mt-2 text-sm"
            >
              Try again
            </button>
          </div>
        )}

        {/* Movie Grid */}
        <MovieGrid
          movies={movies}
          loading={loading || isSearching}
          onMovieClick={handleMovieClick}
          emptyMessage={
            searchQuery
              ? `No movies found for "${searchQuery}"`
              : "No movies available"
          }
        />

        {/* Load more trigger (invisible) */}
        {allMovies.length > displayCount && (
          <div ref={loaderRef} className="h-20 flex items-center justify-center">
            <div className="flex items-center gap-2 text-gray-500">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span>Loading more...</span>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-800 py-8 mt-16">
        <div className="max-w-7xl mx-auto px-4 text-center text-gray-500 text-sm">
          <p>Movie Recommendation System • Diploma Project 2025</p>
          <p className="mt-1">Powered by AI Semantic Search</p>
        </div>
      </footer>
    </div>
  );
}