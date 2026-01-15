// src/pages/Home.tsx
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import type { Movie } from '../types';
import { moviesApi, type RecommendationWithExplanation } from '../api/movies';
import MovieCarousel from '../components/MovieCarousel';
import SearchBar from '../components/SearchBar';
import TMDBAttribution from '../components/TMDBAttribution';
import { useApp } from '../context/AppContext';
import { ArrowRight } from 'lucide-react';

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
  
  const [allMovies, setAllMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [forYouMovies, setForYouMovies] = useState<RecommendationWithExplanation[]>([]);
  const [forYouLoading, setForYouLoading] = useState(false);
  
  const isLoggedIn = !!localStorage.getItem('token');

  // Fetch all movies on mount
  useEffect(() => {
    fetchMovies();
    if (isLoggedIn) {
      fetchForYouMovies();
    }
  }, [isLoggedIn]);

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
    } catch (err) {
      setError(t.loadError);
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [t.loadError]);

  const fetchForYouMovies = async () => {
    setForYouLoading(true);
    try {
      const recommendations = await moviesApi.getRecommendations();
      setForYouMovies(recommendations);
    } catch (err) {
      console.error('Failed to fetch recommendations:', err);
      setForYouMovies([]);
    } finally {
      setForYouLoading(false);
    }
  };

  // Computed movie lists
  const popularMovies = useMemo(() => {
    return [...allMovies]
      .sort((a, b) => b.review_count - a.review_count)
      .slice(0, 20);
  }, [allMovies]);

  const topRatedMovies = useMemo(() => {
    return [...allMovies]
      .sort((a, b) => b.average_rating - a.average_rating)
      .slice(0, 20);
  }, [allMovies]);

  const trendingMovies = useMemo(() => {
    return [...allMovies]
      .sort(() => Math.random() - 0.5)
      .slice(0, 20);
  }, [allMovies]);

  // Handle search - redirect to browse page
  const handleSearch = useCallback((query: string, mode: 'ai' | 'title' = 'ai') => {
    if (query.trim()) {
      navigate(`/browse?q=${encodeURIComponent(query)}&mode=${mode}`);
    } else {
      navigate('/browse');
    }
  }, [navigate]);

  return (
    <div className={`min-h-screen transition-colors ${
      theme === 'dark' ? 'bg-gray-950' : 'bg-gray-50'
    }`}>
      {/* Hero Section */}
      <div className={`relative py-20 ${
        theme === 'dark' 
          ? 'bg-gradient-to-b from-gray-900 to-gray-950' 
          : 'bg-gradient-to-b from-blue-50 to-gray-50'
      }`}>
        <div className={`absolute inset-0 bg-[url('/grid.svg')] ${
          theme === 'dark' ? 'opacity-10' : 'opacity-5'
        }`} />
        
        <div className="relative max-w-7xl mx-auto px-4">
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

          <SearchBar onSearch={handleSearch} />
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
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

        {/* For You Section (only if logged in) */}
        {isLoggedIn && forYouMovies.length > 0 && (
          <MovieCarousel
            title={language === 'bg' ? '🎯 За теб' : '🎯 For You'}
            movies={forYouMovies.map(r => r.movie)}
            loading={forYouLoading}
            showReason
            reason={language === 'bg' ? 'Персонализирани препоръки' : 'Personalized recommendations'}
            reasons={forYouMovies.map(r => {
              if (r.explanation && r.explanation.reasons && r.explanation.reasons.length > 0) {
                return language === 'bg' 
                  ? (r.explanation.reasons_bg?.[0] || r.explanation.reasons[0])
                  : r.explanation.reasons[0];
              }
              return language === 'bg' ? 'Препоръчано за теб' : 'Recommended for you';
            })}
          />
        )}

        {/* Popular Movies */}
        <MovieCarousel
          title={language === 'bg' ? '🔥 Популярни' : '🔥 Popular'}
          movies={popularMovies}
          loading={loading}
        />

        {/* Top Rated */}
        <MovieCarousel
          title={language === 'bg' ? '⭐ Най-високо оценени' : '⭐ Top Rated'}
          movies={topRatedMovies}
          loading={loading}
        />

        {/* Trending */}
        <MovieCarousel
          title={language === 'bg' ? '📈 Trending' : '📈 Trending'}
          movies={trendingMovies}
          loading={loading}
        />

        {/* Browse All Movies CTA */}
        <div className={`mt-12 p-8 rounded-2xl text-center ${
          theme === 'dark' ? 'bg-gray-900' : 'bg-white shadow-lg'
        }`}>
          <h2 className={`text-2xl font-bold mb-2 ${
            theme === 'dark' ? 'text-white' : 'text-gray-900'
          }`}>
            {language === 'bg' ? 'Искаш да видиш повече?' : 'Want to see more?'}
          </h2>
          <p className={`mb-6 ${
            theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
          }`}>
            {language === 'bg' 
              ? 'Разгледай всички филми с филтри по жанр, настроение и рейтинг'
              : 'Browse all movies with filters by genre, mood, and rating'
            }
          </p>
          <Link
            to="/browse"
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
          >
            {language === 'bg' ? 'Разгледай всички филми' : 'Browse All Movies'}
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className={`py-8 mt-16 ${
        theme === 'dark' ? 'bg-gray-900' : 'bg-white'
      }`}>
        <div className="max-w-7xl mx-auto px-4">
          <TMDBAttribution />
          
          <div className={`text-center text-sm mt-6 ${
            theme === 'dark' ? 'text-gray-500' : 'text-gray-600'
          }`}>
            <p>{t.footerTitle}</p>
            <p className="mt-1">{t.footerPowered}</p>
          </div>
        </div>
      </footer>
    </div>
  );
}