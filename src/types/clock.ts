export interface PriceHistory {
  price: string;
  seen_at: string;
}

export interface ClockItem {
  id: string;
  title: string;
  description: string | null;
  latest_price: string;
  island_id: number;
  island_name: string;
  island_slug: string;
  source: string;
  first_seen_at: string;
  photos: string[];
  price_history: PriceHistory[];
  archived: number;
}

export interface GetClocksParams {
  page?: number;
  pageSize?: number;
  island?: string;
  archived?: boolean;
  sort?: string;
  dir?: 'asc' | 'desc';
}

export interface GetClocksResponse {
  data: ClockItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
