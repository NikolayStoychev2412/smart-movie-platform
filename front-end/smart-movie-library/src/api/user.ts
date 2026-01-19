import api from './client';
import type { WatchlistEntry, WatchStatus, Recommendation } from '../types';

export const userApi = {
  // ==================== WATCHLIST ====================
  
  getWatchlist: async (status?: WatchStatus): Promise<WatchlistEntry[]> => {
    const params = status ? { status } : {};
    const response = await api.get('/watchlist/', { params });
    return response.data;
  },

  addToWatchlist: async (movieId: number, status: WatchStatus = 'planned'): Promise<WatchlistEntry> => {
    const response = await api.post('/watchlist/', { movie_id: movieId, status });
    return response.data;
  },

  updateWatchlistStatus: async (movieId: number, status: WatchStatus): Promise<WatchlistEntry> => {
    const response = await api.put(`/watchlist/${movieId}`, { status });
    return response.data;
  },

  removeFromWatchlist: async (movieId: number): Promise<void> => {
    await api.delete(`/watchlist/${movieId}`);
  },

  getWatchlistStatus: async (movieId: number): Promise<WatchlistEntry | null> => {
    try {
      const response = await api.get(`/watchlist/${movieId}/status`);
      return response.data;
    } catch {
      return null;
    }
  },

  // ==================== RECOMMENDATIONS ====================

  getRecommendations: async (topK: number = 20): Promise<Recommendation[]> => {
    // Safety cap - backend max is 50
    const safeTopK = Math.min(Math.max(topK, 1), 50);
    const response = await api.get('/ai/recommend/for-me', { params: { top_k: safeTopK } });
    return response.data;
  },

  getSimilarMovies: async (movieId: number, topK: number = 10): Promise<Recommendation[]> => {
    // Safety cap - backend max is 50
    const safeTopK = Math.min(Math.max(topK, 1), 50);
    const response = await api.get(`/ai/recommend/similar/${movieId}`, { params: { top_k: safeTopK } });
    return response.data;
  },

  // ==================== USER PROFILE ====================

  updateProfile: async (data: { name?: string; email?: string }): Promise<void> => {
    await api.patch('/auth/me', data);
  },

  changePassword: async (currentPassword: string, newPassword: string): Promise<void> => {
    await api.post('/auth/change-password', {
      current_password: currentPassword,
      new_password: newPassword,
    });
  },

  getMyReviews: async (): Promise<any[]> => {
    try {
      const response = await api.get('/reviews/my');
      return response.data;
    } catch {
      return [];
    }
  },
};