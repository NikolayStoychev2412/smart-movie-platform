// src/pages/Home.tsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Movie } from '../types';
import { moviesApi } from '../api/movies';
import MovieGrid from '../components/MovieGrid';
import SearchBar from '../components/SearchBar';
import MoodFilter from '../components/MoodFilter';
import { useApp } from '../context/AppContext';

export default function Home() {
  const navigate = useNavigate();
  const { t } = useApp();
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMood, setSelectedMood] = useState('all');
  const [isSearching, setIsSearching] = useState(false);

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
      setError(t.loadError);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (query: string, isSemanticSearch: boolean) => {
    setSearchQuery(query);
    setSelectedMood('all');

    if (!query.trim()) {
      fetchMovies();
      return;
    }

    try {
      setIsSearching(true);
      setError(null);
      
      if (isSemanticSearch) {
        const results = await moviesApi.semanticSearch(query);
        setMovies(results.map(r => r.movie));
      } else {
        const results = await moviesApi.getAll(query);
        setMovies(results);
      }
    } catch (err) {
      setError(t.searchError);
      console.error(err);
    } finally {
      setIsSearching(false);
    }
  };

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
      setError(t.searchError);
      console.error(err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleMovieClick = (movie: Movie) => {
    navigate(`/movie/${movie.id}`);
  };

  const getSectionTitle = () => {
    if (searchQuery) {
      return `${t.resultsFor} "${searchQuery}"`;
    }
    if (selectedMood !== 'all') {
      const moodLabels: Record<string, string> = {
        funny: t.funny, scary: t.scary, romantic: t.romantic,
        exciting: t.exciting, sad: t.sad, thoughtful: t.thoughtful,
        dark: t.dark, uplifting: t.uplifting,
      };
      return `${moodLabels[selectedMood] || selectedMood} ${t.movies}`;
    }
    return t.popularMovies;
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-950 transition-colors">
      <div className="relative bg-gradient-to-b from-gray-200 dark:from-gray-900 to-gray-100 dark:to-gray-950 py-16 transition-colors">
        <div className="relative max-w-7xl mx-auto px-4">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white text-center mb-2">
            {t.heroTitle}
            <span className="text-blue-500"> {t.heroHighlight}</span>
          </h1>
          <p className="text-gray-600 dark:text-gray-400 text-center mb-8 max-w-2xl mx-auto">
            {t.heroSubtitle}
          </p>

          <SearchBar onSearch={handleSearch} initialValue={searchQuery} />

          <div className="mt-8">
            <MoodFilter onMoodSelect={handleMoodSelect} selectedMood={selectedMood} />
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{getSectionTitle()}</h2>
          <span className="text-gray-500 text-sm">{movies.length} {t.movies}</span>
        </div>

        {error && (
          <div className="bg-red-100 dark:bg-red-500/10 border border-red-300 dark:border-red-500/20 rounded-lg p-4 mb-6">
            <p className="text-red-600 dark:text-red-400">{error}</p>
            <button onClick={fetchMovies} className="text-red-600 dark:text-red-400 underline mt-2 text-sm">{t.tryAgain}</button>
          </div>
        )}

        <MovieGrid
          movies={movies}
          loading={loading || isSearching}
          onMovieClick={handleMovieClick}
          emptyMessage={searchQuery ? `${t.noMoviesFound} "${searchQuery}"` : t.noMoviesFound}
        />
      </main>

      <footer className="border-t border-gray-300 dark:border-gray-800 py-8 mt-16 transition-colors">
        <div className="max-w-7xl mx-auto px-4 text-center text-gray-500 text-sm">
          <p>{t.footerTitle}</p>
          <p className="mt-1">{t.footerPowered}</p>
        </div>
      </footer>
    </div>
  );
}