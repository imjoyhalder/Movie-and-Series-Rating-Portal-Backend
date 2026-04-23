import type { ReviewStatus } from '@prisma/client';

export interface ModerateReviewDto {
  status: ReviewStatus;
}

export interface AdminStatsQuery {
  from?: string;
  to?: string;
}
