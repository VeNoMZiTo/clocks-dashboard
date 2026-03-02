import { notFound } from "next/navigation";
import { getClockById } from "@/lib/clocks";
import ClockDetailClient from "@/components/clocks/ClockDetailClient";

export default function ClockDetailPage({ params }: { params: { id: string } }) {
  const clock = getClockById(params.id);

  if (!clock) {
    notFound();
  }

  return <ClockDetailClient clock={clock} />;
}
