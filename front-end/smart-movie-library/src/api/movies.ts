import api from './client';
import type { Movie, SearchResult } from '../types';

interface RecommendationItem {
  movie: Movie;
  score: number;
  explanation: object;
}

export const moviesApi = {
  // Get all movies (with optional title search)
  getAll: async (search?: string, genre?: string): Promise<Movie[]> => {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (genre) params.append('genre', genre);
    
    const url = params.toString() ? `/movies/?${params}` : '/movies/';
    const response = await api.get(url);
    return response.data;
  },

  // Get single movie
  getById: async (id: number): Promise<Movie> => {
    const response = await api.get(`/movies/${id}`);
    return response.data;
  },

  // Semantic search (AI-powered)
  semanticSearch: async (query: string, genre?: string, minRating?: number): Promise<SearchResult[]> => {
    const params = new URLSearchParams({ q: query });
    if (genre) params.append('genre', genre);
    if (minRating) params.append('min_rating', minRating.toString());
    
    const response = await api.get(`/ai/search?${params}`);
    return response.data;
  },

  // Search by mood
  searchByMood: async (mood: string): Promise<SearchResult[]> => {
    const response = await api.get(`/ai/search/by-mood/${mood}`);
    return response.data;
  },

  // Get similar movies
  getSimilar: async (movieId: number): Promise<Movie[]> => {
    const response = await api.get(`/ai/recommend/similar/${movieId}`);
    return response.data.map((item: RecommendationItem) => item.movie);
  },

  // Get personalized recommendations
  getRecommendations: async (): Promise<Movie[]> => {
    const response = await api.get('/ai/recommend/for-me');
    return response.data.map((item: RecommendationItem) => item.movie);
  },
};