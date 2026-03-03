"use client";

import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { fetchClocks, getAllClocks } from "@/lib/clocks";
import type { Clock } from "@/lib/clocks";
import {
  LEAD_STATUS_OPTIONS,
  getLeadStatusForClock,
  readLeadStatusMap,
  setLeadStatusForClock,
  type LeadStatus,
  type LeadStatusMap
} from "@/lib/lead-status";
import LazyImage from "./LazyImage";
import PullToRefresh from "./PullToRefresh";
import LeadStatusBadge from "./LeadStatusBadge";

const ISLANDS = [
  "Tenerife",
  "Gran Canaria",
  "Lanzarote",
  "Fuerteventura",
  "La Palma",
  "La Gomera",
  "El Hierro",
  "La Graciosa"
];

type Filters = {
  query: string;
  island: string;
  source: string;
  leadStatus: string;
  priceMin: string;
  priceMax: string;
  dateFrom: string;
  dateTo: string;
  archived: "all" | "active" | "archived";
  sort: string;
  dir: "asc" | "desc";
  page: number;
};

const PAGE_SIZE = 6;

const formatPrice = (value: number, currency: string) =>
  new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency,
    maximumFractionDigits: 0
  }).format(value);

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString("es-ES", {
    year: "numeric",
    month: "short",
    day: "numeric"
  });

function useDebouncedValue<T>(value: T, delay = 350) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}

function parseFilters(searchParams: URLSearchParams): Filters {
  const page = Number(searchParams.get("page")) || 1;
  const archived = (searchParams.get("archived") as Filters["archived"]) || "active";
  const dir = (searchParams.get("dir") as Filters["dir"]) || "desc";

  return {
    query: searchParams.get("q") ?? "",
    island: searchParams.get("island") ?? "",
    source: searchParams.get("source") ?? "",
    leadStatus: searchParams.get("lead") ?? "",
    priceMin: searchParams.get("min") ?? "",
    priceMax: searchParams.get("max") ?? "",
    dateFrom: searchParams.get("from") ?? "",
    dateTo: searchParams.get("to") ?? "",
    archived,
    sort: searchParams.get("sort") ?? "publishedAt",
    dir,
    page
  };
}

function buildSearchParams(filters: Filters) {
  const params = new URLSearchParams();
  if (filters.query) params.set("q", filters.query);
  if (filters.island) params.set("island", filters.island);
  if (filters.source) params.set("source", filters.source);
  if (filters.leadStatus) params.set("lead", filters.leadStatus);
  if (filters.priceMin) params.set("min", filters.priceMin);
  if (filters.priceMax) params.set("max", filters.priceMax);
  if (filters.dateFrom) params.set("from", filters.dateFrom);
  if (filters.dateTo) params.set("to", filters.dateTo);
  if (filters.archived !== "active") params.set("archived", filters.archived);
  if (filters.sort && filters.sort !== "publishedAt") params.set("sort", filters.sort);
  if (filters.dir && filters.dir !== "desc") params.set("dir", filters.dir);
  if (filters.page > 1) params.set("page", String(filters.page));
  return params;
}

interface ClocksTableProps {
  clocks: Clock[];
  totalClocks: number;
  totalPages: number;
  pageSize: number;
}

