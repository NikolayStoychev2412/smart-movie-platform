import type { Movie, Review, CastMember, CrewMember } from "../types";

// Use VITE_API_URL directly - FastAPI routes are at root level (/movies, not /api/movies)
const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

export interface CastResponse {
  cast: CastMember[];
  crew: CrewMember[];
}

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const token = localStorage.getItem("token");
  
  console.log("[Movies API]", options?.method || "GET", url);
  
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  });

  if (!response.ok) {
    console.error("[Movies API] Error:", response.status, response.statusText);
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

  getCast: async (id: number): Promise<CastMember[]> => {
    try {
      const response = await fetchJson<CastResponse | CastMember[]>(`${API_BASE}/movies/${id}/cast`);
      if (Array.isArray(response)) return response;
      return response.cast || [];
    } catch {
      return [];
    }
  },

  getCrew: async (id: number): Promise<CrewMember[]> => {
    try {
      const response = await fetchJson<CastResponse>(`${API_BASE}/movies/${id}/cast`);
      return response.crew || [];
    } catch {
      return [];
    }
  },

  getCredits: async (id: number): Promise<CastResponse> => {
    try {
      return await fetchJson<CastResponse>(`${API_BASE}/movies/${id}/credits`);
    } catch {
      return { cast: [], crew: [] };
    }
  },

  getReviews: async (id: number): Promise<Review[]> => {
    try {
      return await fetchJson<Review[]>(`${API_BASE}/movies/${id}/reviews`);
    } catch {
      return [];
    }
  },

  getRecommendations: async (id: number): Promise<Movie[]> => {
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