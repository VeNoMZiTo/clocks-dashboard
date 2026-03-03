#!/usr/bin/env node

const fs = await import("node:fs/promises");
const path = await import("node:path");

const OUTPUT_DIR = new URL("../data/", import.meta.url).pathname;
const REPORT_PATH = process.env.OPPORTUNITY_REPORT_PATH
  || path.join(OUTPUT_DIR, "opportunities-latest.json");

const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

function formatOpportunity(opportunity, index) {
  const discountPct = Math.round(opportunity.discountRatio * 100);
  return [
    `#${index + 1} • ${opportunity.title}`,
    `Precio: ${opportunity.price} ${opportunity.currency}`,
    `Mercado: ${opportunity.marketPrice} ${opportunity.currency} (${discountPct}% debajo)`,
    `Fuente: ${opportunity.source}`,
    opportunity.sourceUrl ? `Link: ${opportunity.sourceUrl}` : null,
    opportunity.negotiationMessage ? `Mensaje sugerido: ${opportunity.negotiationMessage}` : null
  ].filter(Boolean).join("\n");
}

async function sendTelegramMessage(text) {
  if (!TELEGRAM_TOKEN || !TELEGRAM_CHAT_ID) {
    console.warn("⚠️ TELEGRAM_BOT_TOKEN o TELEGRAM_CHAT_ID no configurados. Mostrando mensaje en consola.");
    console.log(text);
    return;
  }

  const url = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: TELEGRAM_CHAT_ID,
      text,
      disable_web_page_preview: true
    })
  });

  if (!response.ok) {
    throw new Error(`Telegram error ${response.status}`);
  }
}

async function main() {
  const raw = await fs.readFile(REPORT_PATH, "utf-8");
  const report = JSON.parse(raw);
  const opportunities = report.topOpportunities ?? [];

  if (opportunities.length === 0) {
    await sendTelegramMessage("🕵️‍♂️ No se detectaron oportunidades destacadas hoy.");
    return;
  }

  const header = `🕵️‍♂️ Oportunidades destacadas (${opportunities.length})`;
  const body = opportunities.map(formatOpportunity).join("\n\n");
  const footer = `Generado: ${new Date(report.generatedAt).toLocaleString("es-ES")}`;

  const message = [header, body, footer].join("\n\n");
  await sendTelegramMessage(message);
  console.log("✅ Telegram notification sent.");
}

main().catch((error) => {
  console.error("❌ Opportunity notify failed:", error);
  process.exit(1);
});
