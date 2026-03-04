// API externa de n8n para relojes
const API_BASE = "https://automation.dimensiontei.com/webhook/clocks";
const API_ARCHIVE = "https://automation.dimensiontei.com/webhook/archive-item";

// Credenciales Basic Auth
const AUTH_USER = "relojes";
const AUTH_PASS = "nnS4MDu9DcJb";

export type Photo = {
  id: number;
  url: string;
  position: number;
  is_primary: boolean;
  last_seen_at: string;
  first_seen_at: string;
};

export type PriceHistory = {
  id: number;
  price: number;
  currency: string;
  captured_at: string;
};

export type Clock = {
  id: string;
  source: string;
  url: string;
  title: string;
  description: string | null;
  username: string;
  archived: number | null;
  first_seen_at: string;
  last_seen_at: string;
  island_id: number;
  island_name: string;
  island_slug: string;
  latest_price: string;
  latest_currency: string;
  latest_price_captured_at: string;
  photos: Photo[];
  price_history: PriceHistory[];
};

export type PaginationMeta = {
  pageSize: string;
  page: string;
  totalPages: number;
};

export type ClocksResponse = {
  data: Clock[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type ClocksFilters = {
  page?: number;
  pageSize?: number;
  island?: string | number;
  archived?: boolean;
  sort?: string;
  dir?: "asc" | "desc";
};

// Helper para Basic Auth
function getAuthHeaders(): HeadersInit {
  const credentials = btoa(`${AUTH_USER}:${AUTH_PASS}`);
  return {
    "Authorization": `Basic ${credentials}`,
    "Content-Type": "application/json",
  };
}

// Fetch relojes desde API externa
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
      headers: getAuthHeaders(),
    });
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    const rawData = await response.json();
    
    // La API devuelve un array con los relojes y al final los metadatos de paginación
    if (Array.isArray(rawData)) {
      // Extraer metadatos del último elemento si existe
      const lastItem = rawData[rawData.length - 1];
      let paginationMeta: PaginationMeta | null = null;
      let clocks: Clock[] = rawData;
      
      // Verificar si el último elemento tiene metadatos de paginación
      if (lastItem && typeof lastItem === 'object' && 'totalPages' in lastItem) {
        paginationMeta = lastItem as PaginationMeta;
        clocks = rawData.slice(0, -1) as Clock[];
      }
      
      const pageSize = paginationMeta?.pageSize ? parseInt(paginationMeta.pageSize) : filters.pageSize || 50;
      const totalPages = paginationMeta?.totalPages || 1;
      const page = paginationMeta?.page ? parseInt(paginationMeta.page) : filters.page || 1;
      
      return {
        data: clocks,
        total: totalPages * pageSize, // Estimación del total
        page,
        pageSize,
        totalPages,
      };
    }
    
    return {
      data: [],
      total: 0,
      page: 1,
      pageSize: 25,
      totalPages: 0,
    };
  } catch (error) {
    console.error("Error fetching clocks:", error);
    return {
      data: [],
      total: 0,
      page: 1,
      pageSize: 25,
      totalPages: 0,
    };
  }
}

// Archivar/desarchivar reloj
export async function archiveClock(id: number, archived: boolean): Promise<boolean> {
  try {
    const response = await fetch(API_ARCHIVE, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({ id, archived }),
    });
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    const result = await response.json();
    return result.ok === true;
  } catch (error) {
    console.error("Error archiving clock:", error);
    return false;
  }
}

// Archivar múltiples relojes
export async function archiveMultipleClocks(ids: number[], archived: boolean): Promise<boolean> {
  try {
    const response = await fetch(API_ARCHIVE, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({ ids, archived }),
    });
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    const result = await response.json();
    return result.ok === true;
  } catch (error) {
    console.error("Error archiving clocks:", error);
    return false;
  }
}
