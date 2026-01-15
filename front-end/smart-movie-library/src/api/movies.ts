// src/api/movies.ts
import api from './client';
import type { Movie } from '../types';
import type { SearchResult } from '../types';

const pendingRequests = new Map<string, Promise<unknown>>();

async function dedupedRequest<T>(key: string, request: () => Promise<T>): Promise<T> {
  if (pendingRequests.has(key)) {
    return pendingRequests.get(key) as Promise<T>;
  }
  
  const promise = request().finally(() => {
    pendingRequests.delete(key);
  });
  
  pendingRequests.set(key, promise);
  return promise;
}

export const moviesApi = {
  getAll: async (): Promise<Movie[]> => {
  return dedupedRequest('getAll', async () => {
    const response = await api.get('/movies/?skip=0&limit=500');
    return response.data;
  });
},

  getById: async (id: number): Promise<Movie> => {
    return dedupedRequest(`getById:${id}`, async () => {
      const response = await api.get(`/movies/${id}`);
      return response.data;
    });
  },

  // Semantic AI search (supports Bulgarian!)
  search: async (query: string, genre?: string, minRating?: number): Promise<SearchResult[]> => {
    const params = new URLSearchParams({ q: query });
    if (genre) params.append('genre', genre);
    if (minRating) params.append('min_rating', minRating.toString());
    
    const key = `search:${params.toString()}`;
    return dedupedRequest(key, async () => {
      const response = await api.get(`/ai/search?${params}`);
      return response.data;
    });
  },

  // Simple title search (filters locally or via backend)
  searchByTitle: async (query: string): Promise<Movie[]> => {
    const key = `titleSearch:${query}`;
    return dedupedRequest(key, async () => {
      // Option 1: Use backend search endpoint if available
      try {
        const response = await api.get(`/movies/search?q=${encodeURIComponent(query)}`);
        return response.data;
      } catch {
        // Option 2: Fallback to filtering all movies locally
        const allMovies = await moviesApi.getAll();
        const lowerQuery = query.toLowerCase();
        return allMovies.filter(movie => 
          movie.title.toLowerCase().includes(lowerQuery) ||
          (movie.title_bg && movie.title_bg.toLowerCase().includes(lowerQuery))
        );
      }
    });
  },

  // Search by mood
  searchByMood: async (mood: string): Promise<SearchResult[]> => {
    return dedupedRequest(`mood:${mood}`, async () => {
      const response = await api.get(`/ai/search/by-mood/${mood}`);
      return response.data;
    });
  },

  // Get similar movies
  getSimilar: async (movieId: number): Promise<Movie[]> => {
    return dedupedRequest(`similar:${movieId}`, async () => {
      const response = await api.get(`/ai/recommend/similar/${movieId}`);
      return response.data.map((item: unknown) => (item as { movie: Movie }).movie);
    });
  },

  // Get personalized recommendations (requires auth)
  getRecommendations: async (): Promise<Movie[]> => {
    const response = await api.get('/ai/recommend/for-me');
    return response.data.map((item: unknown) => (item as { movie: Movie }).movie);
  },

  // Prefetch - warm up the cache
  prefetch: async () => {
    try {
      await moviesApi.getAll();
    } catch (e) {
      console.warn('Prefetch failed:', e);
    }
  }
};