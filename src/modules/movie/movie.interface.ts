import { MediaType } from '@prisma/client';

export interface CreateMediaDto {
  title: string;
  synopsis: string;
  type: MediaType;
  genre: string[];
  releaseYear: number;
  director: string;
  cast: string[];
  streamingPlatforms: string[];
  posterUrl?: string;
  trailerUrl?: string;
  streamingUrl?: string;
  pricing?: string;
}

export interface UpdateMediaDto extends Partial<CreateMediaDto> {
  isPublished?: boolean;
}

export interface MediaFilterQuery {
  page?: number;
  limit?: number;
  type?: MediaType;
  genre?: string;
  releaseYear?: number;
  streamingPlatform?: string;
  minRating?: number;
  maxRating?: number;
  search?: string;
  sortBy?: 'newest' | 'topRated' | 'mostReviewed';
  pricing?: string;
}
