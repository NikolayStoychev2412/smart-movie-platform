// src/api/movies.ts
import api from './client';
import type { Movie } from '../types';
import type { SearchResult } from '../types';

// Request deduplication - prevent multiple identical requests
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
  // Get all movies with request deduplication
  getAll: async (): Promise<Movie[]> => {
    return dedupedRequest('getAll', async () => {
      const response = await api.get('/movies/');
      return response.data;
    });
  },

  // Get single movie
  getById: async (id: number): Promise<Movie> => {
    return dedupedRequest(`getById:${id}`, async () => {
      const response = await api.get(`/movies/${id}`);
      return response.data;
    });
  },

  // Semantic search (supports Bulgarian!)
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
      // Silent fail for prefetch
      console.warn('Prefetch failed:', e);
    }
  }
};