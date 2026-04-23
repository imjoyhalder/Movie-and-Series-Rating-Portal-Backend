import { ReviewStatus } from '@prisma/client';

export interface CreateReviewDto {
  mediaId: string;
  rating: number;
  content: string;
  tags?: string[];
  hasSpoiler?: boolean;
}

export interface UpdateReviewDto {
  rating?: number;
  content?: string;
  tags?: string[];
  hasSpoiler?: boolean;
}

export interface ReviewFilterQuery {
  page?: number;
  limit?: number;
  status?: ReviewStatus;
  mediaId?: string;
  userId?: string;
  sortBy?: 'newest' | 'topRated' | 'mostLiked';
}
