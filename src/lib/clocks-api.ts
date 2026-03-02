// API externa de n8n para relojes
const API_BASE = "https://automation.dimensiontei.com/webhook/clocks";
const API_ARCHIVE = "https://automation.dimensiontei.com/webhook/archive-item";

// Credenciales Basic Auth
const AUTH_USER = "relojes";
const AUTH_PASS = "nnS4MDu9DcJb";

export type ClockPricePoint = {
  date: string;
  price: number;
};

export type Clock = {
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
  price_history: ClockPricePoint[];
  archived: number;
};

export type ClocksResponse = {
  data: Clock[];
  total: number;
  page: number;
  pageSize: number;
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
    
    const data = await response.json();
    
    // La API devuelve array directo o con paginación
    if (Array.isArray(data)) {
      return {
        data: data,
        total: data.length,
        page: filters.page || 1,
        pageSize: filters.pageSize || 50,
      };
    }
    
    return data;
  } catch (error) {
    console.error("Error fetching clocks:", error);
    // Retornar vacío en caso de error
    return {
      data: [],
      total: 0,
      page: 1,
      pageSize: 50,
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
