/**
 * Favorites storage module
 *
 * Users can favorite clocks from external API
 */

import { query } from './db';

export type Favorite = {
  id: string;
  userId: string;
  clockId: string;
  createdAt: number;
};

type FavoriteRow = {
  id: string;
  user_id: string;
  clock_id: string;
  created_at: number;
};

function rowToFavorite(row: FavoriteRow): Favorite {
  return {
    id: row.id,
    userId: row.user_id,
    clockId: row.clock_id,
    createdAt: row.created_at
  };
}

/**
 * Get all favorites for a user
 */
export async function getFavoritesByUser(userId: string): Promise<Favorite[]> {
  const result = await query<FavoriteRow>(
    'SELECT * FROM favorites WHERE user_id = $1 ORDER BY created_at DESC',
    [userId]
  );
  
  return result.rows.map(rowToFavorite);
}

/**
 * Check if a clock is favorited by a user
 */
export async function isFavorite(userId: string, clockId: string): Promise<boolean> {
  const result = await query(
    'SELECT 1 FROM favorites WHERE user_id = $1 AND clock_id = $2',
    [userId, clockId]
  );
  
  return result.rows.length > 0;
}

/**
 * Add a clock to user's favorites
 */
export async function addFavorite(userId: string, clockId: string): Promise<Favorite> {
  const id = globalThis.crypto?.randomUUID?.() || `fav_${Date.now()}`;
  const now = Date.now();

  await query(
    `INSERT INTO favorites (id, user_id, clock_id, created_at)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (user_id, clock_id) DO NOTHING`,
    [id, userId, clockId, now]
  );

  // Return the favorite (fetch in case of conflict)
  const result = await query<FavoriteRow>(
    'SELECT * FROM favorites WHERE user_id = $1 AND clock_id = $2',
    [userId, clockId]
  );

  return rowToFavorite(result.rows[0]);
}

/**
 * Remove a clock from user's favorites
 */
export async function removeFavorite(userId: string, clockId: string): Promise<boolean> {
  const result = await query(
    'DELETE FROM favorites WHERE user_id = $1 AND clock_id = $2',
    [userId, clockId]
  );
  
  return (result.rowCount ?? 0) > 0;
}

/**
 * Get favorite by ID
 */
export async function getFavoriteById(id: string): Promise<Favorite | null> {
  const result = await query<FavoriteRow>(
    'SELECT * FROM favorites WHERE id = $1',
    [id]
  );
  
  if (result.rows.length === 0) return null;
  return rowToFavorite(result.rows[0]);
}

/**
 * Count favorites for a clock
 */
export async function countFavoritesForClock(clockId: string): Promise<number> {
  const result = await query<{ count: string }>(
    'SELECT COUNT(*)::text as count FROM favorites WHERE clock_id = $1',
    [clockId]
  );
  
  return parseInt(result.rows[0]?.count || '0', 10);
}
