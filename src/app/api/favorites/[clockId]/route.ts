import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * DELETE /api/favorites/[clockId]
 * Elimina un reloj de favoritos
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { clockId: string } }
) {
  try {
    // TODO: Autenticación
    const userId = 1; // Hardcoded para desarrollo

    const clockId = params.clockId;

    const favorite = await prisma.favorite.delete({
      where: {
        userId_clockId: {
          userId,
          clockId,
        },
      },
    });

    return NextResponse.json({ data: favorite });
  } catch (error) {
    console.error('Error deleting favorite:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
