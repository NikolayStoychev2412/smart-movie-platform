import type { Movie, Review } from "../types";

// Use VITE_API_URL directly - FastAPI routes are at root level (/movies, not /api/movies)
const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const token = localStorage.getItem("token");

  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`API Error: ${response.status}`);
  }

  return response.json();
}

export const moviesApi = {
  getAll: async (): Promise<Movie[]> => {
    return fetchJson<Movie[]>(`${API_BASE}/movies`);
  },

  getById: async (id: number): Promise<Movie> => {
    return fetchJson<Movie>(`${API_BASE}/movies/${id}`);
  },

  search: async (query: string): Promise<Movie[]> => {
    return fetchJson<Movie[]>(`${API_BASE}/movies/search?q=${encodeURIComponent(query)}`);
  },

  getReviews: async (id: number): Promise<Review[]> => {
    try {
      return await fetchJson<Review[]>(`${API_BASE}/movies/${id}/reviews`);
    } catch {
      return [];
    }
  },

  getSimilar: async (id: number): Promise<Movie[]> => {
    try {
      // Use AI similar movies endpoint - returns RecommendationOut[]
      const response = await fetchJson<any[]>(`${API_BASE}/ai/recommend/similar/${id}?top_k=10`);
      // Extract movies from RecommendationOut format
      if (response.length > 0 && response[0].movie) {
        return response.map(r => r.movie);
      }
      return response;
    } catch {
      return [];
    }
  },

  getPopular: async (): Promise<Movie[]> => {
    try {
      return await fetchJson<Movie[]>(`${API_BASE}/movies/popular`);
    } catch {
      return [];
    }
  },

  getTopRated: async (): Promise<Movie[]> => {
    try {
      return await fetchJson<Movie[]>(`${API_BASE}/movies/top-rated`);
    } catch {
      return [];
    }
  },

  getTrending: async (): Promise<Movie[]> => {
    try {
      return await fetchJson<Movie[]>(`${API_BASE}/movies/trending`);
    } catch {
      return [];
    }
  },

  getByMood: async (mood: string): Promise<Movie[]> => {
    try {
      return await fetchJson<Movie[]>(`${API_BASE}/movies/mood/${encodeURIComponent(mood)}`);
    } catch {
      return [];
    }
  },

  getByGenre: async (genre: string): Promise<Movie[]> => {
    try {
      return await fetchJson<Movie[]>(`${API_BASE}/movies/genre/${encodeURIComponent(genre)}`);
    } catch {
      return [];
    }
  },
};