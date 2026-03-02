import { NextRequest, NextResponse } from "next/server";
import { getClockById } from "@/lib/clocks";

interface RouteParams {
  params: {
    id: string;
  };
}

/**
 * GET /api/clocks/[id]
 * Returns clock detail by id
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  const clock = getClockById(params.id);

  if (!clock) {
    return NextResponse.json(
      { error: "Reloj no encontrado" },
      { status: 404 }
    );
  }

  return NextResponse.json({
    ok: true,
    clock
  });
}
