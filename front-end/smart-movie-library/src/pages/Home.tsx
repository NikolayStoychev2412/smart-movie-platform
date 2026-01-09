import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { type Movie} from '../types/index';
import { moviesApi } from '../api/movies';
import MovieGrid from '../components/MovieGrid';
import SearchBar from '../components/SearchBar';
import MoodFilter from '../components/MoodFilter';

export default function Home() {
  const navigate = useNavigate();
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMood, setSelectedMood] = useState('all');
  const [isSearching, setIsSearching] = useState(false);

  // Fetch all movies on mount
  useEffect(() => {
    fetchMovies();
  }, []);

  const fetchMovies = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await moviesApi.getAll();
      setMovies(data);
    } catch (err) {
      setError('Failed to load movies. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Handle search
  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    setSelectedMood('all');

    if (!query.trim()) {
      fetchMovies();
      return;
    }

    try {
      setIsSearching(true);
      setError(null);
      const results = await moviesApi.search(query);
      setMovies(results.map(r => r.movie));
    } catch (err) {
      setError('Search failed. Please try again.');
      console.error(err);
    } finally {
      setIsSearching(false);
    }
  };

  // Handle mood filter
  const handleMoodSelect = async (mood: string) => {
    setSelectedMood(mood);
    setSearchQuery('');

    if (mood === 'all') {
      fetchMovies();
      return;
    }

    try {
      setIsSearching(true);
      setError(null);
      const results = await moviesApi.searchByMood(mood);
      setMovies(results.map(r => r.movie));
    } catch (err) {
      setError('Failed to filter by mood. Please try again.');
      console.error(err);
    } finally {
      setIsSearching(false);
    }
  };

  // Navigate to movie detail
  const handleMovieClick = (movie: Movie) => {
    navigate(`/movie/${movie.id}`);
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
            {searchQuery
              ? `Results for "${searchQuery}"`
              : selectedMood !== 'all'
                ? `${selectedMood.charAt(0).toUpperCase() + selectedMood.slice(1)} Movies`
                : 'Popular Movies'
            }
          </h2>
          <span className="text-gray-500 text-sm">
            {movies.length} movies
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