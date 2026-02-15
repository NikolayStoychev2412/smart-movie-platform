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
    heroTitle: 'Открий следващия си филм.',
    heroHighlight: 'AI препоръки на български и английски.',
    heroSubtitle: 'Интелигентно AI търсене на български и английски.',

    // Search
    searchPlaceholder: 'Търсене на филм...',
    search: 'Търси',
    searchByTitle: 'По заглавие',
    aiSearch: 'AI Търсене',
    searchHint: 'Опитай: \'филми като Inception\' или \'весела комедия за вечерта\'',

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

    // Footer (kept for backwards compatibility, not used in Footer component)
    footerTitle: '',
    footerPowered: '',
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

    // Hero
    heroTitle: 'Discover your next film.',
    heroHighlight: 'AI-powered picks in Bulgarian and English.',
    heroSubtitle: 'AI-powered search in Bulgarian and English.',

    // Search
    searchPlaceholder: 'Search for a movie...',
    search: 'Search',
    searchByTitle: 'By Title',
    aiSearch: 'AI Search',
    searchHint: 'Try: \'movies like Inception\' or \'feel-good comedy for tonight\'',

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

    // Footer (kept for backwards compatibility, not used in Footer component)
    footerTitle: '',
    footerPowered: '',
  },
};

export type Language = 'bg' | 'en';
export type Translations = typeof translations.bg;
