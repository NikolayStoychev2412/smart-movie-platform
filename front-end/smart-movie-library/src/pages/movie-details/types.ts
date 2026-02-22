import type { Movie, Review } from "../../types";

export interface CastMember { id: number; name: string; character?: string; profile_path?: string; order?: number; }
export interface CrewMember { id: number; name: string; job: string; department: string; profile_path?: string; }
export interface Video { id: string; key: string; name: string; site: string; type: string; }
export interface ProductionCompany { id: number; name: string; logo_path?: string; origin_country?: string; }

export interface MovieDetail extends Movie {
  cast?: CastMember[]; crew?: CrewMember[]; videos?: Video[];
  trailer_youtube_key?: string; trailer_url?: string; trailer_embed_url?: string;
  main_actors?: string[]; budget_formatted?: string; revenue_formatted?: string;
  runtime_formatted?: string; poster_url_large?: string; backdrop_url_large?: string;
  homepage?: string; tmdb_rating?: number; production_companies?: ProductionCompany[];
  production_countries?: { iso_3166_1: string; name: string }[];
  imdb_id?: string; original_title?: string;
}

export interface SentimentAnalysis {
  sentiment: 'positive' | 'negative' | 'neutral';
  confidence: number;
  summary: string;
  keywords: string[];
}

export interface ReviewWithSentiment extends Review {
  sentiment?: SentimentAnalysis;
}
