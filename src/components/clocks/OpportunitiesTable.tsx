"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import BottomNav from "@/components/layout/BottomNav";
import LazyImage from "./LazyImage";
import LeadStatusBadge from "./LeadStatusBadge";
import FormattedDate from "./FormattedDate";
import {
  LEAD_STATUS_OPTIONS,
  getLeadStatusForClock,
  readLeadStatusMap,
  setLeadStatusForClock,
  type LeadStatus,
  type LeadStatusMap
} from "@/lib/lead-status";
import {
  buildAutoTags,
  extractBrand,
  extractModel,
  isWithinAgeBucket
} from "@/lib/clock-insights";
import type { Clock } from "@/lib/clocks";
import type { Opportunity } from "@/lib/opportunities";

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
  brand: string;
  model: string;
  tag: string;
  age: string;
  priceMin: string;
  priceMax: string;
  dateFrom: string;
  dateTo: string;
  archived: "all" | "active" | "archived";
};

type OpportunityClock = Opportunity & {
  id: string;
  photos: string[];
  publishedAt: string;
  sourceUrl?: string;
};

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

function buildDataset(opportunities: Opportunity[], clocksById: Record<string, Clock>): OpportunityClock[] {
  return opportunities.map((opportunity) => {
    const clock = clocksById[opportunity.clockId];
    return {
      ...opportunity,
      id: opportunity.clockId,
      title: clock?.title || opportunity.title,
      price: clock?.price ?? opportunity.price,
      currency: clock?.currency ?? opportunity.currency,
      island: clock?.island ?? opportunity.island,
      source: clock?.source ?? opportunity.source,
      sourceUrl: clock?.sourceUrl ?? opportunity.sourceUrl,
      photos: clock?.photos ?? [],
      publishedAt: clock?.publishedAt ?? opportunity.detectedAt
    };
  });
}

