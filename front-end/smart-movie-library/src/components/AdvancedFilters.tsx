// src/components/AdvancedFilters.tsx
import { useState } from 'react';
import { Filter, X, ChevronDown } from 'lucide-react';
import { useApp } from '../context/AppContext';

interface Filters {
  genre: string;
  mood: string;
  minRating: number;
  sortBy: 'rating' | 'title' | 'reviews';
}

interface AdvancedFiltersProps {
  onFilterChange: (filters: Filters) => void;
  genres: string[];
}

const MOODS = [
  { id: 'all', label: 'All', labelBg: 'Всички' },
  { id: 'happy', label: 'Happy', labelBg: 'Весели' },
  { id: 'dark', label: 'Dark', labelBg: 'Мрачни' },
  { id: 'romantic', label: 'Romantic', labelBg: 'Романтични' },
  { id: 'thrilling', label: 'Thrilling', labelBg: 'Вълнуващи' },
  { id: 'thoughtful', label: 'Thoughtful', labelBg: 'За размисъл' },
  { id: 'funny', label: 'Funny', labelBg: 'Смешни' },
];

export default function AdvancedFilters({ onFilterChange, genres }: AdvancedFiltersProps) {
  const { theme, language } = useApp();
  const [isOpen, setIsOpen] = useState(false);
  const [filters, setFilters] = useState<Filters>({
    genre: 'all',
    mood: 'all',
    minRating: 0,
    sortBy: 'rating',
  });

  const updateFilter = <K extends keyof Filters>(key: K, value: Filters[K]) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const resetFilters = () => {
    const defaultFilters: Filters = {
      genre: 'all',
      mood: 'all',
      minRating: 0,
      sortBy: 'rating',
    };
    setFilters(defaultFilters);
    onFilterChange(defaultFilters);
  };

  const hasActiveFilters = filters.genre !== 'all' || filters.mood !== 'all' || filters.minRating > 0;

  return (
    <div className="mb-6">
      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
          theme === 'dark'
            ? 'bg-gray-800 hover:bg-gray-700 text-gray-300'
            : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
        } ${hasActiveFilters ? 'ring-2 ring-blue-500' : ''}`}
      >
        <Filter className="w-4 h-4" />
        <span>{language === 'bg' ? 'Филтри' : 'Filters'}</span>
        {hasActiveFilters && (
          <span className="bg-blue-500 text-white text-xs px-2 py-0.5 rounded-full">
            {[filters.genre !== 'all', filters.mood !== 'all', filters.minRating > 0].filter(Boolean).length}
          </span>
        )}
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Filter Panel */}
      {isOpen && (
        <div className={`mt-4 p-4 rounded-xl ${
          theme === 'dark' ? 'bg-gray-900' : 'bg-white shadow-lg'
        }`}>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Genre Filter */}
            <div>
              <label className={`block text-sm font-medium mb-2 ${
                theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
              }`}>
                {language === 'bg' ? 'Жанр' : 'Genre'}
              </label>
              <select
                value={filters.genre}
                onChange={(e) => updateFilter('genre', e.target.value)}
                className={`w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  theme === 'dark'
                    ? 'bg-gray-800 border-gray-700 text-white'
                    : 'bg-gray-50 border-gray-300 text-gray-900'
                }`}
              >
                <option value="all">{language === 'bg' ? 'Всички' : 'All'}</option>
                {genres.map((genre) => (
                  <option key={genre} value={genre}>{genre}</option>
                ))}
              </select>
            </div>

            {/* Mood Filter */}
            <div>
              <label className={`block text-sm font-medium mb-2 ${
                theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
              }`}>
                {language === 'bg' ? 'Настроение' : 'Mood'}
              </label>
              <select
                value={filters.mood}
                onChange={(e) => updateFilter('mood', e.target.value)}
                className={`w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  theme === 'dark'
                    ? 'bg-gray-800 border-gray-700 text-white'
                    : 'bg-gray-50 border-gray-300 text-gray-900'
                }`}
              >
                {MOODS.map((mood) => (
                  <option key={mood.id} value={mood.id}>
                    {language === 'bg' ? mood.labelBg : mood.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Min Rating Filter */}
            <div>
              <label className={`block text-sm font-medium mb-2 ${
                theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
              }`}>
                {language === 'bg' ? 'Мин. рейтинг' : 'Min Rating'}: {filters.minRating}+
              </label>
              <input
                type="range"
                min="0"
                max="5"
                step="0.5"
                value={filters.minRating}
                onChange={(e) => updateFilter('minRating', parseFloat(e.target.value))}
                className="w-full accent-blue-500"
              />
            </div>

            {/* Sort By */}
            <div>
              <label className={`block text-sm font-medium mb-2 ${
                theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
              }`}>
                {language === 'bg' ? 'Сортирай по' : 'Sort By'}
              </label>
              <select
                value={filters.sortBy}
                onChange={(e) => updateFilter('sortBy', e.target.value as Filters['sortBy'])}
                className={`w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  theme === 'dark'
                    ? 'bg-gray-800 border-gray-700 text-white'
                    : 'bg-gray-50 border-gray-300 text-gray-900'
                }`}
              >
                <option value="rating">{language === 'bg' ? 'Рейтинг' : 'Rating'}</option>
                <option value="title">{language === 'bg' ? 'Заглавие' : 'Title'}</option>
                <option value="reviews">{language === 'bg' ? 'Брой ревюта' : 'Reviews'}</option>
              </select>
            </div>
          </div>

          {/* Reset Button */}
          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className="mt-4 flex items-center gap-2 text-sm text-red-500 hover:text-red-400"
            >
              <X className="w-4 h-4" />
              {language === 'bg' ? 'Изчисти филтрите' : 'Clear Filters'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}