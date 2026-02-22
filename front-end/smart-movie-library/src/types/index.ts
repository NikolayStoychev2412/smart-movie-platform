// Domain models - matching backend schemas

export interface Movie {
  id: number;
  title: string;
  title_bg?: string;
  summary?: string;
  summary_bg?: string;
  genre?: string;
  genre_bg?: string;
  poster_url?: string;
  poster_path?: string;
  backdrop_url?: string;
  backdrop_path?: string;
  release_date?: string;
  release_year?: number;
  runtime?: number;
  runtime_formatted?: string;
  tagline?: string;
  tagline_bg?: string;
  director?: string;
  average_rating?: number;
  tmdb_rating?: number;
  review_count?: number;
  // Detail fields
  budget?: number;
  revenue?: number;
  budget_formatted?: string;
  revenue_formatted?: string;
  status?: string;
  original_language?: string;
  original_title?: string;
  production_companies?: ProductionCompany[];
  spoken_languages?: Language[];
  cast?: CastMember[];
  crew?: CrewMember[];
  videos?: Video[];
  trailer_youtube_key?: string;
  main_actors?: string[];
  homepage?: string;
  // API extra fields
  tmdb_vote_count?: number;
  popularity?: number;
  favorite_count?: number;
  completed_count?: number;
}

// API error shape for axios catch blocks
export type ApiError = { response?: { data?: { detail?: string }; status?: number } };

// Search result returned by /ai/search
export interface SearchResult {
  movie: Movie;
  relevance: number;
  snippet?: string;
}

export interface ProductionCompany {
  id: number;
  name: string;
  logo_path?: string;
  origin_country?: string;
}

export interface Language {
  iso_639_1: string;
  name: string;
  english_name?: string;
}

export interface CastMember {
  id: number;
  name: string;
  character?: string;
  profile_path?: string;
  order?: number;
}

export interface CrewMember {
  id: number;
  name: string;
  job: string;
  department: string;
  profile_path?: string;
}

export interface Video {
  id: string;
  key: string;
  name: string;
  site: string;
  type: string;
  official?: boolean;
}

export interface Review {
  id: number;
  author?: string;
  user_name?: string;
  user_id?: number;
  content?: string;
  comment?: string;
  review_text?: string;
  rating?: number;
  created_at?: string;
  updated_at?: string;
  movie_id?: number;
  movie?: Movie;
}

// Auth types - matching backend UserResponse
export interface User {
  id: number;
  name: string;
  email: string;
  is_admin: boolean;
}

// Backend returns { access_token, token_type }
export interface TokenResponse {
  access_token: string;
  token_type: string;
}

// For convenience in frontend
export interface AuthResponse {
  user: User;
  token: string;
}

// Alias for backwards compatibility
export type Actor = CastMember;

// Watchlist types - matching backend WatchStatus enum
export type WatchStatus = 'completed' | 'watching' | 'dropped' | 'planned';

export interface WatchlistEntry {
  id: number;
  user_id: number;
  movie_id: number;
  status: WatchStatus;
  added_at: string;
  updated_at?: string;
  movie?: Movie;
}

// Recommendation types - matching backend RecommendationOut
export interface RecommendationExplanation {
  reasons?: string[];
  reasons_bg?: string[];
  score_breakdown?: Record<string, number>;
  total_score?: number;
  activity_level?: string;
  based_on?: string[];
  based_on_bg?: string[];
  similar_to?: string;
  similar_to_bg?: string;
  genre?: string;
  mood?: string;
  reason?: string;
  weights_used?: Record<string, number>;
}

export interface Recommendation {
  movie: Movie;
  score: number;
  explanation: RecommendationExplanation;
}