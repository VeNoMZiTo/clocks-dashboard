import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * GET /api/notes/[clockId]
 * Obtiene la nota de un reloj
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { clockId: string } }
) {
  try {
    // TODO: Autenticación
    const userId = 1; // Hardcoded para desarrollo

    const clockId = params.clockId;

    const note = await prisma.note.findUnique({
      where: {
        userId_clockId: {
          userId,
          clockId,
        },
      },
      include: {
        tags: {
          include: {
            tag: true,
          },
        },
      },
    });

    if (!note) {
      return NextResponse.json({ data: null });
    }

    return NextResponse.json({ data: note });
  } catch (error) {
    console.error('Error fetching note:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/notes/[clockId]
 * Crea o actualiza la nota de un reloj
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { clockId: string } }
) {
  try {
    // TODO: Autenticación
    const userId = 1; // Hardcoded para desarrollo

    const clockId = params.clockId;
    const body = await request.json();
    const { content, tags } = body;

    if (content === undefined) {
      return NextResponse.json(
        { error: 'content is required' },
        { status: 400 }
      );
    }

    // Verificar si ya existe
    const existing = await prisma.note.findUnique({
      where: {
        userId_clockId: {
          userId,
          clockId,
        },
      },
    });

    let note;

    if (existing) {
      // Actualizar nota existente
      note = await prisma.note.update({
        where: {
          userId_clockId: {
            userId,
            clockId,
          },
        },
        data: {
          content,
        },
      });

      // Eliminar tags existentes y crear nuevos si se proporcionaron
      if (tags) {
        await prisma.noteTag.deleteMany({
          where: { noteId: note.id },
        });

        // Crear nuevos tags
        for (const tagData of tags) {
          const tag = await prisma.tag.upsert({
            where: { name: tagData.name },
            update: {},
            create: {
              name: tagData.name,
              color: tagData.color || '#3B82F6',
            },
          });

          await prisma.noteTag.create({
            data: {
              noteId: note.id,
              tagId: tag.id,
            },
          });
        }
      }
    } else {
      // Crear nueva nota
      note = await prisma.note.create({
        data: {
          userId,
          clockId,
          content,
        },
      });

      // Crear tags si se proporcionaron
      if (tags && tags.length > 0) {
        for (const tagData of tags) {
          const tag = await prisma.tag.upsert({
            where: { name: tagData.name },
            update: {},
            create: {
              name: tagData.name,
              color: tagData.color || '#3B82F6',
            },
          });

          await prisma.noteTag.create({
            data: {
              noteId: note.id,
              tagId: tag.id,
            },
          });
        }
      }
    }

    // Devolver nota con tags
    const noteWithTags = await prisma.note.findUnique({
      where: { id: note.id },
      include: {
        tags: {
          include: {
            tag: true,
          },
        },
      },
    });

    return NextResponse.json({ data: noteWithTags });
  } catch (error) {
    console.error('Error saving note:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/notes/[clockId]
 * Elimina la nota de un reloj
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { clockId: string } }
) {
  try {
    // TODO: Autenticación
    const userId = 1; // Hardcoded para desarrollo

    const clockId = params.clockId;

    const note = await prisma.note.delete({
      where: {
        userId_clockId: {
          userId,
          clockId,
        },
      },
    });

    return NextResponse.json({ data: note });
  } catch (error) {
    console.error('Error deleting note:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