export default function OpportunitiesTable({
  opportunities,
  clocksById
}: {
  opportunities: Opportunity[];
  clocksById: Record<string, Clock>;
}) {
  const [filters, setFilters] = useState<Filters>({
    query: "",
    island: "",
    source: "",
    leadStatus: "",
    brand: "",
    model: "",
    tag: "",
    age: "",
    priceMin: "",
    priceMax: "",
    dateFrom: "",
    dateTo: "",
    archived: "active"
  });
  const [leadStatusMap, setLeadStatusMap] = useState<LeadStatusMap>({});
  const [archivedMap, setArchivedMap] = useState<Record<string, boolean>>({});

  const debouncedFilters = {
    ...filters,
    query: useDebouncedValue(filters.query),
    priceMin: useDebouncedValue(filters.priceMin),
    priceMax: useDebouncedValue(filters.priceMax),
    dateFrom: useDebouncedValue(filters.dateFrom),
    dateTo: useDebouncedValue(filters.dateTo)
  };

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

  useEffect(() => {
    const map: Record<string, boolean> = {};
    opportunities.forEach((opportunity) => {
      map[opportunity.clockId] = false;
    });
    setArchivedMap(map);
  }, [opportunities]);

  function handleLeadStatusChange(clockId: string, nextStatus: LeadStatus) {
    setLeadStatusMap((prev) => setLeadStatusForClock(prev, clockId, nextStatus));
  }

  function toggleArchive(id: string) {
    setArchivedMap((prev) => ({ ...prev, [id]: !(prev[id] ?? false) }));
  }

  const dataSet = useMemo(
    () => buildDataset(opportunities, clocksById),
    [opportunities, clocksById]
  );

  const insights = useMemo(() => {
    return dataSet.reduce<Record<string, { brand: string; model: string; tags: string[] }>>(
      (acc, clock) => {
        const brand = extractBrand(clock.title);
        const model = extractModel(clock.title);
        const tags = buildAutoTags({
          title: clock.title,
          description: "",
          isOpportunity: true
        });
        acc[clock.id] = { brand, model, tags };
        return acc;
      },
      {}
    );
  }, [dataSet]);

  const sources = useMemo(
    () => Array.from(new Set(dataSet.map((clock) => clock.source))).sort(),
    [dataSet]
  );

  const brands = useMemo(() => {
    const items = dataSet
      .map((clock) => insights[clock.id]?.brand)
      .filter((brand): brand is string => Boolean(brand));
    return Array.from(new Set(items)).sort();
  }, [dataSet, insights]);

  const models = useMemo(() => {
    const items = dataSet
      .filter((clock) => {
        if (!filters.brand) return true;
        return insights[clock.id]?.brand === filters.brand;
      })
      .map((clock) => insights[clock.id]?.model)
      .filter((model): model is string => Boolean(model));
    return Array.from(new Set(items)).sort();
  }, [dataSet, filters.brand, insights]);

  const autoTags = useMemo(() => {
    const items = dataSet.flatMap((clock) => insights[clock.id]?.tags ?? []);
    return Array.from(new Set(items)).sort();
  }, [dataSet, insights]);

  const filtered = useMemo(() => {
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
        const insight = insights[clock.id];
        if (debouncedFilters.brand && insight?.brand !== debouncedFilters.brand) return false;
        if (debouncedFilters.model && insight?.model !== debouncedFilters.model) return false;
        if (debouncedFilters.tag && !insight?.tags.includes(debouncedFilters.tag)) return false;
        if (debouncedFilters.age && !isWithinAgeBucket(clock.publishedAt, debouncedFilters.age)) return false;
        if (debouncedFilters.query && !clock.title.toLowerCase().includes(debouncedFilters.query.toLowerCase())) return false;
        if (debouncedFilters.priceMin && clock.price < minPrice) return false;
        if (debouncedFilters.priceMax && clock.price > maxPrice) return false;
        if (debouncedFilters.dateFrom && new Date(clock.detectedAt) < new Date(debouncedFilters.dateFrom)) return false;
        if (debouncedFilters.dateTo && new Date(clock.detectedAt) > new Date(debouncedFilters.dateTo)) return false;
        return true;
      })
      .sort((a, b) => b.discountRatio - a.discountRatio);
  }, [dataSet, debouncedFilters, archivedMap, leadStatusMap, insights]);

  return (
    <div className="min-h-screen bg-black pb-24 text-white">
      <header className="border-b border-zinc-800 bg-zinc-950/80">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-6 py-6 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-emerald-400">
              Oportunidades
            </p>
            <h1 className="mt-2 text-3xl font-semibold text-white">
              Relojes destacados por margen
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-zinc-400">
              {filtered.length} oportunidades detectadas (ordenadas por margen potencial).
            </p>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm text-zinc-400">
            Ordenadas por margen potencial
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-6 px-6 py-8">
        <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <label className="text-xs uppercase tracking-wider text-zinc-500">
              Buscar
              <input
                type="text"
                value={filters.query}
                onChange={(event) =>
                  setFilters((prev) => ({ ...prev, query: event.target.value }))
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
                  setFilters((prev) => ({ ...prev, island: event.target.value }))
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
                  setFilters((prev) => ({ ...prev, source: event.target.value }))
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
              Marca
              <select
                value={filters.brand}
                onChange={(event) =>
                  setFilters((prev) => ({ ...prev, brand: event.target.value, model: "" }))
                }
                className="mt-2 w-full rounded-xl border border-zinc-800 bg-black/40 px-4 py-2 text-sm text-white"
              >
                <option value="">Todas</option>
                {brands.map((brand) => (
                  <option key={brand} value={brand}>
                    {brand}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-xs uppercase tracking-wider text-zinc-500">
              Modelo
              <select
                value={filters.model}
                onChange={(event) =>
                  setFilters((prev) => ({ ...prev, model: event.target.value }))
                }
                className="mt-2 w-full rounded-xl border border-zinc-800 bg-black/40 px-4 py-2 text-sm text-white"
              >
                <option value="">Todos</option>
                {models.map((model) => (
                  <option key={model} value={model}>
                    {model}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-xs uppercase tracking-wider text-zinc-500">
              Tags
              <select
                value={filters.tag}
                onChange={(event) =>
                  setFilters((prev) => ({ ...prev, tag: event.target.value }))
                }
                className="mt-2 w-full rounded-xl border border-zinc-800 bg-black/40 px-4 py-2 text-sm text-white"
              >
                <option value="">Todos</option>
                {autoTags.map((tag) => (
                  <option key={tag} value={tag}>
                    {tag}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-xs uppercase tracking-wider text-zinc-500">
              Antigüedad
              <select
                value={filters.age}
                onChange={(event) =>
                  setFilters((prev) => ({ ...prev, age: event.target.value }))
                }
                className="mt-2 w-full rounded-xl border border-zinc-800 bg-black/40 px-4 py-2 text-sm text-white"
              >
                <option value="">Cualquiera</option>
                <option value="24h">Últimas 24h</option>
                <option value="7d">Últimos 7 días</option>
                <option value="30d">Últimos 30 días</option>
              </select>
            </label>

            <label className="text-xs uppercase tracking-wider text-zinc-500">
              Estado lead
              <select
                value={filters.leadStatus}
                onChange={(event) =>
                  setFilters((prev) => ({ ...prev, leadStatus: event.target.value }))
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
                    archived: event.target.value as Filters["archived"]
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
                  setFilters((prev) => ({ ...prev, priceMin: event.target.value }))
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
                  setFilters((prev) => ({ ...prev, priceMax: event.target.value }))
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
                  setFilters((prev) => ({ ...prev, dateFrom: event.target.value }))
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
                  setFilters((prev) => ({ ...prev, dateTo: event.target.value }))
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
                  brand: "",
                  model: "",
                  tag: "",
                  age: "",
                  priceMin: "",
                  priceMax: "",
                  dateFrom: "",
                  dateTo: "",
                  archived: "active"
                })
              }
              className="rounded-full border border-zinc-700 px-4 py-2 text-xs text-zinc-300 transition hover:border-zinc-500"
            >
              Limpiar filtros
            </button>
            <span className="text-xs text-zinc-500">
              Los filtros se aplican sobre la fecha de detección.
            </span>
          </div>
        </section>

        <section className="space-y-4 md:hidden">
          {filtered.length === 0 && (
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900 px-6 py-10 text-center text-sm text-zinc-500">
              No hay oportunidades con los filtros seleccionados.
            </div>
          )}
          {filtered.map((clock) => {
            const leadStatus = getLeadStatusForClock(leadStatusMap, clock.id);
            const isArchived = archivedMap[clock.id] ?? false;
            const marginPct = Math.round(clock.discountRatio * 100);
            const insight = insights[clock.id];
            return (
              <div
                key={clock.id}
                className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4"
              >
                <div className="flex items-start gap-3">
                  <LazyImage
                    src={clock.photos?.[0] || ""}
                    alt={clock.title}
                    containerClassName="h-20 w-24 rounded-xl"
                    className="h-full w-full object-cover"
                  />
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-semibold text-white">{clock.title}</p>
                    <p className="text-xs text-zinc-400">
                      {clock.island} · {clock.source}
                    </p>
                    <p className="text-sm text-emerald-300">
                      {formatPrice(clock.price, clock.currency)}
                    </p>
                    <p className="text-xs text-zinc-500">
                      Mercado: {formatPrice(clock.marketPrice, clock.currency)}
                    </p>
                    {insight?.tags?.length ? (
                      <div className="flex flex-wrap gap-2 pt-1 text-[11px] text-zinc-400">
                        {insight.tags.map((tag) => (
                          <span
                            key={tag}
                            className="rounded-full border border-zinc-700 px-2 py-0.5 text-[10px] uppercase tracking-wide text-zinc-300"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                  <span className="rounded-full bg-emerald-500/15 px-2 py-1 text-emerald-200">
                    OPORTUNIDAD
                  </span>
                  <span className="rounded-full bg-sky-500/15 px-2 py-1 text-sky-200">
                    Detectado <FormattedDate value={clock.detectedAt} />
                  </span>
                  <span className="rounded-full bg-amber-500/15 px-2 py-1 text-amber-200">
                    Margen {marginPct}%
                  </span>
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
                  {isArchived && (
                    <span className="rounded-full bg-rose-500/20 px-2 py-1 text-rose-300">
                      Archivado
                    </span>
                  )}
                </div>

                <div className="mt-4 flex items-center justify-between">
                  <Link
                    href={`/clocks/${clock.id}`}
                    className="rounded-full border border-zinc-700 px-3 py-1 text-xs text-zinc-300 transition hover:border-zinc-500"
                  >
                    Ver detalle
                  </Link>
                  <button
                    type="button"
                    onClick={() => toggleArchive(clock.id)}
                    className={`rounded-full px-3 py-1 text-xs transition ${
                      isArchived
                        ? "border border-emerald-500/50 text-emerald-300"
                        : "border border-rose-500/50 text-rose-300"
                    }`}
                  >
                    {isArchived ? "Desarchivar" : "Archivar"}
                  </button>
                </div>
              </div>
            );
          })}
        </section>

        <section className="hidden rounded-2xl border border-zinc-800 bg-zinc-900 md:block">
          <div className="overflow-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-zinc-950 text-xs uppercase tracking-wider text-zinc-500">
                <tr>
                  <th className="px-4 py-3">Foto</th>
                  <th className="px-4 py-3">Título</th>
                  <th className="px-4 py-3">Margen</th>
                  <th className="px-4 py-3">Precio</th>
                  <th className="px-4 py-3">Isla</th>
                  <th className="px-4 py-3">Fuente</th>
                  <th className="px-4 py-3">Detectado</th>
                  <th className="px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((clock) => {
                  const leadStatus = getLeadStatusForClock(leadStatusMap, clock.id);
                  const isArchived = archivedMap[clock.id] ?? false;
                  const marginPct = Math.round(clock.discountRatio * 100);
                  return (
                    <tr
                      key={clock.id}
                      className="border-t border-zinc-800 text-zinc-200 hover:bg-black/40"
                    >
                      <td className="px-4 py-4">
                        <LazyImage
                          src={clock.photos?.[0] || ""}
                          alt={clock.title}
                          containerClassName="h-12 w-16 rounded-lg"
                          className="h-full w-full object-cover"
                        />
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-sm font-medium text-white">{clock.title}</div>
                        <div className="mt-1 flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-emerald-500/15 px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-emerald-200">
                            OPORTUNIDAD
                          </span>
                          <span className="rounded-full bg-sky-500/15 px-2 py-1 text-[10px] text-sky-200">
                            Detectado <FormattedDate value={clock.detectedAt} />
                          </span>
                          {isArchived && (
                            <span className="rounded-full bg-rose-500/20 px-2 py-1 text-[10px] text-rose-300">
                              Archivado
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-amber-300">{marginPct}%</td>
                      <td className="px-4 py-4 text-emerald-300">
                        {formatPrice(clock.price, clock.currency)}
                      </td>
                      <td className="px-4 py-4">{clock.island}</td>
                      <td className="px-4 py-4">{clock.source}</td>
                      <td className="px-4 py-4"><FormattedDate value={clock.detectedAt} /></td>
                      <td className="px-4 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
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
                          <Link
                            href={`/clocks/${clock.id}`}
                            className="rounded-full border border-zinc-700 px-3 py-1 text-xs text-zinc-300 transition hover:border-zinc-500"
                          >
                            Ver
                          </Link>
                          <button
                            type="button"
                            onClick={() => toggleArchive(clock.id)}
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

          {filtered.length === 0 && (
            <div className="px-6 py-10 text-center text-sm text-zinc-500">
              No hay oportunidades con los filtros seleccionados.
            </div>
          )}
        </section>
      </main>

      <BottomNav />
    </div>
  );
}
