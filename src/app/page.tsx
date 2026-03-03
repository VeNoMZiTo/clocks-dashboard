import { Suspense } from "react";
import ClocksTable from "@/components/clocks/ClocksTable";
import { fetchClocks } from "@/lib/clocks";

function ClocksTableSkeleton() {
  return (
    <main className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">
            🕐 Watch Dashboard
          </h1>
          <div className="mt-2 h-4 w-32 animate-pulse rounded bg-zinc-300 dark:bg-zinc-700" />
        </header>
        <div className="h-96 animate-pulse rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900" />
      </div>
    </main>
  );
}

export default async function Home() {
  const response = await fetchClocks({ pageSize: 200, archived: false });

  return (
    <Suspense fallback={<ClocksTableSkeleton />}>
      <main className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <header className="mb-8">
            <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">
              🕐 Watch Dashboard
            </h1>
            <p className="mt-2 text-zinc-600 dark:text-zinc-400">
              {response.total} relojes encontrados
            </p>
          </header>

          <ClocksTable
            clocks={response.data}
            totalClocks={response.total}
            totalPages={response.totalPages}
            pageSize={response.pageSize}
          />
        </div>
      </main>
    </Suspense>
  );
}
