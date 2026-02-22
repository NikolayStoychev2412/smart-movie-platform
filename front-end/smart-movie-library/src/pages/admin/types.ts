
export type ApiError = { response?: { data?: { detail?: string }; status?: number } };

export interface Stats {
  totals: { users: number; movies: number; reviews: number; watchlist_entries: number; favorites: number };
  quality: { missing_bg_translation: number; missing_summary_bg?: number; missing_backdrop: number; avg_review_rating: number | null };
  top_reviewed_movies: { id: number; title: string; poster_path: string; review_count: number; avg_rating: number | null }[];
  popular_movies_fallback?: { id: number; title: string; poster_path: string; popularity: number }[];
  top_active_users: { id: number; name: string; email: string; review_count: number }[];
  recent_actions?: AuditEvent[];
}

export interface UserItem {
  id: number; name: string; email: string; is_admin: boolean; created_at?: string;
  preferred_genres?: string[]; preferred_mood?: string;
}

export interface ReviewItem {
  id: number; user_id: number; user_name: string; user_email: string;
  movie_id: number; movie_title: string; rating: number; comment: string | null; created_at: string | null;
}

export interface MovieItem {
  id: number; title: string; title_bg?: string; genre?: string; genre_bg?: string;
  tmdb_rating?: number; average_rating?: number; review_count?: number;
  poster_path?: string; poster_url?: string; backdrop_path?: string; backdrop_url?: string;
  release_date?: string; release_year?: number; runtime?: number;
  summary?: string; summary_bg?: string; popularity?: number;
}

export interface AuditEvent {
  timestamp: string;
  event_type: string;
  user_id?: number;
  user_email?: string;
  ip_address?: string;
  success?: boolean;
  details?: Record<string, unknown>;
}

export interface MovieEditForm {
  title: string; title_bg: string;
  genre: string; genre_bg: string;
  summary: string; summary_bg: string;
  release_date: string; runtime: string;
  poster_path: string; backdrop_path: string;
}

export type Tab = "dashboard" | "users" | "movies" | "reviews" | "activity";

export interface DialogState {
  open: boolean;
  message: string;
  onConfirm: () => void;
}
