import { Suspense } from "react";
import path from "node:path";
import { promises as fs } from "node:fs";
import ClocksTable from "@/components/clocks/ClocksTable";
import { fetchClocks } from "@/lib/clocks";
import type { OpportunitiesReport } from "@/lib/opportunities";

async function loadOpportunityIds(): Promise<string[]> {
  try {
    const filePath = path.join(process.cwd(), "data", "opportunities-latest.json");
    const raw = await fs.readFile(filePath, "utf-8");
    const report = JSON.parse(raw) as OpportunitiesReport;
    const opportunities = report?.opportunities ?? report?.topOpportunities ?? [];
    return opportunities.map((entry) => entry.clockId);
  } catch {
    return [];
  }
}

function ClocksTableSkeleton() {
  return (
    <div className="min-h-screen bg-black pb-24 text-white">
      <header className="border-b border-zinc-800 bg-zinc-950/80">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-6 py-6 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-emerald-400">
              Dashboard
            </p>
            <h1 className="mt-2 text-3xl font-semibold text-white">Relojes en seguimiento</h1>
          </div>
          <div className="h-12 w-48 animate-pulse rounded-xl bg-zinc-800" />
        </div>
      </header>
      <main className="mx-auto max-w-6xl space-y-6 px-6 py-8">
        <div className="h-96 animate-pulse rounded-2xl border border-zinc-800 bg-zinc-900" />
      </main>
    </div>
  );
}

export default async function ClocksPage() {
  const [response, opportunityIds] = await Promise.all([
    fetchClocks({ pageSize: 200, archived: false }),
    loadOpportunityIds()
  ]);

  return (
    <Suspense fallback={<ClocksTableSkeleton />}>
      <ClocksTable
        clocks={response.data}
        totalClocks={response.total}
        totalPages={response.totalPages}
        pageSize={response.pageSize}
        opportunityIds={opportunityIds}
      />
    </Suspense>
  );
}
