import { NextRequest, NextResponse } from "next/server";
import { verifyAccessToken, extractBearerToken } from "@/lib/auth";
import { getFavoritesByUser, addFavorite } from "@/lib/favorites";

/**
 * GET /api/favorites
 * Returns the current user's favorite clocks
 *
 * Requires Authorization: Bearer <accessToken>
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const token = extractBearerToken(authHeader);

  if (!token) {
    return NextResponse.json(
      { error: "No autorizado. Token requerido." },
      { status: 401 }
    );
  }

  const tokenData = await verifyAccessToken(token);
  if (!tokenData) {
    return NextResponse.json(
      { error: "Token inválido o expirado." },
      { status: 401 }
    );
  }

  const favorites = await getFavoritesByUser(tokenData.id);

  return NextResponse.json({
    ok: true,
    favorites
  });
}

/**
 * POST /api/favorites
 * Add a clock to favorites
 *
 * Body: { clockId: string }
 * Requires Authorization: Bearer <accessToken>
 */
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const token = extractBearerToken(authHeader);

  if (!token) {
    return NextResponse.json(
      { error: "No autorizado. Token requerido." },
      { status: 401 }
    );
  }

  const tokenData = await verifyAccessToken(token);
  if (!tokenData) {
    return NextResponse.json(
      { error: "Token inválido o expirado." },
      { status: 401 }
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "JSON inválido" },
      { status: 400 }
    );
  }

  const { clockId } = body;

  if (!clockId || typeof clockId !== 'string') {
    return NextResponse.json(
      { error: "clockId es requerido" },
      { status: 400 }
    );
  }

  const favorite = await addFavorite(tokenData.id, clockId);

  return NextResponse.json({
    ok: true,
    favorite
  });
}
