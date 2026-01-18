export interface Movie {
  id: number;
  title: string;
  genre?: string;
  summary?: string;

  poster_url?: string | null;
  poster_path?: string | null;

  backdrop_url?: string | null;
  backdrop_path?: string | null;

  average_rating: number;
  review_count: number;

  title_bg?: string | null;
  genre_bg?: string | null;
  summary_bg?: string | null;

  // extra fields your MovieDetail uses (all optional)
  tagline?: string | null;
  tagline_bg?: string | null;
  release_year?: number | null;
  release_date?: string | null;
  runtime?: number | null;
  runtime_formatted?: string | null;
  adult?: boolean;

  trailer_youtube_key?: string | null;

  director?: string | null;
  cast?: any[];
  crew?: any[];
  production_companies?: any[];

  homepage?: string | null;
  imdb_id?: string | null;

  status?: string | null;
  original_language?: string | null;

  budget?: number | null;
  budget_formatted?: string | null;
  revenue?: number | null;
  revenue_formatted?: string | null;

  tmdb_rating?: number | null;
  tmdb_vote_count?: number | null;
  popularity?: number | null;

  // keep if you still use these in UI
  display_title?: string;
  display_genre?: string;
  display_summary?: string;
}