export default function ClocksTable({
  clocks,
  totalClocks,
  totalPages: initialTotalPages,
  pageSize
}: ClocksTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const hydratedRef = useRef(false);

  const [filters, setFilters] = useState<Filters>(() =>
    parseFilters(new URLSearchParams(searchParams.toString()))
  );
  const [archivedMap, setArchivedMap] = useState<Record<string, boolean>>({});
  const [favoriteMap, setFavoriteMap] = useState<Record<string, boolean>>({});
  const [leadStatusMap, setLeadStatusMap] = useState<LeadStatusMap>({});
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentClocks, setCurrentClocks] = useState<Clock[]>(clocks);
  const [allClocks, setAllClocks] = useState<Clock[] | null>(null);
  const [totalPages, setTotalPages] = useState(initialTotalPages);
  const [totalCount, setTotalCount] = useState(totalClocks);
  const [undoAction, setUndoAction] = useState<null | {
    id: string;
    type: "archive" | "favorite";
    previous: boolean;
    title: string;
  }>(null);
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const debouncedFilters = {
    ...filters,
    query: useDebouncedValue(filters.query),
    priceMin: useDebouncedValue(filters.priceMin),
    priceMax: useDebouncedValue(filters.priceMax),
    dateFrom: useDebouncedValue(filters.dateFrom),
    dateTo: useDebouncedValue(filters.dateTo)
  };

  useEffect(() => {
    const map: Record<string, boolean> = {};
    const favoriteDefaults: Record<string, boolean> = {};
    const dataSet = allClocks ?? currentClocks;
    dataSet.forEach((clock) => {
      map[clock.id] = false;
      favoriteDefaults[clock.id] = false;
    });
    setArchivedMap(map);
    setFavoriteMap(favoriteDefaults);

    const timer = setTimeout(() => setLoading(false), 700);
    return () => clearTimeout(timer);
  }, [allClocks, currentClocks]);

  useEffect(() => {
    const stored = readLeadStatusMap();
    setLeadStatusMap(stored);

    if (typeof window === "undefined") return;
    function handleStorage(event: StorageEvent) {
      if (event.key && event.key !== "clocks.leadStatusMap") return;
      setLeadStatusMap(readLeadStatusMap());
    }

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  function handleLeadStatusChange(clockId: string, nextStatus: LeadStatus) {
    setLeadStatusMap((prev) => setLeadStatusForClock(prev, clockId, nextStatus));
  }

  useEffect(() => {
    setCurrentClocks(clocks);
    setTotalPages(initialTotalPages);
    setTotalCount(totalClocks);
  }, [clocks, initialTotalPages, totalClocks]);

  useEffect(() => {
    if (!hydratedRef.current) {
      hydratedRef.current = true;
      return;
    }

    const params = buildSearchParams(debouncedFilters);
    const query = params.toString();
    router.replace(query ? `/clocks?${query}` : "/clocks");
  }, [
    debouncedFilters.query,
    debouncedFilters.island,
    debouncedFilters.source,
    debouncedFilters.leadStatus,
    debouncedFilters.priceMin,
    debouncedFilters.priceMax,
    debouncedFilters.dateFrom,
    debouncedFilters.dateTo,
    debouncedFilters.archived,
    debouncedFilters.sort,
    debouncedFilters.dir,
    debouncedFilters.page,
    router
  ]);

  useEffect(() => {
    return () => {
      if (undoTimerRef.current) {
        clearTimeout(undoTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (allClocks) return;

    let cancelled = false;
    setLoading(true);

    fetchClocks({
      page: filters.page,
      pageSize,
      island: filters.island || undefined,
      archived: filters.archived === "all" ? undefined : filters.archived === "archived",
      sort: filters.sort,
      dir: filters.dir
    })
      .then((response) => {
        if (cancelled) return;
        setCurrentClocks(response.data);
        setTotalPages(response.totalPages);
        setTotalCount(response.total);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [
    allClocks,
    filters.page,
    filters.island,
    filters.archived,
    filters.sort,
    filters.dir,
    pageSize
  ]);

  const dataSet = allClocks ?? currentClocks;

  const sources = useMemo(
    () => Array.from(new Set(dataSet.map((clock) => clock.source))).sort(),
    [dataSet]
  );

  const filteredClocks = useMemo(() => {
    const minPrice = Number(debouncedFilters.priceMin);
    const maxPrice = Number(debouncedFilters.priceMax);

    return dataSet
      .filter((clock) => {
        const isArchived = archivedMap[clock.id] ?? false;
        if (debouncedFilters.archived === "archived" && !isArchived) return false;
        if (debouncedFilters.archived === "active" && isArchived) return false;
        if (debouncedFilters.island && clock.island !== debouncedFilters.island) return false;
        if (debouncedFilters.source && clock.source !== debouncedFilters.source) return false;
        const leadStatus = getLeadStatusForClock(leadStatusMap, clock.id);
        if (debouncedFilters.leadStatus && leadStatus !== debouncedFilters.leadStatus) return false;
        if (debouncedFilters.query && !clock.title.toLowerCase().includes(debouncedFilters.query.toLowerCase())) return false;
        if (debouncedFilters.priceMin && clock.price < minPrice) return false;
        if (debouncedFilters.priceMax && clock.price > maxPrice) return false;
        if (debouncedFilters.dateFrom && new Date(clock.publishedAt) < new Date(debouncedFilters.dateFrom)) return false;
        if (debouncedFilters.dateTo && new Date(clock.publishedAt) > new Date(debouncedFilters.dateTo)) return false;
        return true;
      })
      .sort((a, b) => {
        const key = debouncedFilters.sort as keyof Clock;
        const dir = debouncedFilters.dir === "asc" ? 1 : -1;
        const aValue = a[key];
        const bValue = b[key];

        if (typeof aValue === "number" && typeof bValue === "number") {
          return (aValue - bValue) * dir;
        }
        if (typeof aValue === "string" && typeof bValue === "string") {
          return aValue.localeCompare(bValue) * dir;
        }
        return 0;
      });
  }, [dataSet, debouncedFilters, archivedMap, leadStatusMap]);

  const usingAllClocks = Boolean(allClocks);
  const totalPagesForView = usingAllClocks
    ? Math.max(1, Math.ceil(filteredClocks.length / PAGE_SIZE))
    : Math.max(1, totalPages);
  const totalLabel = usingAllClocks ? filteredClocks.length : totalCount;
  const page = Math.min(filters.page, totalPagesForView);
  const start = (page - 1) * PAGE_SIZE;
  const paginatedClocks = usingAllClocks
    ? filteredClocks.slice(start, start + PAGE_SIZE)
    : filteredClocks;

  useEffect(() => {
    if (filters.page !== page) {
      setFilters((prev) => ({ ...prev, page }));
    }
  }, [filters.page, page]);

  function toggleSort(nextSort: string) {
    setFilters((prev) => {
      if (prev.sort === nextSort) {
        return { ...prev, dir: prev.dir === "asc" ? "desc" : "asc" };
      }
      return { ...prev, sort: nextSort, dir: "asc", page: 1 };
    });
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  }

  function toggleSelectAll() {
    if (selectedIds.length === paginatedClocks.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(paginatedClocks.map((clock) => clock.id));
    }
  }

  function handleArchive(ids: string[], archived: boolean) {
    setArchivedMap((prev) => {
      const updated = { ...prev };
      ids.forEach((id) => {
        updated[id] = archived;
      });
      return updated;
    });
    setSelectedIds([]);
  }

  function handleFavorite(ids: string[], favorited: boolean) {
    setFavoriteMap((prev) => {
      const updated = { ...prev };
      ids.forEach((id) => {
        updated[id] = favorited;
      });
      return updated;
    });
  }

  function queueUndo(action: { id: string; type: "archive" | "favorite"; previous: boolean; title: string }) {
    if (undoTimerRef.current) {
      clearTimeout(undoTimerRef.current);
    }
    setUndoAction(action);
    undoTimerRef.current = setTimeout(() => {
      setUndoAction(null);
      undoTimerRef.current = null;
    }, 3000);
  }

  // Pull to refresh handler
  const handleRefresh = useCallback(async () => {
    setLoading(true);
    try {
      if (allClocks) {
        // If viewing all clocks, refresh all
        const refreshed = await getAllClocks();
        setAllClocks(refreshed);
        setTotalCount(refreshed.length);
      } else {
        // If viewing paginated, refresh current page
        const response = await fetchClocks({
          page: filters.page,
          pageSize,
          island: filters.island || undefined,
          archived: filters.archived === "all" ? undefined : filters.archived === "archived",
          sort: filters.sort,
          dir: filters.dir
        });
        setCurrentClocks(response.data);
        setTotalPages(response.totalPages);
        setTotalCount(response.total);
      }
    } finally {
      setLoading(false);
    }
  }, [allClocks, filters.page, filters.island, filters.archived, filters.sort, filters.dir, pageSize]);

  function applySwipeAction(clock: Clock, type: "archive" | "favorite") {
    if (type === "archive") {
      const previous = archivedMap[clock.id] ?? false;
      handleArchive([clock.id], !previous);
      queueUndo({ id: clock.id, type, previous, title: clock.title });
    } else {
      const previous = favoriteMap[clock.id] ?? false;
      handleFavorite([clock.id], !previous);
      queueUndo({ id: clock.id, type, previous, title: clock.title });
    }
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <PullToRefresh onRefresh={handleRefresh}>
        <header className="border-b border-zinc-800 bg-zinc-950/80">
          <div className="mx-auto flex max-w-6xl flex-col gap-4 px-6 py-6 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.4em] text-emerald-400">
                Dashboard
              </p>
              <h1 className="mt-2 text-3xl font-semibold text-white">Relojes en seguimiento</h1>
              <p className="mt-2 max-w-2xl text-sm text-zinc-400">
                Vista lista con filtros avanzados, acciones en lote y enlaces directos.
              </p>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm text-zinc-400">
              Página {page} de {totalPagesForView} · total relojes: {totalLabel}
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-6xl space-y-6 px-6 py-8">
          <FiltersPanel
            filters={filters}
            setFilters={setFilters}
            sources={sources}
          />

          <BulkActions
            selected={selectedIds}
            onArchive={(archived) => handleArchive(selectedIds, archived)}
          />

          <section className="space-y-4 md:hidden">
            {loading
              ? Array.from({ length: PAGE_SIZE }).map((_, index) => (
                  <div
                    key={`mobile-skeleton-${index}`}
                    className="h-28 animate-pulse rounded-2xl border border-zinc-800 bg-zinc-900/60"
                  />
                ))
              : paginatedClocks.map((clock) => {
                  const isArchived = archivedMap[clock.id] ?? false;
                  const isFavorited = favoriteMap[clock.id] ?? false;
                  const leadStatus = getLeadStatusForClock(leadStatusMap, clock.id);
                  return (
                    <SwipeCard
                      key={clock.id}
                      clock={clock}
                      isArchived={isArchived}
                      isFavorited={isFavorited}
                      leadStatus={leadStatus}
                      onLeadStatusChange={(status) => handleLeadStatusChange(clock.id, status)}
                      onSwipeArchive={() => applySwipeAction(clock, "archive")}
                      onSwipeFavorite={() => applySwipeAction(clock, "favorite")}
                    />
                  );
                })}

            {!loading && paginatedClocks.length === 0 && (
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900 px-6 py-10 text-center text-sm text-zinc-500">
                No hay relojes con los filtros seleccionados.
              </div>
            )}
          </section>

          <section className="hidden rounded-2xl border border-zinc-800 bg-zinc-900 md:block">
            <div className="overflow-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-zinc-950 text-xs uppercase tracking-wider text-zinc-500">
                  <tr>
                    <th className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.length > 0 && selectedIds.length === paginatedClocks.length}
                        onChange={toggleSelectAll}
                        className="h-4 w-4 rounded border-zinc-700 bg-black"
                      />
                    </th>
                    <th className="px-4 py-3 text-xs uppercase tracking-wider text-zinc-500">Foto</th>
                    <SortableHeader label="Título" sortKey="title" current={filters} onSort={toggleSort} />
                    <th className="px-4 py-3 text-xs uppercase tracking-wider text-zinc-500">Estado</th>
                    <SortableHeader label="Precio" sortKey="price" current={filters} onSort={toggleSort} />
                    <SortableHeader label="Isla" sortKey="island" current={filters} onSort={toggleSort} />
                    <SortableHeader label="Fuente" sortKey="source" current={filters} onSort={toggleSort} />
                    <SortableHeader label="Fecha" sortKey="publishedAt" current={filters} onSort={toggleSort} />
                    <th className="px-4 py-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {loading
                    ? Array.from({ length: PAGE_SIZE }).map((_, index) => (
                        <tr key={`skeleton-${index}`} className="border-t border-zinc-800">
                          <td className="px-4 py-4" colSpan={9}>
                            <div className="h-6 w-full animate-pulse rounded-lg bg-zinc-800/70" />
                          </td>
                        </tr>
                      ))
                    : paginatedClocks.map((clock) => {
                        const isArchived = archivedMap[clock.id] ?? false;
                        const leadStatus = getLeadStatusForClock(leadStatusMap, clock.id);
                        return (
                          <tr
                            key={clock.id}
                            className="border-t border-zinc-800 text-zinc-200 hover:bg-black/40"
                          >
                            <td className="px-4 py-4">
                              <input
                                type="checkbox"
                                checked={selectedIds.includes(clock.id)}
                                onChange={() => toggleSelect(clock.id)}
                                className="h-4 w-4 rounded border-zinc-700 bg-black"
                              />
                            </td>
                            <td className="px-4 py-4">
                              <LazyImage
                                src={clock.photos[0]}
                                alt={clock.title}
                                containerClassName="h-12 w-16 rounded-lg"
                                className="h-full w-full object-cover"
                              />
                            </td>
                            <td className="px-4 py-4">
                              <div className="text-sm font-medium text-white">
                                {clock.title}
                              </div>
                              {isArchived && (
                                <span className="mt-1 inline-block rounded-full bg-rose-500/20 px-2 py-1 text-xs text-rose-300">
                                  Archivado
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-4">
                              <div className="flex items-center gap-2">
                                <LeadStatusBadge status={leadStatus} />
                                <select
                                  value={leadStatus}
                                  onChange={(event) =>
                                    handleLeadStatusChange(clock.id, event.target.value as LeadStatus)
                                  }
                                  className="rounded-full border border-zinc-800 bg-black/60 px-2 py-1 text-xs text-white"
                                >
                                  {LEAD_STATUS_OPTIONS.map((option) => (
                                    <option key={option.value} value={option.value}>
                                      {option.label}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </td>
                            <td className="px-4 py-4 text-emerald-300">
                              {formatPrice(clock.price, clock.currency)}
                            </td>
                            <td className="px-4 py-4">{clock.island}</td>
                            <td className="px-4 py-4">{clock.source}</td>
                            <td className="px-4 py-4">{formatDate(clock.publishedAt)}</td>
                            <td className="px-4 py-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <Link
                                  href={`/clocks/${clock.id}`}
                                  className="rounded-full border border-zinc-700 px-3 py-1 text-xs text-zinc-300 transition hover:border-zinc-500"
                                >
                                  Ver
                                </Link>
                                <button
                                  type="button"
                                  onClick={() => handleArchive([clock.id], !isArchived)}
                                  className={`rounded-full px-3 py-1 text-xs transition ${
                                    isArchived
                                      ? "border border-emerald-500/50 text-emerald-300"
                                      : "border border-rose-500/50 text-rose-300"
                                  }`}
                                >
                                  {isArchived ? "Desarchivar" : "Archivar"}
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                </tbody>
              </table>
            </div>

            {!loading && paginatedClocks.length === 0 && (
              <div className="hidden px-6 py-10 text-center text-sm text-zinc-500 md:block">
                No hay relojes con los filtros seleccionados.
              </div>
            )}
          </section>

          <Pagination
            page={page}
            totalPages={totalPagesForView}
            onChange={(next) => setFilters((prev) => ({ ...prev, page: next }))}
            usingAllClocks={usingAllClocks}
            onLoadAll={async () => {
              setLoading(true);
              try {
                const all = await getAllClocks();
                setAllClocks(all);
                setTotalCount(all.length);
                setFilters((prev) => ({ ...prev, page: 1 }));
              } finally {
                setLoading(false);
              }
            }}
            onLoadPaged={() => {
              setAllClocks(null);
              setTotalCount(totalClocks);
              setFilters((prev) => ({ ...prev, page: 1 }));
            }}
          />
        </main>

        {undoAction && (
          <div className="fixed bottom-6 left-1/2 z-50 w-[92%] max-w-md -translate-x-1/2 rounded-2xl border border-zinc-800 bg-zinc-950/95 px-5 py-4 text-sm text-zinc-200 shadow-lg backdrop-blur">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="font-medium">
                  {undoAction.type === "archive" ? "Archivado" : "Favorito"} ·{" "}
                  <span className="text-zinc-400">{undoAction.title}</span>
                </p>
                <p className="text-xs text-zinc-500">Puedes deshacer en 3 segundos.</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (undoAction.type === "archive") {
                    handleArchive([undoAction.id], undoAction.previous);
                  } else {
                    handleFavorite([undoAction.id], undoAction.previous);
                  }
                  if (undoTimerRef.current) {
                    clearTimeout(undoTimerRef.current);
                    undoTimerRef.current = null;
                  }
                  setUndoAction(null);
                }}
                className="rounded-full border border-emerald-500/50 px-4 py-2 text-xs text-emerald-300 transition hover:border-emerald-400"
              >
                Deshacer
              </button>
            </div>
          </div>
        )}
      </PullToRefresh>
    </div>
  );
}

function SortableHeader({
  label,
  sortKey,
  current,
  onSort
}: {
  label: string;
  sortKey: string;
  current: Filters;
  onSort: (sort: string) => void;
}) {
  const active = current.sort === sortKey;
  return (
    <th className="px-4 py-3">
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={`flex items-center gap-1 text-xs uppercase tracking-wider transition ${
          active ? "text-emerald-300" : "text-zinc-500"
        }`}
      >
        {label}
        {active && <span>{current.dir === "asc" ? "↑" : "↓"}</span>}
      </button>
    </th>
  );
}

function FiltersPanel({
  filters,
  setFilters,
  sources
}: {
  filters: Filters;
  setFilters: React.Dispatch<React.SetStateAction<Filters>>;
  sources: string[];
}) {
  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <label className="text-xs uppercase tracking-wider text-zinc-500">
          Buscar
          <input
            type="text"
            value={filters.query}
            onChange={(event) =>
              setFilters((prev) => ({ ...prev, query: event.target.value, page: 1 }))
            }
            placeholder="Rolex, Omega..."
            className="mt-2 w-full rounded-xl border border-zinc-800 bg-black/40 px-4 py-2 text-sm text-white placeholder:text-zinc-600 focus:border-emerald-500 focus:outline-none"
          />
        </label>

        <label className="text-xs uppercase tracking-wider text-zinc-500">
          Isla
          <select
            value={filters.island}
            onChange={(event) =>
              setFilters((prev) => ({ ...prev, island: event.target.value, page: 1 }))
            }
            className="mt-2 w-full rounded-xl border border-zinc-800 bg-black/40 px-4 py-2 text-sm text-white"
          >
            <option value="">Todas</option>
            {ISLANDS.map((island) => (
              <option key={island} value={island}>
                {island}
              </option>
            ))}
          </select>
        </label>

        <label className="text-xs uppercase tracking-wider text-zinc-500">
          Fuente
          <select
            value={filters.source}
            onChange={(event) =>
              setFilters((prev) => ({ ...prev, source: event.target.value, page: 1 }))
            }
            className="mt-2 w-full rounded-xl border border-zinc-800 bg-black/40 px-4 py-2 text-sm text-white"
          >
            <option value="">Todas</option>
            {sources.map((source) => (
              <option key={source} value={source}>
                {source}
              </option>
            ))}
          </select>
        </label>

        <label className="text-xs uppercase tracking-wider text-zinc-500">
          Estado lead
          <select
            value={filters.leadStatus}
            onChange={(event) =>
              setFilters((prev) => ({ ...prev, leadStatus: event.target.value, page: 1 }))
            }
            className="mt-2 w-full rounded-xl border border-zinc-800 bg-black/40 px-4 py-2 text-sm text-white"
          >
            <option value="">Todos</option>
            {LEAD_STATUS_OPTIONS.map((status) => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </select>
        </label>

        <label className="text-xs uppercase tracking-wider text-zinc-500">
          Archivados
          <select
            value={filters.archived}
            onChange={(event) =>
              setFilters((prev) => ({
                ...prev,
                archived: event.target.value as Filters["archived"],
                page: 1
              }))
            }
            className="mt-2 w-full rounded-xl border border-zinc-800 bg-black/40 px-4 py-2 text-sm text-white"
          >
            <option value="active">Solo activos</option>
            <option value="archived">Solo archivados</option>
            <option value="all">Todos</option>
          </select>
        </label>

        <label className="text-xs uppercase tracking-wider text-zinc-500">
          Precio mínimo
          <input
            type="number"
            value={filters.priceMin}
            onChange={(event) =>
              setFilters((prev) => ({ ...prev, priceMin: event.target.value, page: 1 }))
            }
            placeholder="0"
            className="mt-2 w-full rounded-xl border border-zinc-800 bg-black/40 px-4 py-2 text-sm text-white placeholder:text-zinc-600"
          />
        </label>

        <label className="text-xs uppercase tracking-wider text-zinc-500">
          Precio máximo
          <input
            type="number"
            value={filters.priceMax}
            onChange={(event) =>
              setFilters((prev) => ({ ...prev, priceMax: event.target.value, page: 1 }))
            }
            placeholder="15000"
            className="mt-2 w-full rounded-xl border border-zinc-800 bg-black/40 px-4 py-2 text-sm text-white placeholder:text-zinc-600"
          />
        </label>

        <label className="text-xs uppercase tracking-wider text-zinc-500">
          Desde
          <input
            type="date"
            value={filters.dateFrom}
            onChange={(event) =>
              setFilters((prev) => ({ ...prev, dateFrom: event.target.value, page: 1 }))
            }
            className="mt-2 w-full rounded-xl border border-zinc-800 bg-black/40 px-4 py-2 text-sm text-white"
          />
        </label>

        <label className="text-xs uppercase tracking-wider text-zinc-500">
          Hasta
          <input
            type="date"
            value={filters.dateTo}
            onChange={(event) =>
              setFilters((prev) => ({ ...prev, dateTo: event.target.value, page: 1 }))
            }
            className="mt-2 w-full rounded-xl border border-zinc-800 bg-black/40 px-4 py-2 text-sm text-white"
          />
        </label>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() =>
            setFilters({
              query: "",
              island: "",
              source: "",
              leadStatus: "",
              priceMin: "",
              priceMax: "",
              dateFrom: "",
              dateTo: "",
              archived: "active",
              sort: "publishedAt",
              dir: "desc",
              page: 1
            })
          }
          className="rounded-full border border-zinc-700 px-4 py-2 text-xs text-zinc-300 transition hover:border-zinc-500"
        >
          Limpiar filtros
        </button>
        <span className="text-xs text-zinc-500">
          Los filtros se sincronizan con la URL para compartir la vista.
        </span>
      </div>
    </section>
  );
}

function BulkActions({
  selected,
  onArchive
}: {
  selected: string[];
  onArchive: (archived: boolean) => void;
}) {
  if (selected.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-zinc-800 bg-black/40 px-6 py-4 text-sm text-zinc-500">
        Selecciona relojes para archivarlos en lote.
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-zinc-800 bg-zinc-900 px-6 py-4">
      <span className="text-sm text-zinc-300">
        {selected.length} seleccionados
      </span>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => onArchive(true)}
          className="rounded-full border border-rose-500/50 px-4 py-2 text-xs text-rose-300 transition hover:border-rose-400"
        >
          Archivar seleccionados
        </button>
        <button
          type="button"
          onClick={() => onArchive(false)}
          className="rounded-full border border-emerald-500/50 px-4 py-2 text-xs text-emerald-300 transition hover:border-emerald-400"
        >
          Desarchivar
        </button>
      </div>
    </div>
  );
}

function Pagination({
  page,
  totalPages,
  onChange,
  usingAllClocks,
  onLoadAll,
  onLoadPaged
}: {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
  usingAllClocks: boolean;
  onLoadAll: () => void | Promise<void>;
  onLoadPaged: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-zinc-800 bg-zinc-900 px-6 py-4">
      <span className="text-sm text-zinc-400">
        Página {page} de {totalPages}
      </span>
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => onChange(Math.max(1, page - 1))}
          disabled={page === 1}
          className="rounded-full border border-zinc-700 px-4 py-2 text-xs text-zinc-300 transition hover:border-zinc-500 disabled:opacity-40"
        >
          Anterior
        </button>
        <button
          type="button"
          onClick={() => onChange(Math.min(totalPages, page + 1))}
          disabled={page === totalPages}
          className="rounded-full border border-zinc-700 px-4 py-2 text-xs text-zinc-300 transition hover:border-zinc-500 disabled:opacity-40"
        >
          Siguiente
        </button>
        {usingAllClocks ? (
          <button
            type="button"
            onClick={onLoadPaged}
            className="rounded-full border border-emerald-500/50 px-4 py-2 text-xs text-emerald-300 transition hover:border-emerald-400"
          >
            Ver paginado
          </button>
        ) : (
          <button
            type="button"
            onClick={onLoadAll}
            className="rounded-full border border-emerald-500/50 px-4 py-2 text-xs text-emerald-300 transition hover:border-emerald-400"
          >
            Ver todo
          </button>
        )}
      </div>
    </div>
  );
}

function SwipeCard({
  clock,
  isArchived,
  isFavorited,
  leadStatus,
  onLeadStatusChange,
  onSwipeArchive,
  onSwipeFavorite
}: {
  clock: Clock;
  isArchived: boolean;
  isFavorited: boolean;
  leadStatus: LeadStatus;
  onLeadStatusChange: (status: LeadStatus) => void;
  onSwipeArchive: () => void;
  onSwipeFavorite: () => void;
}) {
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const axisRef = useRef<"x" | "y" | null>(null);
  const animationRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const leftOpacity = Math.min(1, Math.max(0, -dragX / 80));
  const rightOpacity = Math.min(1, Math.max(0, dragX / 80));

  function animateTo(value: number) {
    setDragX(value);
    if (animationRef.current) {
      clearTimeout(animationRef.current);
    }
    animationRef.current = setTimeout(() => {
      setDragX(0);
      animationRef.current = null;
    }, 300);
  }

  function handlePointerDown(event: React.PointerEvent<HTMLDivElement>) {
    startXRef.current = event.clientX;
    startYRef.current = event.clientY;
    axisRef.current = null;
    setDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (!dragging) return;
    const dx = event.clientX - startXRef.current;
    const dy = event.clientY - startYRef.current;

    if (!axisRef.current) {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
      axisRef.current = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
    }

    if (axisRef.current !== "x") return;
    event.preventDefault();
    const limited = Math.max(-120, Math.min(120, dx));
    setDragX(limited);
  }

  function handlePointerUp(event: React.PointerEvent<HTMLDivElement>) {
    if (!dragging) return;
    event.currentTarget.releasePointerCapture(event.pointerId);
    setDragging(false);

    if (dragX < -80) {
      onSwipeArchive();
      animateTo(-120);
      return;
    }

    if (dragX > 80) {
      onSwipeFavorite();
      animateTo(120);
      return;
    }

    animateTo(0);
  }

  useEffect(() => {
    return () => {
      if (animationRef.current) {
        clearTimeout(animationRef.current);
      }
    };
  }, []);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900">
      <div className="absolute inset-0 flex items-center justify-between px-5">
        <div
          className="flex items-center gap-2 text-rose-300"
          style={{ opacity: leftOpacity }}
        >
          <span className="text-lg">🗄️</span>
          <span className="text-sm">Archivar</span>
        </div>
        <div
          className="flex items-center gap-2 text-yellow-300"
          style={{ opacity: rightOpacity }}
        >
          <span className="text-lg">★</span>
          <span className="text-sm">Favorito</span>
        </div>
      </div>

      <div
        className="relative z-10 space-y-3 bg-zinc-900 p-4"
        style={{
          transform: `translateX(${dragX}px)`,
          transition: dragging ? "none" : "transform 300ms ease",
          touchAction: "pan-y"
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <div className="flex items-start gap-3">
          <LazyImage
            src={clock.photos?.[0] || ""}
            alt={clock.title}
            containerClassName="h-20 w-24 rounded-xl"
            className="h-full w-full object-cover"
          />
          <div className="flex-1 space-y-1">
            <p className="text-sm font-semibold text-white">
              {clock.title}
            </p>
            <p className="text-xs text-zinc-400">
              {clock.island} · {clock.source}
            </p>
            <p className="text-sm text-emerald-300">
              {formatPrice(clock.price, clock.currency)}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500">
          <span>{formatDate(clock.publishedAt)}</span>
          <LeadStatusBadge status={leadStatus} />
          <select
            value={leadStatus}
            onChange={(event) => onLeadStatusChange(event.target.value as LeadStatus)}
            onPointerDown={(event) => event.stopPropagation()}
            className="rounded-full border border-zinc-800 bg-black/60 px-2 py-1 text-xs text-white"
          >
            {LEAD_STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {isArchived && (
            <span className="rounded-full bg-rose-500/20 px-2 py-1 text-rose-300">
              Archivado
            </span>
          )}
          {isFavorited && (
            <span className="rounded-full bg-yellow-500/20 px-2 py-1 text-yellow-200">
              Favorito
            </span>
          )}
        </div>

        <div className="flex items-center justify-between">
          <Link
            href={`/clocks/${clock.id}`}
            className="rounded-full border border-zinc-700 px-3 py-1 text-xs text-zinc-300 transition hover:border-zinc-500"
          >
            Ver detalle
          </Link>
          <span className="text-[11px] uppercase tracking-[0.3em] text-zinc-600">
            Desliza
          </span>
        </div>
      </div>
    </div>
  );
}
