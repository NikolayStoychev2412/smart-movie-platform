// src/i18n/translations.ts

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
    
    // Hero
    heroTitle: 'Открий своя следващ',
    heroHighlight: 'любим филм',
    heroSubtitle: 'Интелигентно търсене с AI • Персонализирани препоръки',
    
    // Search
    searchPlaceholder: 'Търсене на филми...',
    search: 'Търси',
    searchByTitle: 'По заглавие',
    aiSearch: 'AI Търсене',
    searchHint: 'Опитай: "страшни филми" или "романтична комедия"',
    
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
    register: 'Register',
    logout: 'Logout',
    profile: 'Profile',
    
    // Hero
    heroTitle: 'Discover Your Next',
    heroHighlight: 'Favorite Movie',
    heroSubtitle: 'AI-powered search • Personalized recommendations',
    
    // Search
    searchPlaceholder: 'Search movies...',
    search: 'Search',
    searchByTitle: 'By Title',
    aiSearch: 'AI Search',
    searchHint: 'Try: "scary movies" or "romantic comedy"',
    
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