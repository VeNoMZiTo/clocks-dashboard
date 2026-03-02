import { NextRequest, NextResponse } from "next/server";
import { verifyAccessToken, extractBearerToken } from "@/lib/auth";
import { getAllTags, createTag } from "@/lib/notes";

/**
 * GET /api/notes/tags
 * Returns all available tags
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

  const tokenData = verifyAccessToken(token);
  if (!tokenData) {
    return NextResponse.json(
      { error: "Token inválido o expirado." },
      { status: 401 }
    );
  }

  const tags = await getAllTags();

  return NextResponse.json({
    ok: true,
    tags
  });
}

/**
 * POST /api/notes/tags
 * Create a new tag
 *
 * Body: { name: string, color?: string }
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

  const { name, color } = body;

  if (!name || typeof name !== 'string') {
    return NextResponse.json(
      { error: "name es requerido" },
      { status: 400 }
    );
  }

  try {
    const tag = await createTag(name, color);
    return NextResponse.json({
      ok: true,
      tag
    });
  } catch (error: any) {
    // Handle unique constraint violation
    if (error?.code === '23505') {
      return NextResponse.json(
        { error: "Ya existe una etiqueta con ese nombre" },
        { status: 409 }
      );
    }
    throw error;
  }
}
