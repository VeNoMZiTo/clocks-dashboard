import { getAllClocks } from "@/lib/clocks";
import ClocksTable from "@/components/clocks/ClocksTable";

export default function ClocksDashboardPage() {
  const clocks = getAllClocks();

  return <ClocksTable clocks={clocks} />;
}
