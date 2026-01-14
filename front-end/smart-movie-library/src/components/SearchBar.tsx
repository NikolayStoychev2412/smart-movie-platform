// src/components/SearchBar.tsx
import { useState, type FormEvent } from 'react';
import { useApp } from '../context/AppContext';
import { Search, Sparkles } from 'lucide-react';

type SearchMode = 'ai' | 'title';

interface SearchBarProps {
  onSearch: (query: string, mode: SearchMode) => void;
  initialValue?: string;
}

export default function SearchBar({ onSearch, initialValue = "" }: SearchBarProps) {
  const { theme, t } = useApp();
  const [query, setQuery] = useState(initialValue);
  const [searchMode, setSearchMode] = useState<SearchMode>('ai');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      onSearch(query.trim(), searchMode);
    }
  };

  const handleClear = () => {
    setQuery('');
    onSearch('', searchMode);
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Search Mode Toggle */}
      <div className="flex justify-center gap-2 mb-4">
        <button
          type="button"
          onClick={() => setSearchMode('ai')}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
            searchMode === 'ai'
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25'
              : theme === 'dark'
                ? 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
                : 'bg-gray-200 text-gray-600 hover:bg-gray-300 hover:text-gray-900'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          {t.aiSearch}
        </button>
        <button
          type="button"
          onClick={() => setSearchMode('title')}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
            searchMode === 'title'
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25'
              : theme === 'dark'
                ? 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
                : 'bg-gray-200 text-gray-600 hover:bg-gray-300 hover:text-gray-900'
          }`}
        >
          <Search className="w-4 h-4" />
          {t.searchByTitle}
        </button>
      </div>

      {/* Search Input */}
      <form onSubmit={handleSubmit} className="relative">
        <div className="relative">
          {/* Icon */}
          {searchMode === 'ai' ? (
            <Sparkles className={`absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 ${
              theme === 'dark' ? 'text-blue-400' : 'text-blue-500'
            }`} />
          ) : (
            <Search className={`absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 ${
              theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
            }`} />
          )}
          
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={searchMode === 'ai' ? t.searchPlaceholder : (t.searchByTitle + '...')}
            className={`w-full pl-12 pr-28 py-3 border rounded-full focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all ${
              theme === 'dark'
                ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500'
                : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
            }`}
          />
          
          {/* Clear button */}
          {query && (
            <button
              type="button"
              onClick={handleClear}
              className={`absolute right-24 top-1/2 transform -translate-y-1/2 p-1 ${
                theme === 'dark' ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
          
          <button
            type="submit"
            className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded-full text-sm font-medium transition-colors"
          >
            {t.search}
          </button>
        </div>
        
        {/* Hint text */}
        <p className={`text-xs mt-2 text-center ${
          theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
        }`}>
          {searchMode === 'ai' 
            ? t.searchHint
            : (theme === 'dark' ? 'Enter exact movie title' : 'Въведете точното заглавие')
          }
        </p>
      </form>
    </div>
  );
}