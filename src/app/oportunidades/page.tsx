import { readFile } from "node:fs/promises";
import path from "node:path";
import OpportunitiesTable from "@/components/clocks/OpportunitiesTable";
import { getAllClocks } from "@/lib/clocks";
import type { OpportunitiesReport } from "@/lib/opportunities";

async function loadOpportunities(): Promise<OpportunitiesReport | null> {
  try {
    const filePath = path.join(process.cwd(), "data", "opportunities-latest.json");
    const raw = await readFile(filePath, "utf-8");
    return JSON.parse(raw) as OpportunitiesReport;
  } catch (error) {
    console.warn("No opportunities report found", error);
    return null;
  }
}

export default async function OpportunitiesPage() {
  const report = await loadOpportunities();
  const opportunities = report?.opportunities ?? report?.topOpportunities ?? [];

  const clocks = opportunities.length ? await getAllClocks() : [];
  const clocksById = clocks.reduce<Record<string, typeof clocks[number]>>((acc, clock) => {
    acc[clock.id] = clock;
    return acc;
  }, {});

  return (
    <OpportunitiesTable
      opportunities={opportunities}
      clocksById={clocksById}
    />
  );
}
