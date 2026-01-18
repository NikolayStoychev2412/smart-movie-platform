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
  runtime?: number;
  tagline?: string;
  director?: string;
  average_rating?: number;
  review_count?: number;
}

export interface Actor {
  id: number;
  name: string;
  character?: string;
  profile_path?: string;
  profile_url?: string;
  order?: number;
}

export interface Review {
  id: number;
  author?: string;
  user_name?: string;
  content?: string;
  review_text?: string;
  rating?: number;
  created_at?: string;
}

export interface User {
  id: number;
  name: string;
  email: string;
  avatar?: string;
}