import ClocksTable from "@/components/clocks/ClocksTable";
import { fetchClocks } from "@/lib/clocks";

export default async function Home() {
  const response = await fetchClocks({ pageSize: 50, archived: false });
  
  return (
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
        
        <ClocksTable clocks={response.data} />
      </div>
    </main>
  );
}
