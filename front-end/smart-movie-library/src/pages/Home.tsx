// src/pages/Home.tsx - TMDB-inspired design
// Replace your existing Home.tsx with this file

import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Movie } from '../types';
import { moviesApi } from '../api/movies';
import { useApp } from '../context/AppContext';
import { ChevronLeft, ChevronRight, TrendingUp, Star, Sparkles } from 'lucide-react';

// Circular progress component like TMDB
function CircularRating({ rating, size = 40 }: { rating: number; size?: number }) {
  const percentage = Math.round(rating * 20);
  const circumference = 2 * Math.PI * 18;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;
  
  const getColor = () => {
    if (percentage >= 70) return { stroke: '#21d07a', bg: '#204529' };
    if (percentage >= 50) return { stroke: '#d2d531', bg: '#423d0f' };
    return { stroke: '#db2360', bg: '#571435' };
  };
  
  const colors = getColor();
  
  return (
    <div 
      className="relative flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      <svg className="transform -rotate-90" width={size} height={size} viewBox="0 0 40 40">
        <circle
          cx="20"
          cy="20"
          r="18"
          fill="#081c22"
          stroke={colors.bg}
          strokeWidth="3"
        />
        <circle
          cx="20"
          cy="20"
          r="18"
          fill="none"
          stroke={colors.stroke}
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className="transition-all duration-500"
        />
      </svg>
      <span className="absolute text-white font-bold text-xs">
        {percentage}<sup className="text-[6px]">%</sup>
      </span>
    </div>
  );
}

// Movie card for horizontal scroll
function MovieCard({ movie, onClick, language }: { 
  movie: Movie; 
  onClick: () => void;
  language: string;
}) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  
  const title = language === 'bg' ? (movie.title_bg || movie.title) : movie.title;
  const posterUrl = movie.poster_url?.replace('/w500/', '/w342/').replace('/original/', '/w342/');
  
  return (
    <div 
      className="flex-shrink-0 w-[150px] cursor-pointer group"
      onClick={onClick}
    >
      <div className="relative rounded-lg overflow-hidden shadow-lg">
        {/* Poster */}
        <div className="aspect-[2/3] bg-gray-800 relative">
          {!imageLoaded && !imageError && (
            <div className="absolute inset-0 bg-gradient-to-br from-gray-700 to-gray-800 animate-pulse" />
          )}
          {posterUrl && !imageError ? (
            <img
              src={posterUrl}
              alt={title}
              className={`w-full h-full object-cover transition-all duration-300 group-hover:scale-105 ${
                imageLoaded ? 'opacity-100' : 'opacity-0'
              }`}
              loading="lazy"
              onLoad={() => setImageLoaded(true)}
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-700 to-gray-900">
              <span className="text-gray-500 text-xs text-center px-2">{title}</span>
            </div>
          )}
          
          {/* Hover overlay */}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
        </div>
        
        {/* Rating badge - positioned like TMDB */}
        <div className="absolute -bottom-4 left-2">
          <CircularRating rating={movie.average_rating} size={38} />
        </div>
      </div>
      
      {/* Title */}
      <div className="mt-6 px-1">
        <h3 className="font-semibold text-sm text-white group-hover:text-tmdb-light-blue transition-colors line-clamp-2">
          {title}
        </h3>
        <p className="text-gray-400 text-xs mt-1">
          {movie.review_count} {language === 'bg' ? 'ревюта' : 'reviews'}
        </p>
      </div>
    </div>
  );
}

