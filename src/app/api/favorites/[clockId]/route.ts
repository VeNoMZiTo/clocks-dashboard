import { NextRequest, NextResponse } from "next/server";
import { verifyAccessToken, extractBearerToken } from "@/lib/auth";
import { removeFavorite, isFavorite } from "@/lib/favorites";

interface RouteParams {
  params: {
    clockId: string;
  };
}

/**
 * DELETE /api/favorites/[clockId]
 * Remove a clock from favorites
 *
 * Requires Authorization: Bearer <accessToken>
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const authHeader = request.headers.get("authorization");
  const token = extractBearerToken(authHeader);

  if (!token) {
    return NextResponse.json(
      { error: "No autorizado. Token requerido." },
      { status: 401 }
    );
  }

  const tokenData = verifyAccessToken(token);
  if (!tokenData) {
    return NextResponse.json(
      { error: "Token inválido o expirado." },
      { status: 401 }
    );
  }

  const { clockId } = params;

  if (!clockId) {
    return NextResponse.json(
      { error: "clockId es requerido" },
      { status: 400 }
    );
  }

  const removed = await removeFavorite(tokenData.userId, clockId);

  if (!removed) {
    return NextResponse.json(
      { error: "Favorito no encontrado" },
      { status: 404 }
    );
  }

  return NextResponse.json({
    ok: true,
    message: "Favorito eliminado"
  });
}

/**
 * GET /api/favorites/[clockId]
 * Check if a clock is favorited by the current user
 *
 * Requires Authorization: Bearer <accessToken>
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const authHeader = request.headers.get("authorization");
  const token = extractBearerToken(authHeader);

  if (!token) {
    return NextResponse.json(
      { error: "No autorizado. Token requerido." },
      { status: 401 }
    );
  }

  const tokenData = verifyAccessToken(token);
  if (!tokenData) {
    return NextResponse.json(
      { error: "Token inválido o expirado." },
      { status: 401 }
    );
  }

  const { clockId } = params;
  const favorited = await isFavorite(tokenData.userId, clockId);

  return NextResponse.json({
    ok: true,
    favorited
  });
}
