/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Movie } from "../types";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

/**
 * Search result shape coming from backend:
 * { movie, relevance, snippet }
 */
export interface SearchResult {
  movie: Movie;
  relevance: number;
  snippet: string;
}

// Recommendation types
export interface RecommendationExplanation {
  reasons: string[];
  reasons_bg?: string[];
  score_breakdown?: Record<string, number>;
  total_score: number;
  weights_used?: Record<string, number>;
  activity_level?: string;
}

export interface RecommendationWithExplanation {
  movie: Movie;
  score: number;
  explanation: RecommendationExplanation;
}

// Helper to get auth header
const getAuthHeaders = (): Record<string, string> => {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const moviesApi = {
  async getAll(): Promise<Movie[]> {
    const response = await fetch(`${API_BASE_URL}/movies/`);
    if (!response.ok) throw new Error("Failed to fetch movies");
    return response.json();
  },

  async getById(id: number): Promise<Movie> {
    const response = await fetch(`${API_BASE_URL}/movies/${id}`);
    if (!response.ok) throw new Error("Failed to fetch movie");
    return response.json();
  },

  async getByGenre(genre: string): Promise<Movie[]> {
    const response = await fetch(`${API_BASE_URL}/movies/genre/${encodeURIComponent(genre)}`);
    if (!response.ok) throw new Error("Failed to fetch movies by genre");
    return response.json();
  },

  async getTopRated(minReviews = 5, limit = 20): Promise<Movie[]> {
    const response = await fetch(`${API_BASE_URL}/movies/top-rated/?min_reviews=${minReviews}&limit=${limit}`);
    if (!response.ok) throw new Error("Failed to fetch top-rated movies");
    return response.json();
  },

  /**
   * AI search (backend route: GET /ai/search?q=...)
   */
  async search(query: string): Promise<SearchResult[]> {
    const response = await fetch(`${API_BASE_URL}/ai/search?q=${encodeURIComponent(query)}`);
    if (!response.ok) throw new Error("Failed to search");

    const data = await response.json();
    const items = Array.isArray(data) ? data : data?.results ?? data?.items ?? [];

    return items.map((item: any) => ({
      movie: item.movie,
      relevance: item.relevance ?? 0,
      snippet: item.snippet ?? "",
    }));
  },

  /**
   * For-me recommendations (backend: GET /ai/recommend/for-me?top_k=...)
   */
  async getRecommendations(limit = 20): Promise<RecommendationWithExplanation[]> {
    const response = await fetch(`${API_BASE_URL}/ai/recommend/for-me?top_k=${limit}`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error("Failed to fetch recommendations");

    const data = await response.json();
    const items = Array.isArray(data) ? data : data?.results ?? data?.items ?? [];

    return items.map((item: any) => ({
      movie: item.movie,
      score: item.score ?? 0,
      explanation: {
        reasons: item.explanation?.reasons ?? ["Recommended for you"],
        reasons_bg: item.explanation?.reasons_bg ?? ["Препоръчано за теб"],
        score_breakdown: item.explanation?.score_breakdown ?? {},
        total_score: item.explanation?.total_score ?? item.score ?? 0,
        weights_used: item.explanation?.weights_used,
        activity_level: item.explanation?.activity_level,
      },
    }));
  },

  /**
   * Similar recommendations (backend: GET /ai/recommend/similar/{movieId}?top_k=...)
   */
  async getSimilar(movieId: number, limit = 10): Promise<Movie[]> {
    const response = await fetch(`${API_BASE_URL}/ai/recommend/similar/${movieId}?top_k=${limit}`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error("Failed to fetch similar movies");

    const data = await response.json();
    const items = Array.isArray(data) ? data : data?.results ?? data?.items ?? [];
    return items.map((item: any) => item.movie ?? item);
  },
};

// Reviews API
export const reviewsApi = {
  async getForMovie(movieId: number) {
    const response = await fetch(`${API_BASE_URL}/reviews/movies/${movieId}`);
    if (!response.ok) throw new Error("Failed to fetch reviews");
    return response.json();
  },

  async create(movieId: number, rating: number, comment: string) {
    const response = await fetch(`${API_BASE_URL}/reviews/movies/${movieId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders(),
      },
      body: JSON.stringify({ rating, comment }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.detail || "Failed to create review");
    }

    return response.json();
  },

  async update(reviewId: number, rating: number, comment: string) {
    const response = await fetch(`${API_BASE_URL}/reviews/${reviewId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders(),
      },
      body: JSON.stringify({ rating, comment }),
    });
    if (!response.ok) throw new Error("Failed to update review");
    return response.json();
  },

  async delete(reviewId: number) {
    const response = await fetch(`${API_BASE_URL}/reviews/${reviewId}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error("Failed to delete review");
    return response.json();
  },
};

// Watchlist API
export const watchlistApi = {
  async getMyWatchlist() {
    const response = await fetch(`${API_BASE_URL}/watchlist/`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error("Failed to fetch watchlist");
    return response.json();
  },

  async add(movieId: number, status = "planned") {
    const response = await fetch(`${API_BASE_URL}/watchlist/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders(),
      },
      body: JSON.stringify({ movie_id: movieId, status }),
    });
    if (!response.ok) throw new Error("Failed to add to watchlist");
    return response.json();
  },

  async updateStatus(movieId: number, status: string) {
    const response = await fetch(`${API_BASE_URL}/watchlist/${movieId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders(),
      },
      body: JSON.stringify({ status }),
    });
    if (!response.ok) throw new Error("Failed to update watchlist status");
    return response.json();
  },

  async remove(movieId: number) {
    const response = await fetch(`${API_BASE_URL}/watchlist/${movieId}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error("Failed to remove from watchlist");
    return response.json();
  },
};

// Auth API
export const authApi = {
  async login(email: string, password: string) {
    const formData = new FormData();
    formData.append("username", email);
    formData.append("password", password);

    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.detail || "Login failed");
    }

    return response.json();
  },

  async register(name: string, email: string, password: string, preferredGenres: string[] = []) {
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        email,
        password,
        preferred_genres: preferredGenres,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.detail || "Registration failed");
    }

    return response.json();
  },

  async getCurrentUser() {
    const response = await fetch(`${API_BASE_URL}/auth/me`, {
      headers: getAuthHeaders(),
    });

    if (!response.ok) throw new Error("Failed to fetch user");
    return response.json();
  },
};
