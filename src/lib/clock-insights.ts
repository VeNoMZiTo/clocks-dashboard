const BRAND_KEYWORDS = [
  "Rolex",
  "Omega",
  "Seiko",
  "Tudor",
  "Tag Heuer",
  "Longines",
  "Cartier",
  "Casio",
  "Citizen",
  "Hamilton",
  "Breitling",
  "IWC",
  "Panerai",
  "Audemars",
  "Patek",
  "Tag",
  "Orient",
  "Bulova",
  "Timex",
  "Swatch",
  "Hublot",
  "Tissot",
  "Seagull",
  "Rado",
  "Zenith",
  "Maurice Lacroix",
  "Jaeger",
  "Vacheron",
  "Nomos",
  "Grand Seiko"
];

const MODEL_KEYWORDS = [
  "Submariner",
  "Datejust",
  "Explorer",
  "Daytona",
  "GMT",
  "Oyster",
  "Speedmaster",
  "Seamaster",
  "Constellation",
  "Prospex",
  "Seiko 5",
  "SARB",
  "SRP",
  "SKX",
  "Black Bay",
  "Pelagos",
  "Aquaracer",
  "Carrera",
  "Monaco",
  "Santos",
  "Tank",
  "Santos",
  "Navitimer",
  "Navitimer",
  "Portugieser",
  "Big Pilot",
  "Fifty Fathoms",
  "Royal Oak",
  "Nautilus",
  "Calatrava",
  "Speedy",
  "G-Shock",
  "G Shock"
];

const TAG_RULES: Array<{ tag: string; keywords: string[] }> = [
  { tag: "Vintage", keywords: ["vintage", "clásico", "clasico", "antiguo"] },
  { tag: "Cronógrafo", keywords: ["cronógrafo", "cronografo", "chrono"] },
  { tag: "Automático", keywords: ["automático", "automatic"] },
  { tag: "Cuarzo", keywords: ["cuarzo", "quartz"] },
  { tag: "Oro", keywords: ["oro", "gold"] },
  { tag: "Plata", keywords: ["plata", "silver"] },
  { tag: "Acero", keywords: ["acero", "steel", "stainless"] },
  { tag: "Edición limitada", keywords: ["edición limitada", "limited edition", "limited"] },
  { tag: "Nuevo", keywords: ["nuevo", "a estrenar", "sin usar"] },
  { tag: "Caja/Papeles", keywords: ["caja", "papeles", "box", "papers"] }
];

function normalize(text: string) {
  return text.toLowerCase();
}

export function extractBrand(title: string) {
  const normalized = normalize(title);
  return (
    BRAND_KEYWORDS.find((brand) => normalized.includes(brand.toLowerCase())) ?? ""
  );
}

export function extractModel(title: string) {
  const normalized = normalize(title);
  return (
    MODEL_KEYWORDS.find((model) => normalized.includes(model.toLowerCase())) ?? ""
  );
}

export function buildAutoTags({
  title,
  description,
  isOpportunity
}: {
  title: string;
  description?: string;
  isOpportunity?: boolean;
}) {
  const haystack = `${title} ${description ?? ""}`.toLowerCase();
  const tags = new Set<string>();

  TAG_RULES.forEach((rule) => {
    if (rule.keywords.some((keyword) => haystack.includes(keyword))) {
      tags.add(rule.tag);
    }
  });

  if (isOpportunity) {
    tags.add("Oportunidad");
  }

  return Array.from(tags.values());
}

export function isWithinAgeBucket(dateValue: string, bucket: string) {
  if (!bucket) return true;
  const now = Date.now();
  const target = new Date(dateValue).getTime();
  if (Number.isNaN(target)) return true;
  const diffHours = (now - target) / 36e5;
  if (bucket === "24h") return diffHours <= 24;
  if (bucket === "7d") return diffHours <= 24 * 7;
  if (bucket === "30d") return diffHours <= 24 * 30;
  return true;
}

export function getPriceDropInfo(priceHistory: Array<{ date: string; price: number }>) {
  if (!Array.isArray(priceHistory) || priceHistory.length < 2) return null;
  const sorted = [...priceHistory]
    .filter((entry) => Number.isFinite(entry.price))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  if (sorted.length < 2) return null;

  const previous = sorted[sorted.length - 2];
  const current = sorted[sorted.length - 1];
  if (current.price >= previous.price || previous.price <= 0) return null;

  const dropAmount = previous.price - current.price;
  const dropRatio = dropAmount / previous.price;

  return {
    previousPrice: previous.price,
    currentPrice: current.price,
    dropAmount,
    dropRatio,
    dropPercent: Math.round(dropRatio * 100)
  };
}
