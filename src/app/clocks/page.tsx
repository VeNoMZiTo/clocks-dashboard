import ClocksTable from "@/components/clocks/ClocksTable";
import { fetchClocks } from "@/lib/clocks";

export default async function ClocksPage() {
  const response = await fetchClocks({ pageSize: 50, archived: false });

  return (
    <ClocksTable
      clocks={response.data}
      totalClocks={response.total}
      totalPages={response.totalPages}
      pageSize={response.pageSize}
    />
  );
}
