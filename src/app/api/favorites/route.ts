import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * GET /api/favorites
 * Obtiene la lista de favoritos del usuario
 */
export async function GET(request: NextRequest) {
  try {
    // TODO: Autenticación - obtener userId de JWT o sesión
    const userId = 1; // Hardcoded para desarrollo

    const favorites = await prisma.favorite.findMany({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ data: favorites });
  } catch (error) {
    console.error('Error fetching favorites:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/favorites
 * Añade un reloj a favoritos
 */
export async function POST(request: NextRequest) {
  try {
    // TODO: Autenticación
    const userId = 1; // Hardcoded para desarrollo

    const body = await request.json();
    const { clockId } = body;

    if (!clockId) {
      return NextResponse.json(
        { error: 'clockId is required' },
        { status: 400 }
      );
    }

    // Verificar si ya existe
    const existing = await prisma.favorite.findUnique({
      where: {
        userId_clockId: {
          userId,
          clockId,
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Clock already in favorites' },
        { status: 409 }
      );
    }

    const favorite = await prisma.favorite.create({
      data: {
        userId,
        clockId,
      },
    });

    return NextResponse.json({ data: favorite }, { status: 201 });
  } catch (error) {
    console.error('Error creating favorite:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
