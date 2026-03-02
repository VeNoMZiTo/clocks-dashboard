import { NextRequest, NextResponse } from "next/server";
import { verifyAccessToken, extractBearerToken } from "@/lib/auth";
import { getNoteByUserAndClock, upsertNote, deleteNote } from "@/lib/notes";

interface RouteParams {
  params: {
    clockId: string;
  };
}

/**
 * GET /api/notes/[clockId]
 * Get the current user's note for a specific clock
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
  const note = await getNoteByUserAndClock(tokenData.userId, clockId);

  if (!note) {
    return NextResponse.json(
      { error: "Nota no encontrada" },
      { status: 404 }
    );
  }

  return NextResponse.json({
    ok: true,
    note
  });
}

/**
 * POST /api/notes/[clockId]
 * Create or update a note for a clock
 *
 * Body: { content: string, tagIds?: string[] }
 * Requires Authorization: Bearer <accessToken>
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
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

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "JSON inválido" },
      { status: 400 }
    );
  }

  const { clockId } = params;
  const { content, tagIds } = body;

  if (!content || typeof content !== 'string') {
    return NextResponse.json(
      { error: "content es requerido" },
      { status: 400 }
    );
  }

  const note = await upsertNote(tokenData.userId, clockId, content, tagIds);

  return NextResponse.json({
    ok: true,
    note
  });
}

/**
 * DELETE /api/notes/[clockId]
 * Delete the note for a clock
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
  const removed = await deleteNote(tokenData.userId, clockId);

  if (!removed) {
    return NextResponse.json(
      { error: "Nota no encontrada" },
      { status: 404 }
    );
  }

  return NextResponse.json({
    ok: true,
    message: "Nota eliminada"
  });
}
