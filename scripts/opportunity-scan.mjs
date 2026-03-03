#!/usr/bin/env node

const DEFAULT_API_BASE = "https://automation.dimensiontei.com/webhook/clocks";
const DEFAULT_OUTPUT_DIR = new URL("../data/", import.meta.url).pathname;

const AUTH_USER = process.env.CLOCKS_API_USER || "relojes";
const AUTH_PASS = process.env.CLOCKS_API_PASS || "nnS4MDu9DcJb";

const CONFIG_PATH = new URL("../data/opportunity-config.json", import.meta.url).pathname;
const REFERENCE_PATH = new URL("../data/opportunity-reference.json", import.meta.url).pathname;

const fs = await import("node:fs/promises");
const path = await import("node:path");

function getAuthHeaders() {
  const credentials = Buffer.from(`${AUTH_USER}:${AUTH_PASS}`).toString("base64");
  return {
    Authorization: `Basic ${credentials}`,
    "Content-Type": "application/json"
  };
}

async function loadJson(filePath) {
  const raw = await fs.readFile(filePath, "utf-8");
  return JSON.parse(raw);
}

function normalizeClock(apiClock) {
  const price = typeof apiClock.latest_price === "number"
    ? apiClock.latest_price
    : Number.parseFloat(apiClock.latest_price ?? "0");

  return {
    id: String(apiClock.id),
    title: apiClock.title ?? "",
    description: apiClock.description ?? "",
    price,
    currency: apiClock.latest_currency ?? "EUR",
    island: apiClock.island_name ?? String(apiClock.island_id ?? ""),
    source: apiClock.source ?? "",
    publishedAt: apiClock.last_seen_at ?? apiClock.latest_price_captured_at ?? apiClock.first_seen_at ?? new Date().toISOString(),
    sourceUrl: apiClock.url ?? "",
    photos: Array.isArray(apiClock.photos)
      ? apiClock.photos
        .map((photo) => (typeof photo === "string" ? photo : photo?.url))
        .filter(Boolean)
      : [],
    priceHistory: Array.isArray(apiClock.price_history)
      ? apiClock.price_history.map((entry) => ({
        date: entry.captured_at ?? entry.date ?? new Date().toISOString(),
        price: typeof entry.price === "number" ? entry.price : price
      }))
      : []
  };
}

function matchesReference(clockTitle, reference) {
  const normalizedTitle = clockTitle.toLowerCase();
  const brandMatch = !reference.brand || normalizedTitle.includes(reference.brand.toLowerCase());
  const keywordMatch = (reference.keywords || []).length === 0
    ? true
    : reference.keywords.some((keyword) => normalizedTitle.includes(keyword.toLowerCase()));

  return brandMatch && keywordMatch;
}

function buildNegotiationMessage(clock, config) {
  const discount = config.negotiationDiscount ?? 0.1;
  const offerPrice = Math.max(0, Math.round(clock.price * (1 - discount)));
  const template = (config.negotiationTemplates?.[0])
    || "Hola, ¿aceptarías {offerPrice}€? Estoy listo para cerrar hoy.";

  return template
    .replace("{offerPrice}", offerPrice)
    .replace("{price}", clock.price)
    .replace("{title}", clock.title);
}

function rankOpportunities(opportunities, config) {
  const sorted = [...opportunities].sort((a, b) => b.discountRatio - a.discountRatio);
  return sorted.slice(0, config.analysis?.maxResults ?? 5);
}

function detectPriceDrop(clock) {
  if (!Array.isArray(clock.priceHistory) || clock.priceHistory.length < 2) return null;

  const sorted = [...clock.priceHistory]
    .filter((entry) => Number.isFinite(entry.price))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  if (sorted.length < 2) return null;

  const previous = sorted[sorted.length - 2];
  const latest = sorted[sorted.length - 1];
  if (latest.price >= previous.price || previous.price <= 0) return null;

  const dropAmount = previous.price - latest.price;
  const dropRatio = dropAmount / previous.price;

  return {
    clockId: clock.id,
    title: clock.title,
    island: clock.island,
    source: clock.source,
    sourceUrl: clock.sourceUrl,
    currency: clock.currency,
    previousPrice: previous.price,
    currentPrice: latest.price,
    dropAmount,
    dropRatio,
    dropPercent: Math.round(dropRatio * 100),
    detectedAt: new Date().toISOString()
  };
}

