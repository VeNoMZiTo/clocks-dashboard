/**
 * Database stub module
 * 
 * TODO: Configure PostgreSQL connection for production
 * For now, provides in-memory mock for development
 */

type QueryResult<T = Record<string, unknown>> = {
  rows: T[];
  rowCount: number | null;
};

// In-memory storage for development
const mockStorage = new Map<string, unknown>();

async function query<T = Record<string, unknown>>(
  _sql: string,
  _params?: unknown[]
): Promise<QueryResult<T>> {
  // eslint-disable-next-line no-console
  console.warn('[db] Database not configured - using mock storage');
  return {
    rows: [],
    rowCount: 0
  };
}

export { query };
