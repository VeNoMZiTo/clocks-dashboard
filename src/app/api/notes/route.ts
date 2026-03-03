import { NextRequest, NextResponse } from "next/server";
import { verifyAccessToken, extractBearerToken } from "@/lib/auth";
import { getNotesByUser } from "@/lib/notes";

/**
 * GET /api/notes
 * Returns all notes for the current user
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

  const notes = await getNotesByUser(tokenData.id);

  return NextResponse.json({
    ok: true,
    notes
  });
}
