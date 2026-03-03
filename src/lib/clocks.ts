const API_BASE = "https://automation.dimensiontei.com/webhook/clocks";

const AUTH_USER = "relojes";
const AUTH_PASS = "nnS4MDu9DcJb";

export type ClockPricePoint = {
  date: string;
  price: number;
};

export type Clock = {
  id: string;
  title: string;
  description: string;
  price: number;
  currency: string;
  island: string;
  source: string;
  publishedAt: string;
  firstSeenAt: string;
  updatedAt: string;
  sourceUrl: string;
  photos: string[];
  priceHistory: ClockPricePoint[];
};

type ApiPhoto = {
  url?: string;
};

type ApiPriceHistory = {
  price?: number;
  captured_at?: string;
  date?: string;
};

type ApiClock = {
  id: string | number;
  title?: string;
  description?: string | null;
  latest_price?: string | number;
  latest_currency?: string;
  island_id?: number;
  island_name?: string;
  source?: string;
  first_seen_at?: string;
  last_seen_at?: string;
  latest_price_captured_at?: string;
  url?: string;
  photos?: Array<ApiPhoto | string>;
  price_history?: ApiPriceHistory[];
};

export type ClocksFilters = {
  page?: number;
  pageSize?: number;
  island?: string | number;
  archived?: boolean;
  sort?: string;
  dir?: "asc" | "desc";
};

export type ClocksResponse = {
  data: Clock[];
  total: number;
  totalPages: number;
  page: number;
  pageSize: number;
};

function getAuthHeaders(): HeadersInit {
  const credentials = typeof btoa === "function"
    ? btoa(`${AUTH_USER}:${AUTH_PASS}`)
    : Buffer.from(`${AUTH_USER}:${AUTH_PASS}`).toString("base64");
  return {
    Authorization: `Basic ${credentials}`,
    "Content-Type": "application/json"
  };
}

function normalizePhotos(photos: Array<ApiPhoto | string> | undefined): string[] {
  if (!Array.isArray(photos)) return [];
  return photos
    .map((photo) => (typeof photo === "string" ? photo : photo.url))
    .filter((url): url is string => Boolean(url));
}

function normalizePriceHistory(
  history: ApiPriceHistory[] | undefined,
  fallbackDate: string,
  fallbackPrice: number
): ClockPricePoint[] {
  if (!Array.isArray(history)) return [];
  return history.map((entry) => ({
    date: entry.captured_at ?? entry.date ?? fallbackDate,
    price: typeof entry.price === "number" ? entry.price : fallbackPrice
  }));
}

function mapClock(apiClock: ApiClock): Clock {
  const price = typeof apiClock.latest_price === "number"
    ? apiClock.latest_price
    : Number.parseFloat(apiClock.latest_price ?? "0");
  const currency = apiClock.latest_currency ?? "EUR";
  const publishedAt =
    apiClock.last_seen_at ??
    apiClock.latest_price_captured_at ??
    apiClock.first_seen_at ??
    new Date().toISOString();
  const updatedAt =
    apiClock.last_seen_at ??
    apiClock.latest_price_captured_at ??
    publishedAt;
  const firstSeenAt = apiClock.first_seen_at ?? publishedAt;

  return {
    id: String(apiClock.id),
    title: apiClock.title ?? "",
    description: apiClock.description ?? "",
    price,
    currency,
    island: apiClock.island_name ?? String(apiClock.island_id ?? ""),
    source: apiClock.source ?? "",
    publishedAt,
    firstSeenAt,
    updatedAt,
    sourceUrl: apiClock.url ?? "",
    photos: normalizePhotos(apiClock.photos),
    priceHistory: normalizePriceHistory(apiClock.price_history, publishedAt, price)
  };
}

export async function fetchClocks(filters: ClocksFilters = {}): Promise<ClocksResponse> {
  const params = new URLSearchParams();

  if (filters.page) params.set("page", String(filters.page));
  if (filters.pageSize) params.set("pageSize", String(filters.pageSize));
  if (filters.island) params.set("island", String(filters.island));
  if (filters.archived !== undefined) params.set("archived", String(filters.archived));
  if (filters.sort) params.set("sort", filters.sort);
  if (filters.dir) params.set("dir", filters.dir);

  const url = `${API_BASE}?${params.toString()}`;

  try {
    const response = await fetch(url, {
      headers: getAuthHeaders()
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();

    if (Array.isArray(data)) {
      const pageSize = Number(filters.pageSize ?? data.length ?? 0) || data.length || 1;
      const total = data.length;
      const totalPages = Math.max(1, Math.ceil(total / pageSize));
      return {
        data: data.map(mapClock),
        total,
        totalPages,
        page: filters.page ?? 1,
        pageSize
      };
    }

    const pageSize = Number(data.pageSize ?? filters.pageSize ?? 50) || 50;
    const page = Number(data.page ?? filters.page ?? 1);
    const apiTotalPages = Number(data.totalPages ?? 0);
    const total = apiTotalPages ? apiTotalPages * pageSize : Number(data.total ?? 0);
    const totalPages = apiTotalPages || Math.max(1, Math.ceil(total / pageSize));

    return {
      data: Array.isArray(data.data) ? data.data.map(mapClock) : [],
      total,
      totalPages,
      page,
      pageSize
    };
  } catch (error) {
    console.error("Error fetching clocks:", error);
    return {
      data: [],
      total: 0,
      totalPages: 1,
      page: 1,
      pageSize: 50
    };
  }
}

export async function getClockById(id: string): Promise<Clock | undefined> {
  const pageSize = 100;
  const firstPage = await fetchClocks({ page: 1, pageSize });
  const initialMatch = firstPage.data.find((clock) => clock.id === id);
  if (initialMatch) return initialMatch;

  const totalPages = Math.min(10, Math.ceil(firstPage.total / pageSize));
  for (let page = 2; page <= totalPages; page += 1) {
    const response = await fetchClocks({ page, pageSize });
    const match = response.data.find((clock) => clock.id === id);
    if (match) return match;
  }

  return undefined;
}

export async function getAllClocks(): Promise<Clock[]> {
  const pageSize = 100;
  const firstPage = await fetchClocks({ page: 1, pageSize });
  const totalPages = Math.min(10, Math.ceil(firstPage.total / pageSize));

  if (totalPages <= 1) {
    return firstPage.data;
  }

  const pages = await Promise.all(
    Array.from({ length: totalPages - 1 }, (_, index) =>
      fetchClocks({ page: index + 2, pageSize })
    )
  );

  return [firstPage.data, ...pages.map((page) => page.data)].flat();
}
