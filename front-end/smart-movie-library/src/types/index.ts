// src/types/index.ts

export interface Movie {
  id: number;
  title: string;
  genre: string;
  summary: string;
  poster_url: string | null;
  average_rating: number;
  review_count: number;
  title_bg: string | null;
  genre_bg: string | null;
  summary_bg: string | null;
  display_title: string;
  display_genre: string;
  display_summary: string;
}

export interface SearchResult {
  movie: Movie;
  relevance: number;
  snippet: string;
}

export interface User {
  id: number;
  name: string;
  email: string;
  is_admin: boolean;
}

export interface Review {
  id: number;
  user_id: number;
  movie_id: number;
  rating: number;
  comment: string | null;
  created_at: string;
}

export interface WatchlistEntry {
  id: number;
  movie_id: number;
  status: 'planned' | 'watching' | 'completed' | 'dropped';
  movie: Movie;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
}