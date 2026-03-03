export type LeadStatus = "nuevo" | "contactado" | "negociando" | "comprado" | "descartado";

export type LeadStatusConfig = {
  value: LeadStatus;
  label: string;
  badgeClasses: string;
  dotClasses: string;
};

export const LEAD_STATUS_OPTIONS: LeadStatusConfig[] = [
  {
    value: "nuevo",
    label: "Nuevo",
    badgeClasses: "border-slate-500/40 bg-slate-500/20 text-slate-200",
    dotClasses: "bg-slate-300"
  },
  {
    value: "contactado",
    label: "Contactado",
    badgeClasses: "border-sky-500/40 bg-sky-500/20 text-sky-200",
    dotClasses: "bg-sky-300"
  },
  {
    value: "negociando",
    label: "Negociando",
    badgeClasses: "border-amber-500/40 bg-amber-500/20 text-amber-200",
    dotClasses: "bg-amber-300"
  },
  {
    value: "comprado",
    label: "Comprado",
    badgeClasses: "border-emerald-500/40 bg-emerald-500/20 text-emerald-200",
    dotClasses: "bg-emerald-300"
  },
  {
    value: "descartado",
    label: "Descartado",
    badgeClasses: "border-rose-500/40 bg-rose-500/20 text-rose-200",
    dotClasses: "bg-rose-300"
  }
];

export type LeadStatusMap = Record<string, LeadStatus>;

const STORAGE_KEY = "clocks.leadStatusMap";

export function getLeadStatusConfig(status: LeadStatus): LeadStatusConfig {
  return LEAD_STATUS_OPTIONS.find((option) => option.value === status) ?? LEAD_STATUS_OPTIONS[0];
}

export function readLeadStatusMap(): LeadStatusMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as LeadStatusMap;
  } catch {
    return {};
  }
}

export function writeLeadStatusMap(map: LeadStatusMap) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    // ignore
  }
}

export function getLeadStatusForClock(map: LeadStatusMap, clockId: string): LeadStatus {
  return map[clockId] ?? "nuevo";
}

export function setLeadStatusForClock(
  map: LeadStatusMap,
  clockId: string,
  status: LeadStatus
): LeadStatusMap {
  const next = { ...map, [clockId]: status };
  writeLeadStatusMap(next);
  return next;
}
