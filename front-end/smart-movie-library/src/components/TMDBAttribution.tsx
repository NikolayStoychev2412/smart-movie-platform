// src/components/TMDBAttribution.tsx
import { useApp } from '../context/AppContext';

export default function TMDBAttribution() {
  const { theme, language } = useApp();

  return (
    <div className={`flex flex-col items-center gap-4 py-6 border-t ${
      theme === 'dark' ? 'border-gray-800' : 'border-gray-200'
    }`}>
      <div className="flex items-center gap-3">
        <img
          src="https://www.themoviedb.org/assets/2/v4/logos/v2/blue_short-8e7b30f73a4020692ccca9c88bafe5dcb6f8a62a4c6bc55cd9ba82bb2cd95f6c.svg"
          alt="TMDB Logo"
          className="h-6"
        />
      </div>
      <p className={`text-xs text-center max-w-md ${
        theme === 'dark' ? 'text-gray-500' : 'text-gray-600'
      }`}>
        {language === 'bg' 
          ? 'Този продукт използва TMDB API, но не е одобрен или сертифициран от TMDB. Всички данни за филми са предоставени от The Movie Database (TMDB).'
          : 'This product uses the TMDB API but is not endorsed or certified by TMDB. All movie data is provided by The Movie Database (TMDB).'
        }
      </p>
      <a
        href="https://www.themoviedb.org/"
        target="_blank"
        rel="noopener noreferrer"
        className="text-xs text-blue-500 hover:text-blue-400"
      >
        {language === 'bg' ? 'Посетете TMDB' : 'Visit TMDB'}
      </a>
    </div>
  );
}