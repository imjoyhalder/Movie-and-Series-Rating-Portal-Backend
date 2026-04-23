import { AppError } from './AppError';

/**
 * Await a nullable Prisma query; throw 404 (or custom code) if the result is null.
 *
 * Usage:
 *   const media = await findOrThrow(prisma.media.findUnique({ where: { id } }), 'Media not found');
 */
export async function findOrThrow<T>(
  query: Promise<T | null>,
  message = 'Resource not found',
  statusCode = 404,
): Promise<T> {
  const result = await query;
  if (result === null || result === undefined) throw new AppError(message, statusCode);
  return result;
}

/**
 * Assert that the requesting user owns the resource (or is an admin).
 * Throws 403 Forbidden on failure.
 */
export function assertOwnership(
  resourceUserId: string,
  requestUserId: string,
  isAdmin = false,
): void {
  if (!isAdmin && resourceUserId !== requestUserId) {
    throw new AppError('Access denied', 403);
  }
}
