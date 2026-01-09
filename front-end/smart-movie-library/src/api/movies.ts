// src/api/movies.ts
import api from './client';
import { type Movie, type SearchResult } from '../types/index';

export const moviesApi = {
  getAll: async (): Promise<Movie[]> => {
    const response = await api.get('/movies/');
    return response.data;
  },

  // Get single movie
  getById: async (id: number): Promise<Movie> => {
    const response = await api.get(`/movies/${id}`);
    return response.data;
  },

  // Semantic search (supports Bulgarian!)
  search: async (query: string, genre?: string, minRating?: number): Promise<SearchResult[]> => {
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
    return response.data.map((item: { movie: Movie }) => item.movie);
  },

  // Get personalized recommendations (requires auth)
  getRecommendations: async (): Promise<Movie[]> => {
    const response = await api.get('/ai/recommend/for-me');
    return response.data.map((item: { movie: Movie }) => item.movie);
  },
};