// Horizontal scroll section with navigation
function MovieCarousel({ 
  title, 
  movies, 
  onMovieClick,
  language,
  tabs,
  activeTab,
  onTabChange,
  icon,
  gradient
}: { 
  title: string;
  movies: Movie[];
  onMovieClick: (movie: Movie) => void;
  language: string;
  tabs?: { id: string; label: string }[];
  activeTab?: string;
  onTabChange?: (tab: string) => void;
  icon?: React.ReactNode;
  gradient?: boolean;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  
  const checkScroll = useCallback(() => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
    }
  }, []);
  
  useEffect(() => {
    checkScroll();
    const ref = scrollRef.current;
    ref?.addEventListener('scroll', checkScroll);
    return () => ref?.removeEventListener('scroll', checkScroll);
  }, [checkScroll, movies]);
  
  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = direction === 'left' ? -600 : 600;
      scrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };
  
  return (
    <section className={`py-8 ${gradient ? 'bg-gradient-to-r from-tmdb-dark-blue to-purple-900/30' : ''}`}>
      {/* Header with tabs */}
      <div className="flex items-center gap-4 mb-6 px-6 md:px-10 flex-wrap">
        <div className="flex items-center gap-2">
          {icon}
          <h2 className="text-xl font-semibold text-white">{title}</h2>
        </div>
        
        {tabs && (
          <div className="flex rounded-full border border-tmdb-light-blue overflow-hidden">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => onTabChange?.(tab.id)}
                className={`px-4 md:px-5 py-1.5 text-sm font-medium transition-all ${
                  activeTab === tab.id
                    ? 'bg-tmdb-light-blue text-tmdb-dark-blue'
                    : 'text-tmdb-light-blue hover:bg-tmdb-light-blue/10'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}
      </div>
      
      {/* Carousel */}
      <div className="relative group/carousel">
        {/* Left arrow */}
        {canScrollLeft && (
          <button
            onClick={() => scroll('left')}
            className="absolute left-2 top-1/3 -translate-y-1/2 z-10 w-10 h-10 bg-black/80 hover:bg-black rounded-full flex items-center justify-center text-white opacity-0 group-hover/carousel:opacity-100 transition-opacity shadow-lg"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
        )}
        
        {/* Right arrow */}
        {canScrollRight && (
          <button
            onClick={() => scroll('right')}
            className="absolute right-2 top-1/3 -translate-y-1/2 z-10 w-10 h-10 bg-black/80 hover:bg-black rounded-full flex items-center justify-center text-white opacity-0 group-hover/carousel:opacity-100 transition-opacity shadow-lg"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        )}
        
        {/* Scrollable container */}
        <div
          ref={scrollRef}
          className="flex gap-5 overflow-x-auto scrollbar-hide px-6 md:px-10 pb-6"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {movies.map((movie) => (
            <MovieCard
              key={movie.id}
              movie={movie}
              onClick={() => onMovieClick(movie)}
              language={language}
            />
          ))}
          {movies.length === 0 && (
            <div className="flex items-center justify-center w-full py-12 text-gray-500">
              {language === 'bg' ? 'Зареждане...' : 'Loading...'}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

// Main Home component
export default function Home() {
  const navigate = useNavigate();
  const { theme, t, language } = useApp();
  
  const [allMovies, setAllMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [trendingTab, setTrendingTab] = useState('today');
  const [popularTab, setPopularTab] = useState('streaming');
  
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Movie[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  
  // Featured movie for hero section
  const [featuredMovie, setFeaturedMovie] = useState<Movie | null>(null);

  useEffect(() => {
    fetchMovies();
  }, []);

  const fetchMovies = async () => {
    try {
      setLoading(true);
      const data = await moviesApi.getAll();
      setAllMovies(data);
      
      // Pick a random highly-rated movie for hero
      const topMovies = data.filter(m => m.average_rating >= 4 && m.poster_url);
      if (topMovies.length > 0) {
        setFeaturedMovie(topMovies[Math.floor(Math.random() * topMovies.length)]);
      }
    } catch (err) {
      setError(t.loadError);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Get different movie lists
  const getTrending = useCallback(() => {
    const sorted = [...allMovies].sort((a, b) => b.review_count - a.review_count);
    return trendingTab === 'today' ? sorted.slice(0, 20) : sorted.slice(5, 25);
  }, [allMovies, trendingTab]);

  const getPopular = useCallback(() => {
    const sorted = [...allMovies].sort((a, b) => b.average_rating - a.average_rating);
    if (popularTab === 'streaming') return sorted.slice(0, 20);
    if (popularTab === 'tv') return sorted.slice(10, 30);
    return sorted.slice(20, 40);
  }, [allMovies, popularTab]);

  const getTopRated = useCallback(() => {
    return [...allMovies]
      .filter(m => m.review_count >= 2)
      .sort((a, b) => b.average_rating - a.average_rating)
      .slice(0, 20);
  }, [allMovies]);

  // Search handler
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    setShowSearchResults(true);
    
    try {
      const results = await moviesApi.search(searchQuery);
      setSearchResults(results.map(r => r.movie));
    } catch {
      // Fallback to local filtering
      const query = searchQuery.toLowerCase();
      const filtered = allMovies.filter(m => 
        m.title.toLowerCase().includes(query) ||
        (m.title_bg && m.title_bg.toLowerCase().includes(query))
      );
      setSearchResults(filtered);
    } finally {
      setIsSearching(false);
    }
  };

  const handleMovieClick = (movie: Movie) => {
    navigate(`/movie/${movie.id}`);
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
    setShowSearchResults(false);
  };

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${
        theme === 'dark' ? 'bg-tmdb-dark' : 'bg-gray-100'
      }`}>
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-tmdb-light-blue border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-400">{language === 'bg' ? 'Зареждане...' : 'Loading...'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen transition-colors ${
      theme === 'dark' ? 'bg-tmdb-dark' : 'bg-gray-100'
    }`}>
      {/* Hero Section with Search */}
      <section className="relative h-[300px] md:h-[360px] overflow-hidden">
        {/* Background Image */}
        {featuredMovie?.poster_url && (
          <div 
            className="absolute inset-0 bg-cover bg-center scale-110 blur-sm opacity-50"
            style={{ 
              backgroundImage: `url(${featuredMovie.poster_url.replace('/w342/', '/original/').replace('/w500/', '/original/')})`,
            }}
          />
        )}
        
        {/* Gradient overlays */}
        <div className="absolute inset-0 bg-gradient-to-r from-tmdb-dark-blue via-tmdb-dark-blue/90 to-tmdb-dark-blue/60" />
        <div className="absolute inset-0 bg-gradient-to-t from-tmdb-dark via-transparent to-transparent" />
        
        {/* Content */}
        <div className="relative h-full flex flex-col justify-center px-6 md:px-10 max-w-7xl mx-auto">
          <h1 className="text-3xl md:text-5xl font-bold text-white mb-2">
            {t.heroTitle}
          </h1>
          <p className="text-lg md:text-xl text-tmdb-light-blue font-medium mb-2">
            {t.heroHighlight}
          </p>
          <p className="text-gray-300 mb-8 md:mb-10">
            {t.heroSubtitle}
          </p>
          
          {/* Search Bar - TMDB style */}
          <form onSubmit={handleSearch} className="relative max-w-4xl">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t.searchPlaceholder}
              className="w-full px-6 py-3 md:py-4 pr-28 md:pr-32 rounded-full bg-white text-gray-900 text-base md:text-lg placeholder-gray-500 focus:outline-none focus:ring-4 focus:ring-tmdb-light-blue/30 shadow-xl"
            />
            <button
              type="submit"
              className="absolute right-1.5 md:right-2 top-1/2 -translate-y-1/2 px-6 md:px-8 py-2 md:py-3 bg-gradient-to-r from-tmdb-light-green to-tmdb-light-blue text-tmdb-dark-blue font-semibold rounded-full hover:opacity-90 transition-opacity text-sm md:text-base"
            >
              {t.search}
            </button>
          </form>
          
          {/* AI Search hint */}
          <p className="text-gray-400 text-xs md:text-sm mt-3 md:mt-4 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-tmdb-light-blue" />
            {t.searchHint}
          </p>
        </div>
      </section>

      {/* Search Results */}
      {showSearchResults && (
        <section className={`py-8 px-6 md:px-10 ${theme === 'dark' ? 'bg-gray-900/50' : 'bg-gray-200'}`}>
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
              <h2 className={`text-xl font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                {t.resultsFor} "{searchQuery}" ({searchResults.length})
              </h2>
              <button
                onClick={clearSearch}
                className="text-tmdb-light-blue hover:underline text-sm"
              >
                {language === 'bg' ? 'Изчисти търсенето' : 'Clear search'}
              </button>
            </div>
            
            {isSearching ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 border-4 border-tmdb-light-blue border-t-transparent rounded-full animate-spin" />
              </div>
            ) : searchResults.length === 0 ? (
              <p className="text-gray-400 text-center py-12">{t.noMoviesFound}</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-5">
                {searchResults.map((movie) => (
                  <MovieCard
                    key={movie.id}
                    movie={movie}
                    onClick={() => handleMovieClick(movie)}
                    language={language}
                  />
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* Main Content - Only show when not searching */}
      {!showSearchResults && (
        <>
          {/* Error Message */}
          {error && (
            <div className="px-6 md:px-10 py-4 max-w-7xl mx-auto">
              <div className={`rounded-lg p-4 ${
                theme === 'dark' 
                  ? 'bg-red-500/10 border border-red-500/20' 
                  : 'bg-red-50 border border-red-200'
              }`}>
                <p className="text-red-400">{error}</p>
                <button onClick={fetchMovies} className="text-red-400 underline text-sm mt-2">
                  {t.tryAgain}
                </button>
              </div>
            </div>
          )}

          {/* Trending Section */}
          <MovieCarousel
            title={language === 'bg' ? 'Популярни' : 'Trending'}
            movies={getTrending()}
            onMovieClick={handleMovieClick}
            language={language}
            icon={<TrendingUp className="w-5 h-5 text-tmdb-light-blue" />}
            tabs={[
              { id: 'today', label: language === 'bg' ? 'Днес' : 'Today' },
              { id: 'week', label: language === 'bg' ? 'Тази седмица' : 'This Week' },
            ]}
            activeTab={trendingTab}
            onTabChange={setTrendingTab}
          />

          {/* Popular Section with gradient background */}
          <MovieCarousel
            title={language === 'bg' ? 'Популярни филми' : 'What\'s Popular'}
            movies={getPopular()}
            onMovieClick={handleMovieClick}
            language={language}
            icon={<Star className="w-5 h-5 text-yellow-500" />}
            tabs={[
              { id: 'streaming', label: language === 'bg' ? 'Стрийминг' : 'Streaming' },
              { id: 'tv', label: language === 'bg' ? 'По ТВ' : 'On TV' },
              { id: 'rent', label: language === 'bg' ? 'Под наем' : 'For Rent' },
            ]}
            activeTab={popularTab}
            onTabChange={setPopularTab}
            gradient
          />

          {/* Top Rated Section */}
          <MovieCarousel
            title={language === 'bg' ? 'Най-високо оценени' : 'Top Rated'}
            movies={getTopRated()}
            onMovieClick={handleMovieClick}
            language={language}
            icon={<Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />}
          />

          {/* Join Community Section - TMDB style */}
          <section className="py-12 px-6 md:px-10">
            <div className="max-w-4xl mx-auto text-center bg-gradient-to-r from-tmdb-light-blue/20 to-tmdb-light-green/20 rounded-2xl p-8 md:p-12">
              <h2 className={`text-2xl md:text-3xl font-bold mb-4 ${
                theme === 'dark' ? 'text-white' : 'text-gray-900'
              }`}>
                {language === 'bg' ? 'Присъедини се към общността' : 'Join The Community'}
              </h2>
              <p className={`mb-6 leading-relaxed ${
                theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
              }`}>
                {language === 'bg' 
                  ? 'Регистрирай се безплатно и започни да следиш любимите си филми, да оставяш ревюта и да откриваш нови заглавия с помощта на AI.'
                  : 'Sign up for free and start tracking your favorite movies, leave reviews, and discover new titles with the help of AI.'
                }
              </p>
              <button
                onClick={() => navigate('/register')}
                className="px-8 py-3 bg-gradient-to-r from-tmdb-light-green to-tmdb-light-blue text-tmdb-dark-blue font-semibold rounded-full hover:opacity-90 transition-opacity"
              >
                {t.register}
              </button>
            </div>
          </section>
        </>
      )}

      {/* Footer */}
      <footer className={`border-t py-8 px-6 md:px-10 ${
        theme === 'dark' ? 'border-gray-800' : 'border-gray-200'
      }`}>
        <div className={`max-w-7xl mx-auto text-center text-sm ${
          theme === 'dark' ? 'text-gray-500' : 'text-gray-600'
        }`}>
          <p>{t.footerTitle}</p>
          <p className="mt-1">{t.footerPowered}</p>
        </div>
      </footer>
    </div>
  );
}