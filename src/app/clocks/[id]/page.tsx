import { notFound } from "next/navigation";
import { getClockById } from "@/lib/clocks";
import ClockDetailClient from "@/components/clocks/ClockDetailClient";

export default async function ClockDetailPage({ params }: { params: { id: string } }) {
  const clock = await getClockById(params.id);

  if (!clock) {
    notFound();
  }

  return <ClockDetailClient clock={clock} />;
}
