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
  readArchivedMap,
  setArchivedForClock,
  type LeadStatus,
  type LeadStatusMap
} from "@/lib/lead-status";
import {
  buildAutoTags,
  extractBrand,
  extractModel,
  getPriceDropInfo,
  isWithinAgeBucket
} from "@/lib/clock-insights";
import LazyImage from "./LazyImage";
import PullToRefresh from "./PullToRefresh";
import LeadStatusBadge from "./LeadStatusBadge";
import PhotoLightbox from "./PhotoLightbox";
import FormattedDate from "./FormattedDate";
import BottomNav from "@/components/layout/BottomNav";

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
  opportunity: "all" | "only";
  priceMin: string;
  priceMax: string;
  dateFrom: string;
  dateTo: string;
  archived: "all" | "active" | "archived";
  sort: string;
  dir: "asc" | "desc";
  page: number;
};

const PAGE_SIZE = 25;

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

const toCsvValue = (value: string | number | boolean | null | undefined) => {
  if (value === null || value === undefined) return "";
  const stringValue = String(value);
  if (/["\n,]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
};

function buildInsightsForClocks(clocks: Clock[], opportunitySet: Set<string>) {
  return clocks.reduce<Record<string, { brand: string; model: string; tags: string[]; isOpportunity: boolean; priceDropPercent: number }>>(
    (acc, clock) => {
      const isOpportunity = opportunitySet.has(clock.id);
      const brand = extractBrand(clock.title);
      const model = extractModel(clock.title);
      const drop = getPriceDropInfo(clock.priceHistory);
      const tags = buildAutoTags({
        title: clock.title,
        description: clock.description,
        isOpportunity
      });
      acc[clock.id] = {
        brand,
        model,
        tags,
        isOpportunity,
        priceDropPercent: drop?.dropPercent ?? 0
      };
      return acc;
    },
    {}
  );
}

function filterClocksForExport(
  clocks: Clock[],
  filters: Filters,
  archivedMap: Record<string, boolean>,
  leadStatusMap: LeadStatusMap,
  insights: Record<string, { brand: string; model: string; tags: string[]; isOpportunity: boolean; priceDropPercent: number }>
) {
  const minPrice = Number(filters.priceMin);
  const maxPrice = Number(filters.priceMax);

  return clocks
    .filter((clock) => {
      const isArchived = archivedMap[clock.id] ?? false;
      if (filters.archived === "archived" && !isArchived) return false;
      if (filters.archived === "active" && isArchived) return false;
      if (filters.island && clock.island !== filters.island) return false;
      if (filters.source && clock.source !== filters.source) return false;
      const leadStatus = getLeadStatusForClock(leadStatusMap, clock.id);
      if (filters.leadStatus && leadStatus !== filters.leadStatus) return false;
      const insight = insights[clock.id];
      if (filters.brand && insight?.brand !== filters.brand) return false;
      if (filters.model && insight?.model !== filters.model) return false;
      if (filters.tag && !insight?.tags.includes(filters.tag)) return false;
      if (filters.opportunity === "only" && !insight?.isOpportunity) return false;
      if (filters.age && !isWithinAgeBucket(clock.publishedAt, filters.age)) return false;
      if (filters.query && !clock.title.toLowerCase().includes(filters.query.toLowerCase())) return false;
      if (filters.priceMin && clock.price < minPrice) return false;
      if (filters.priceMax && clock.price > maxPrice) return false;
      if (filters.dateFrom && new Date(clock.publishedAt) < new Date(filters.dateFrom)) return false;
      if (filters.dateTo && new Date(clock.publishedAt) > new Date(filters.dateTo)) return false;
      return true;
    })
    .sort((a, b) => {
      const key = filters.sort as keyof Clock;
      const dir = filters.dir === "asc" ? 1 : -1;
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
}

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
    brand: searchParams.get("brand") ?? "",
    model: searchParams.get("model") ?? "",
    tag: searchParams.get("tag") ?? "",
    age: searchParams.get("age") ?? "",
    opportunity: (searchParams.get("opp") as Filters["opportunity"]) || "all",
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
  if (filters.brand) params.set("brand", filters.brand);
  if (filters.model) params.set("model", filters.model);
  if (filters.tag) params.set("tag", filters.tag);
  if (filters.age) params.set("age", filters.age);
  if (filters.opportunity !== "all") params.set("opp", filters.opportunity);
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
  opportunityIds?: string[];
}

export default function ClocksTable({
  clocks,
  totalClocks,
  totalPages: initialTotalPages,
  pageSize,
  opportunityIds = []
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
  const [loading, setLoading] = useState(clocks.length === 0);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
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
  const [exporting, setExporting] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxClock, setLightboxClock] = useState<Clock | null>(null);
  const [lightboxPhotoIndex, setLightboxPhotoIndex] = useState(0);
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
    // Load archived state from localStorage
    const storedArchived = readArchivedMap();
    const map: Record<string, boolean> = {};
    const favoriteDefaults: Record<string, boolean> = {};
    const dataSet = allClocks ?? currentClocks;
    dataSet.forEach((clock) => {
      map[clock.id] = storedArchived[clock.id] ?? false;
      favoriteDefaults[clock.id] = false;
    });
    setArchivedMap(map);
    setFavoriteMap(favoriteDefaults);
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

    // Automatically archive when status changes to "descartado"
    // Automatically unarchive when status changes from "descartado" to something else
    setArchivedMap((prev) => {
      const isCurrentlyDescartado = getLeadStatusForClock(leadStatusMap, clockId) === "descartado";
      const willBeDescartado = nextStatus === "descartado";

      if (willBeDescartado && !isCurrentlyDescartado) {
        // Changing to descartado: archive the clock
        return setArchivedForClock(prev, clockId, true);
      } else if (!willBeDescartado && isCurrentlyDescartado) {
        // Changing from descartado: unarchive the clock
        return setArchivedForClock(prev, clockId, false);
      }

      return prev;
    });
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
    debouncedFilters.brand,
    debouncedFilters.model,
    debouncedFilters.tag,
    debouncedFilters.age,
    debouncedFilters.opportunity,
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
    setError(null);

    async function fetchWithRetry(attempt: number) {
      try {
        const response = await fetchClocks({
          page: filters.page,
          pageSize,
          island: filters.island || undefined,
          archived: filters.archived === "all" ? undefined : filters.archived === "archived",
          sort: filters.sort,
          dir: filters.dir
        });
        
        if (cancelled) return;
        
        setCurrentClocks(response.data);
        setTotalPages(response.totalPages);
        setTotalCount(response.total);
        setLoading(false);
        setError(null);
        setRetryCount(0);
      } catch (err) {
        if (cancelled) return;
        
        if (attempt < 3) {
          // Retry with exponential backoff
          const delay = Math.pow(2, attempt) * 1000;
          setTimeout(() => fetchWithRetry(attempt + 1), delay);
        } else {
          setLoading(false);
          setError("No se pudo cargar los relojes. Inténtalo de nuevo.");
          setRetryCount(attempt);
        }
      }
    }

    fetchWithRetry(0);

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
  const opportunitySet = useMemo(() => new Set(opportunityIds), [opportunityIds]);

  const insights = useMemo(() => {
    return dataSet.reduce<Record<string, { brand: string; model: string; tags: string[]; isOpportunity: boolean; priceDropPercent: number }>>(
      (acc, clock) => {
        const isOpportunity = opportunitySet.has(clock.id);
        const brand = extractBrand(clock.title);
        const model = extractModel(clock.title);
        const drop = getPriceDropInfo(clock.priceHistory);
        const tags = buildAutoTags({
          title: clock.title,
          description: clock.description,
          isOpportunity
        });
        acc[clock.id] = {
          brand,
          model,
          tags,
          isOpportunity,
          priceDropPercent: drop?.dropPercent ?? 0
        };
        return acc;
      },
      {}
    );
  }, [dataSet, opportunitySet]);

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
        const insight = insights[clock.id];
        if (debouncedFilters.brand && insight?.brand !== debouncedFilters.brand) return false;
        if (debouncedFilters.model && insight?.model !== debouncedFilters.model) return false;
        if (debouncedFilters.tag && !insight?.tags.includes(debouncedFilters.tag)) return false;
        if (debouncedFilters.opportunity === "only" && !insight?.isOpportunity) return false;
        if (debouncedFilters.age && !isWithinAgeBucket(clock.publishedAt, debouncedFilters.age)) return false;
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
  }, [dataSet, debouncedFilters, archivedMap, leadStatusMap, insights]);

  const usingAllClocks = Boolean(allClocks);
  // SIEMPRE calcular totalPages basado en filteredClocks.length / PAGE_SIZE
  const totalPagesForView = Math.max(1, Math.ceil(filteredClocks.length / PAGE_SIZE));
  const totalLabel = filteredClocks.length;
  // Asegurar que la página está dentro del rango válido
  const page = Math.max(1, Math.min(filters.page, totalPagesForView));
  const start = (page - 1) * PAGE_SIZE;
  // SIEMPRE paginar, tanto si usamos allClocks como si no
  const paginatedClocks = filteredClocks.slice(start, start + PAGE_SIZE);

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
      let updated = { ...prev };
      ids.forEach((id) => {
        updated = setArchivedForClock(updated, id, archived);
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
    setError(null);
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
    } catch (err) {
      setError("Error al actualizar. Inténtalo de nuevo.");
    } finally {
      setLoading(false);
    }
  }, [allClocks, filters.page, filters.island, filters.archived, filters.sort, filters.dir, pageSize]);

  // Manual retry handler
  const handleRetry = useCallback(() => {
    setRetryCount(0);
    setError(null);
    setLoading(true);
  }, []);

  function buildExportData(exportSource: Clock[]) {
    const exportInsights = buildInsightsForClocks(exportSource, opportunitySet);
    const exportFiltered = filterClocksForExport(
      exportSource,
      debouncedFilters,
      archivedMap,
      leadStatusMap,
      exportInsights
    );

    const headers = [
      "id",
      "titulo",
      "precio",
      "moneda",
      "isla",
      "fuente",
      "publicado",
      "primera_vez",
      "actualizado",
      "url",
      "archivado",
      "lead_status",
      "marca",
      "modelo",
      "tags",
      "oportunidad",
      "precio_bajado_pct"
    ];

    const rows = exportFiltered.map((clock) => {
      const insight = exportInsights[clock.id];
      return [
        clock.id,
        clock.title,
        clock.price,
        clock.currency,
        clock.island,
        clock.source,
        clock.publishedAt,
        clock.firstSeenAt,
        clock.updatedAt,
        clock.sourceUrl,
        archivedMap[clock.id] ? "archived" : "active",
        getLeadStatusForClock(leadStatusMap, clock.id),
        insight?.brand ?? "",
        insight?.model ?? "",
        (insight?.tags ?? []).join("|"),
        insight?.isOpportunity ? "si" : "no",
        insight?.priceDropPercent ?? 0
      ];
    });

    return { headers, rows };
  }

  const handleExportCSV = useCallback(async () => {
    if (typeof window === "undefined") return;
    setExporting(true);
    try {
      const exportSource = allClocks ?? (await getAllClocks());
      const { headers, rows } = buildExportData(exportSource);

      const csv = [headers, ...rows]
        .map((row) => row.map(toCsvValue).join(","))
        .join("\n");
      const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `relojes-${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  }, [
    allClocks,
    archivedMap,
    debouncedFilters,
    leadStatusMap,
    opportunitySet
  ]);

  const handleExportExcel = useCallback(async () => {
    if (typeof window === "undefined") return;
    setExporting(true);
    try {
      const exportSource = allClocks ?? (await getAllClocks());
      const { headers, rows } = buildExportData(exportSource);

      const escapeHtml = (value: unknown) =>
        String(value ?? "")
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;");

      const tableRows = [
        `<tr>${headers.map((header) => `<th>${escapeHtml(header)}</th>`).join("")}</tr>`,
        ...rows.map(
          (row) =>
            `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`
        )
      ].join("");

      const html = `<!doctype html><html><head><meta charset="UTF-8" /></head><body><table>${tableRows}</table></body></html>`;
      const blob = new Blob([html], { type: "application/vnd.ms-excel;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `relojes-${new Date().toISOString().slice(0, 10)}.xls`;
      link.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  }, [
    allClocks,
    archivedMap,
    debouncedFilters,
    leadStatusMap,
    opportunitySet
  ]);

  const handleOpenLightbox = useCallback((clock: Clock, photoIndex: number = 0) => {
    if (!clock.photos || clock.photos.length === 0) return;
    setLightboxClock(clock);
    setLightboxPhotoIndex(photoIndex);
    setLightboxOpen(true);
  }, []);

  const handleCloseLightbox = useCallback(() => {
    setLightboxOpen(false);
    setLightboxClock(null);
    setLightboxPhotoIndex(0);
  }, []);

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
    <div className="min-h-screen bg-black pb-24 text-white">
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
            brands={brands}
            models={models}
            tags={autoTags}
            onExportCSV={handleExportCSV}
            onExportExcel={handleExportExcel}
            exporting={exporting}
          />

          <BulkActions
            selected={selectedIds}
            onArchive={(archived) => handleArchive(selectedIds, archived)}
          />

          {error && (
            <div className="rounded-2xl border border-rose-500/30 bg-rose-950/20 p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-medium text-rose-300">{error}</p>
                  {retryCount > 0 && (
                    <p className="mt-1 text-xs text-zinc-500">
                      Intentos realizados: {retryCount}/3
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={handleRetry}
                  className="rounded-full border border-rose-500/50 px-4 py-2 text-xs text-rose-300 transition hover:border-rose-400"
                >
                  Reintentar
                </button>
              </div>
            </div>
          )}

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
                  const insight = insights[clock.id];
                  return (
                    <SwipeCard
                      key={clock.id}
                      clock={clock}
                      isArchived={isArchived}
                      isFavorited={isFavorited}
                      leadStatus={leadStatus}
                      tags={insight?.tags ?? []}
                      priceDropPercent={insight?.priceDropPercent ?? 0}
                      onLeadStatusChange={(status) => handleLeadStatusChange(clock.id, status)}
                      onSwipeArchive={() => applySwipeAction(clock, "archive")}
                      onSwipeFavorite={() => applySwipeAction(clock, "favorite")}
                      onOpenLightbox={handleOpenLightbox}
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
                        const insight = insights[clock.id];
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
                            <td 
                              className="px-4 py-4 cursor-pointer"
                              onClick={() => handleOpenLightbox(clock, 0)}
                            >
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
                              {insight?.tags?.length ? (
                                <div className="mt-2 flex flex-wrap gap-1">
                                  {insight.tags.map((tag) => (
                                    <span
                                      key={tag}
                                      className="rounded-full border border-zinc-700 px-2 py-0.5 text-[10px] uppercase tracking-wide text-zinc-300"
                                    >
                                      {tag}
                                    </span>
                                  ))}
                                  {insight.priceDropPercent > 0 && (
                                    <span className="rounded-full bg-red-500/20 px-2 py-0.5 text-[10px] uppercase tracking-wide text-red-300">
                                      PRECIO BAJADO -{insight.priceDropPercent}%
                                    </span>
                                  )}
                                </div>
                              ) : insight?.priceDropPercent > 0 ? (
                                <div className="mt-2 flex flex-wrap gap-1">
                                  <span className="rounded-full bg-red-500/20 px-2 py-0.5 text-[10px] uppercase tracking-wide text-red-300">
                                    PRECIO BAJADO -{insight.priceDropPercent}%
                                  </span>
                                </div>
                              ) : null}
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
                            <td className="px-4 py-4"><FormattedDate value={clock.publishedAt} /></td>
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
      
      {/* Lightbox - fuera de PullToRefresh para z-index correcto */}
      {lightboxOpen && lightboxClock && (
        <PhotoLightbox
          photos={lightboxClock.photos}
          title={lightboxClock.title}
          initialIndex={lightboxPhotoIndex}
          onClose={handleCloseLightbox}
          onArchive={() => applySwipeAction(lightboxClock, "archive")}
        />
      )}
      <BottomNav />
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
  sources,
  brands,
  models,
  tags,
  onExportCSV,
  onExportExcel,
  exporting
}: {
  filters: Filters;
  setFilters: React.Dispatch<React.SetStateAction<Filters>>;
  sources: string[];
  brands: string[];
  models: string[];
  tags: string[];
  onExportCSV: () => void;
  onExportExcel: () => void;
  exporting: boolean;
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
          Marca
          <select
            value={filters.brand}
            onChange={(event) =>
              setFilters((prev) => ({ ...prev, brand: event.target.value, model: "", page: 1 }))
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
              setFilters((prev) => ({ ...prev, model: event.target.value, page: 1 }))
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
              setFilters((prev) => ({ ...prev, tag: event.target.value, page: 1 }))
            }
            className="mt-2 w-full rounded-xl border border-zinc-800 bg-black/40 px-4 py-2 text-sm text-white"
          >
            <option value="">Todos</option>
            {tags.map((tag) => (
              <option key={tag} value={tag}>
                {tag}
              </option>
            ))}
          </select>
        </label>

        <label className="text-xs uppercase tracking-wider text-zinc-500">
          Oportunidad
          <select
            value={filters.opportunity}
            onChange={(event) =>
              setFilters((prev) => ({
                ...prev,
                opportunity: event.target.value as Filters["opportunity"],
                page: 1
              }))
            }
            className="mt-2 w-full rounded-xl border border-zinc-800 bg-black/40 px-4 py-2 text-sm text-white"
          >
            <option value="all">Todas</option>
            <option value="only">Solo oportunidades</option>
          </select>
        </label>

        <label className="text-xs uppercase tracking-wider text-zinc-500">
          Antigüedad
          <select
            value={filters.age}
            onChange={(event) =>
              setFilters((prev) => ({ ...prev, age: event.target.value, page: 1 }))
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
              brand: "",
              model: "",
              tag: "",
              age: "",
              opportunity: "all",
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
        <button
          type="button"
          onClick={onExportCSV}
          disabled={exporting}
          className="rounded-full border border-emerald-500/50 px-4 py-2 text-xs text-emerald-300 transition hover:border-emerald-400 disabled:opacity-50"
        >
          {exporting ? "Exportando..." : "Exportar CSV"}
        </button>
        <button
          type="button"
          onClick={onExportExcel}
          disabled={exporting}
          className="rounded-full border border-emerald-500/50 px-4 py-2 text-xs text-emerald-300 transition hover:border-emerald-400 disabled:opacity-50"
        >
          {exporting ? "Exportando..." : "Exportar Excel"}
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
  tags,
  priceDropPercent,
  onLeadStatusChange,
  onSwipeArchive,
  onSwipeFavorite,
  onOpenLightbox
}: {
  clock: Clock;
  isArchived: boolean;
  isFavorited: boolean;
  leadStatus: LeadStatus;
  tags: string[];
  priceDropPercent: number;
  onLeadStatusChange: (status: LeadStatus) => void;
  onSwipeArchive: () => void;
  onSwipeFavorite: () => void;
  onOpenLightbox: (clock: Clock, index: number) => void;
}) {
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const axisRef = useRef<"x" | "y" | null>(null);
  const hadDragRef = useRef(false);
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
    hadDragRef.current = false;
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
      if (axisRef.current === "x") {
        hadDragRef.current = true;
      }
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

    // Si no hubo drag, dejar que el click se propague
    if (!hadDragRef.current) {
      return;
    }

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
            onClick={() => onOpenLightbox(clock, 0)}
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
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1 text-[11px] text-zinc-400">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-zinc-700 px-2 py-0.5 text-[10px] uppercase tracking-wide text-zinc-300"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500">
          <FormattedDate value={clock.publishedAt} />
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
          {priceDropPercent > 0 && (
            <span className="rounded-full bg-red-500/20 px-2 py-1 text-red-300">
              PRECIO BAJADO -{priceDropPercent}%
            </span>
          )}
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