async function fetchClocks({ apiBase, pageSize = 200, maxPages = 5 }) {
  const clocks = [];
  for (let page = 1; page <= maxPages; page += 1) {
    const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
    const url = `${apiBase}?${params.toString()}`;
    const response = await fetch(url, { headers: getAuthHeaders() });
    if (!response.ok) {
      throw new Error(`API error ${response.status} on page ${page}`);
    }

    const data = await response.json();
    const pageData = Array.isArray(data) ? data : data.data;
    if (!Array.isArray(pageData) || pageData.length === 0) break;

    clocks.push(...pageData.map(normalizeClock));

    if (Array.isArray(data)) break;
    if (page >= (data.totalPages ?? page)) break;
  }

  return clocks;
}

function buildOpportunity(clock, reference, config) {
  const marketPrice = reference.marketPrice;
  const discountRatio = marketPrice > 0 ? 1 - clock.price / marketPrice : 0;

  return {
    clockId: clock.id,
    title: clock.title,
    price: clock.price,
    currency: clock.currency,
    sourceUrl: clock.sourceUrl,
    island: clock.island,
    source: clock.source,
    marketPrice,
    marketSources: reference.sources ?? [],
    discountRatio,
    negotiationMessage: buildNegotiationMessage(clock, config),
    detectedAt: new Date().toISOString()
  };
}

function shouldInclude(clock, reference, config) {
  if (config.highRotationBrands?.length) {
    const title = clock.title.toLowerCase();
    const matchesBrand = config.highRotationBrands.some((brand) => title.includes(brand.toLowerCase()));
    if (!matchesBrand) return false;
  }

  const minDiscountRatio = config.analysis?.minDiscountRatio ?? 1.0;
  if (reference.marketPrice <= 0) return false;
  return clock.price <= reference.marketPrice * minDiscountRatio;
}

async function main() {
  const apiBase = process.env.CLOCKS_API_BASE || DEFAULT_API_BASE;
  const outputDir = process.env.OPPORTUNITY_OUTPUT_DIR || DEFAULT_OUTPUT_DIR;
  const config = await loadJson(CONFIG_PATH);
  const references = await loadJson(REFERENCE_PATH);

  const clocks = await fetchClocks({
    apiBase,
    pageSize: config.analysis?.pageSize ?? 200,
    maxPages: config.analysis?.maxPages ?? 5
  });

  const opportunities = [];
  const priceDrops = [];

  for (const clock of clocks) {
    const drop = detectPriceDrop(clock);
    if (drop) {
      priceDrops.push(drop);
    }

    for (const reference of references) {
      if (!matchesReference(clock.title, reference)) continue;
      if (!shouldInclude(clock, reference, config)) continue;

      opportunities.push(buildOpportunity(clock, reference, config));
      break;
    }
  }

  const topOpportunities = rankOpportunities(opportunities, config);

  const report = {
    generatedAt: new Date().toISOString(),
    totalClocks: clocks.length,
    totalMatches: opportunities.length,
    totalPriceDrops: priceDrops.length,
    topOpportunities,
    opportunities,
    priceDrops
  };

  await fs.mkdir(outputDir, { recursive: true });
  const latestPath = path.join(outputDir, "opportunities-latest.json");
  const datedPath = path.join(outputDir, `opportunities-${new Date().toISOString().slice(0, 10)}.json`);

  await fs.writeFile(latestPath, JSON.stringify(report, null, 2));
  await fs.writeFile(datedPath, JSON.stringify(report, null, 2));

  console.log(`✅ Report generated: ${latestPath}`);
  console.log(`Total opportunities: ${opportunities.length}`);
}

main().catch((error) => {
  console.error("❌ Opportunity scan failed:", error);
  process.exit(1);
});
