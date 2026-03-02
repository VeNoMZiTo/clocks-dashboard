// Servicio de integración con la API de relojes externa (n8n)

import { ClockItem, GetClocksParams, GetClocksResponse } from '@/types/clock';

// Configuración de la API
const API_CONFIG = {
  baseURL: process.env.NEXT_PUBLIC_API_BASE || 'https://automation.dimensiontei.com/webhook/clocks',
  archiveURL: process.env.NEXT_PUBLIC_API_ARCHIVE || 'https://automation.dimensiontei.com/webhook/archive-item',
  auth: {
    username: process.env.API_USER || 'relojes',
    password: process.env.API_PASS || 'nnS4MDu9DcJb',
  },
  timeout: 10000, // 10 segundos
  retryAttempts: 3,
  retryDelay: 1000, // 1 segundo
};

/**
 * Crea un timeout para las peticiones
 */
function createTimeout(ms: number): Promise<never> {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new Error(`Request timeout after ${ms}ms`)), ms);
  });
}

/**
 * Convierte credenciales a Basic Auth header
 */
function getAuthHeader(): string {
  const { username, password } = API_CONFIG.auth;
  const credentials = `${username}:${password}`;
  const encoded = Buffer.from(credentials).toString('base64');
  return `Basic ${encoded}`;
}

/**
 * Fetch con retry y timeout
 */
async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  attempt: number = 1
): Promise<Response> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.timeout);

    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: getAuthHeader(),
        ...options.headers,
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    return response;
  } catch (error) {
    const isLastAttempt = attempt >= API_CONFIG.retryAttempts;
    const isTimeout = error instanceof Error && error.message.includes('timeout');

    if (isLastAttempt) {
      throw error;
    }

    console.warn(`Fetch attempt ${attempt} failed, retrying in ${API_CONFIG.retryDelay}ms...`, error);

    // Exponential backoff
    await new Promise(resolve => setTimeout(resolve, API_CONFIG.retryDelay * attempt));

    return fetchWithRetry(url, options, attempt + 1);
  }
}

/**
 * Obtiene lista de relojes con paginación y filtros
 */
export async function getClocks(
  params: GetClocksParams = {}
): Promise<GetClocksResponse> {
  const {
    page = 1,
    pageSize = 20,
    island,
    archived,
    sort = 'first_seen_at',
    dir = 'desc',
  } = params;

  // Construir URL con query params
  const queryParams = new URLSearchParams({
    page: page.toString(),
    pageSize: pageSize.toString(),
    sort,
    dir,
  });

  if (island) {
    queryParams.set('island', island);
  }

  if (archived !== undefined) {
    queryParams.set('archived', archived.toString());
  }

  const url = `${API_CONFIG.baseURL}?${queryParams.toString()}`;

  try {
    console.log(`Fetching clocks from ${url}`);
    const response = await fetchWithRetry(url);
    const data = await response.json();

    // Validar respuesta
    if (!data || !Array.isArray(data.data)) {
      throw new Error('Invalid API response format');
    }

    // Transformar datos si es necesario
    const clocks: ClockItem[] = data.data.map((item: any) => ({
      id: item.id?.toString() || '',
      title: item.title || '',
      description: item.description || null,
      latest_price: item.latest_price || '0',
      island_id: item.island_id || 0,
      island_name: item.island_name || '',
      island_slug: item.island_slug || '',
      source: item.source || '',
      first_seen_at: item.first_seen_at || '',
      photos: Array.isArray(item.photos) ? item.photos : [],
      price_history: Array.isArray(item.price_history) ? item.price_history : [],
      archived: item.archived || 0,
    }));

    const total = data.total || data.data.length;
    const totalPages = Math.ceil(total / pageSize);

    return {
      data: clocks,
      total,
      page,
      pageSize,
      totalPages,
    };
  } catch (error) {
    console.error('Error fetching clocks:', error);
    throw error;
  }
}

/**
 * Archiva o desarchiva un reloj individual
 */
export async function archiveClock(
  id: number,
  archived: boolean
): Promise<{ success: boolean; message?: string }> {
  const url = API_CONFIG.archiveURL;

  try {
    console.log(`Archiving clock ${id}, archived=${archived}`);
    const response = await fetchWithRetry(url, {
      method: 'POST',
      body: JSON.stringify({
        id,
        archived: archived ? 1 : 0,
      }),
    });

    const result = await response.json();
    console.log('Archive response:', result);

    return {
      success: true,
      message: result.message || `Clock ${id} ${archived ? 'archived' : 'unarchived'} successfully`,
    };
  } catch (error) {
    console.error(`Error archiving clock ${id}:`, error);
    throw error;
  }
}

/**
 * Archiva o desarchiva múltiples relojes
 */
export async function archiveMultipleClocks(
  ids: number[],
  archived: boolean
): Promise<{ success: boolean; processed: number; failed: number; errors: string[] }> {
  const results = {
    success: true,
    processed: 0,
    failed: 0,
    errors: [] as string[],
  };

  // Procesar en paralelo pero en batches de 5 para no saturar
  const batchSize = 5;

  for (let i = 0; i < ids.length; i += batchSize) {
    const batch = ids.slice(i, i + batchSize);

    const promises = batch.map(async (id) => {
      try {
        await archiveClock(id, archived);
        results.processed++;
      } catch (error) {
        results.failed++;
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        results.errors.push(`ID ${id}: ${errorMsg}`);
      }
    });

    await Promise.all(promises);
  }

  results.success = results.failed === 0;
  return results;
}

/**
 * Obtiene un reloj por su ID
 */
export async function getClockById(id: string): Promise<ClockItem | null> {
  try {
    const response = await fetchWithRetry(`${API_CONFIG.baseURL}/${id}`);
    const data = await response.json();

    return {
      id: data.id?.toString() || '',
      title: data.title || '',
      description: data.description || null,
      latest_price: data.latest_price || '0',
      island_id: data.island_id || 0,
      island_name: data.island_name || '',
      island_slug: data.island_slug || '',
      source: data.source || '',
      first_seen_at: data.first_seen_at || '',
      photos: Array.isArray(data.photos) ? data.photos : [],
      price_history: Array.isArray(data.price_history) ? data.price_history : [],
      archived: data.archived || 0,
    };
  } catch (error) {
    console.error(`Error fetching clock ${id}:`, error);
    return null;
  }
}
