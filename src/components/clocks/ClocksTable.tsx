"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import type { Clock } from "@/lib/clocks-api";

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
}

export default function ClocksTable({ clocks }: ClocksTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const hydratedRef = useRef(false);

  const [filters, setFilters] = useState<Filters>(() =>
    parseFilters(new URLSearchParams(searchParams.toString()))
  );
  const [archivedMap, setArchivedMap] = useState<Record<string, boolean>>({});
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

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
    clocks.forEach((clock) => {
      map[clock.id] = false;
    });
    setArchivedMap(map);

    const timer = setTimeout(() => setLoading(false), 700);
    return () => clearTimeout(timer);
  }, [clocks]);

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

  const sources = useMemo(
    () => Array.from(new Set(clocks.map((clock) => clock.source))).sort(),
    [clocks]
  );

  const filteredClocks = useMemo(() => {
    const minPrice = Number(debouncedFilters.priceMin);
    const maxPrice = Number(debouncedFilters.priceMax);

    return clocks
      .filter((clock) => {
        const isArchived = archivedMap[clock.id] ?? false;
        if (debouncedFilters.archived === "archived" && !isArchived) return false;
        if (debouncedFilters.archived === "active" && isArchived) return false;
        if (debouncedFilters.island && clock.island !== debouncedFilters.island) return false;
        if (debouncedFilters.source && clock.source !== debouncedFilters.source) return false;
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
  }, [clocks, debouncedFilters, archivedMap]);

  const totalPages = Math.max(1, Math.ceil(filteredClocks.length / PAGE_SIZE));
  const page = Math.min(filters.page, totalPages);
  const start = (page - 1) * PAGE_SIZE;
  const paginatedClocks = filteredClocks.slice(start, start + PAGE_SIZE);

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

  return (
    <div className="min-h-screen bg-black text-white">
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
            {filteredClocks.length} resultados · página {page} de {totalPages}
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

        <section className="rounded-2xl border border-zinc-800 bg-zinc-900">
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
                        <td className="px-4 py-4" colSpan={8}>
                          <div className="h-6 w-full animate-pulse rounded-lg bg-zinc-800/70" />
                        </td>
                      </tr>
                    ))
                  : paginatedClocks.map((clock) => {
                      const isArchived = archivedMap[clock.id] ?? false;
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
                            <div className="h-12 w-16 overflow-hidden rounded-lg bg-zinc-800">
                              <img
                                src={clock.photos[0]}
                                alt={clock.title}
                                className="h-full w-full object-cover"
                              />
                            </div>
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
            <div className="px-6 py-10 text-center text-sm text-zinc-500">
              No hay relojes con los filtros seleccionados.
            </div>
          )}
        </section>

        <Pagination
          page={page}
          totalPages={totalPages}
          onChange={(next) => setFilters((prev) => ({ ...prev, page: next }))}
        />
      </main>
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
  onChange
}: {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-zinc-800 bg-zinc-900 px-6 py-4">
      <span className="text-sm text-zinc-400">
        Página {page} de {totalPages}
      </span>
      <div className="flex gap-3">
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
      </div>
    </div>
  );
}
