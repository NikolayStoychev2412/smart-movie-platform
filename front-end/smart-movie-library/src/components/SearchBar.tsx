// src/components/SearchBar.tsx
import { useState, type FormEvent } from 'react';
import { Search, X, Sparkles } from 'lucide-react';

interface SearchBarProps {
  onSearch: (query: string, isSemanticSearch: boolean) => void;
  placeholder?: string;
  initialValue?: string;
}

export default function SearchBar({ 
  onSearch, 
  placeholder = "Търсене на филми...", 
  initialValue = "" 
}: SearchBarProps) {
  const [query, setQuery] = useState(initialValue);
  const [isSemanticSearch, setIsSemanticSearch] = useState(true);

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
        <div className="relative">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={placeholder}
            className="w-full pl-12 pr-28 py-3 bg-gray-800 border border-gray-700 rounded-full text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
          />
          
          {query && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute right-24 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white p-1"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          
          <button
            type="submit"
            className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded-full text-sm font-medium transition-colors"
          >
            Търси
          </button>
        </div>
      </form>
      
      {/* Search Type Toggle */}
      <div className="flex justify-center gap-4 mt-3">
        <button
          onClick={() => setIsSemanticSearch(false)}
          className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm transition-all ${
            !isSemanticSearch 
              ? 'bg-blue-600 text-white' 
              : 'bg-gray-800 text-gray-400 hover:text-white'
          }`}
        >
          <Search className="w-3 h-3" />
          По заглавие
        </button>
        <button
          onClick={() => setIsSemanticSearch(true)}
          className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm transition-all ${
            isSemanticSearch 
              ? 'bg-blue-600 text-white' 
              : 'bg-gray-800 text-gray-400 hover:text-white'
          }`}
        >
          <Sparkles className="w-3 h-3" />
          AI Търсене
        </button>
      </div>
    </div>
  );
}