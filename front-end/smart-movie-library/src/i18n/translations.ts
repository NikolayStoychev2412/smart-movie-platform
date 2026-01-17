// src/i18n/translations.ts
// Replace your existing translations.ts with this file

export const translations = {
  bg: {
    // Navbar
    brand: 'КиноБаза',
    home: 'Начало',
    forYou: 'За теб',
    watchlist: 'Списък',
    login: 'Вход',
    register: 'Регистрация',
    logout: 'Изход',
    profile: 'Профил',
    
    // Hero - TMDB style
    heroTitle: 'Добре дошли.',
    heroHighlight: 'Милиони филми за откриване.',
    heroSubtitle: 'Интелигентно AI търсене на български и английски.',
    
    // Search
    searchPlaceholder: 'Търсене на филм...',
    search: 'Търси',
    searchByTitle: 'По заглавие',
    aiSearch: 'AI Търсене',
    searchHint: 'Опитай: "страшни филми" или "романтична комедия с щастлив край"',
    
    // Moods
    all: 'Всички',
    funny: 'Смешни',
    scary: 'Страшни',
    romantic: 'Романтични',
    exciting: 'Вълнуващи',
    sad: 'Тъжни',
    thoughtful: 'За размисъл',
    dark: 'Мрачни',
    uplifting: 'Вдъхновяващи',
    
    // Movies
    popularMovies: 'Популярни филми',
    movies: 'филма',
    reviews: 'ревюта',
    noMoviesFound: 'Няма намерени филми',
    resultsFor: 'Резултати за',
    
    // Errors
    loadError: 'Грешка при зареждане. Опитайте отново.',
    searchError: 'Грешка при търсене. Опитайте отново.',
    tryAgain: 'Опитай отново',
    
    // Footer
    footerTitle: 'Система за препоръки на филми • Дипломен проект 2025',
    footerPowered: 'Powered by AI семантично търсене',
  },
  
  en: {
    // Navbar
    brand: 'MovieBase',
    home: 'Home',
    forYou: 'For You',
    watchlist: 'Watchlist',
    login: 'Login',
    register: 'Sign Up',
    logout: 'Logout',
    profile: 'Profile',
    
    // Hero - TMDB style
    heroTitle: 'Welcome.',
    heroHighlight: 'Millions of movies to discover.',
    heroSubtitle: 'AI-powered search in Bulgarian and English.',
    
    // Search
    searchPlaceholder: 'Search for a movie...',
    search: 'Search',
    searchByTitle: 'By Title',
    aiSearch: 'AI Search',
    searchHint: 'Try: "scary movies" or "romantic comedy with happy ending"',
    
    // Moods
    all: 'All',
    funny: 'Funny',
    scary: 'Scary',
    romantic: 'Romantic',
    exciting: 'Exciting',
    sad: 'Sad',
    thoughtful: 'Thoughtful',
    dark: 'Dark',
    uplifting: 'Uplifting',
    
    // Movies
    popularMovies: 'Popular Movies',
    movies: 'movies',
    reviews: 'reviews',
    noMoviesFound: 'No movies found',
    resultsFor: 'Results for',
    
    // Errors
    loadError: 'Failed to load. Please try again.',
    searchError: 'Search failed. Please try again.',
    tryAgain: 'Try again',
    
    // Footer
    footerTitle: 'Movie Recommendation System • Diploma Project 2025',
    footerPowered: 'Powered by AI Semantic Search',
  },
};

export type Language = 'bg' | 'en';
export type Translations = typeof translations.bg;