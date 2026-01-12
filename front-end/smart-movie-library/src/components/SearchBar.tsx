// src/components/SearchBar.tsx
import { useState, type FormEvent } from 'react';
import { Search, X, Sparkles } from 'lucide-react';
import { useApp } from '../context/AppContext';

interface SearchBarProps {
  onSearch: (query: string, isSemanticSearch: boolean) => void;
  initialValue?: string;
}

export default function SearchBar({ onSearch, initialValue = "" }: SearchBarProps) {
  const [query, setQuery] = useState(initialValue);
  const [isSemanticSearch, setIsSemanticSearch] = useState(true);
  const { t } = useApp();

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      onSearch(query.trim(), isSemanticSearch);
    }
  };

  const handleClear = () => {
    setQuery('');
    onSearch('', isSemanticSearch);
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <form onSubmit={handleSubmit} className="relative">
        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
        
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t.searchPlaceholder}
          className="w-full pl-12 pr-28 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-full text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
        />
        
        {query && (
          <button type="button" onClick={handleClear} className="absolute right-24 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-white p-1">
            <X className="w-4 h-4" />
          </button>
        )}
        
        <button type="submit" className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded-full text-sm font-medium transition-colors">
          {t.search}
        </button>
      </form>
      
      <div className="flex justify-center gap-4 mt-3">
        <button
          onClick={() => setIsSemanticSearch(false)}
          className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm transition-all ${
            !isSemanticSearch 
              ? 'bg-blue-600 text-white' 
              : 'bg-gray-200 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          <Search className="w-3 h-3" />
          {t.searchByTitle}
        </button>
        <button
          onClick={() => setIsSemanticSearch(true)}
          className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm transition-all ${
            isSemanticSearch 
              ? 'bg-blue-600 text-white' 
              : 'bg-gray-200 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          <Sparkles className="w-3 h-3" />
          {t.aiSearch}
        </button>
      </div>
      
      <p className="text-gray-500 text-xs mt-2 text-center">{t.searchHint}</p>
    </div>
  );
}