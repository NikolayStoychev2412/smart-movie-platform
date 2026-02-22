import type { Movie } from "../../types";

export type ProfileTab = "overview" | "reviews" | "settings";

export interface FavoriteEntry {
  id: number;
  movie_id: number;
  created_at: string;
  movie: Movie;
}

export interface ProfileCounts {
  favorites: number;
  completed: number;
  watchlist: number;
  watching: number;
  reviews: number;
}

export interface ProfileStats {
  rating_distribution: Record<number, number>;
  top_genres: { genre: string; count: number }[];
  top_decade: number | null;
  total_reviews: number;
  total_favorites: number;
  total_completed: number;
  total_watchlist: number;
  minutes_watched: number;
  average_rating_given: number;
  preferred_genres: string[];
  preferred_mood: string | null;
  member_since: string | null;
}
