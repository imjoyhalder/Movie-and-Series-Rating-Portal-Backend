import { Role } from '@prisma/client';

// req.user shape — populated by the authenticate middleware from Better Auth session
export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  isEmailVerified: boolean;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export interface PaginationQuery {
  page?: number;
  limit?: number;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  meta?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}
