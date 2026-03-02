# Clocks Dashboard - Contexto del Proyecto

## Descripción
Dashboard para gestión de relojes scrapteados desde Wallapop/MilAnuncios.

## Stack
- **Framework:** Next.js 16+ con App Router
- **Lenguaje:** TypeScript
- **Estilos:** Tailwind CSS 4
- **Base de datos:** PostgreSQL
- **ORM:** Prisma

## APIs Externas
- **Base URL:** `https://automation.dimensiontei.com/webhook/clocks`
- **Archive URL:** `https://automation.dimensiontei.com/webhook/archive-item`
- **Auth:** Basic Auth (relojes / nnS4MDu9DcJb)

## Estructura del Proyecto
```
src/
├── app/
│   ├── page.tsx              # Home (placeholder)
│   ├── layout.tsx            # Layout principal
│   ├── globals.css           # Estilos globales
│   ├── clocks/
│   │   └── [id]/page.tsx     # Detalle de reloj
│   └── api/
│       ├── clocks/[id]/      # API relojes
│       ├── favorites/        # API favoritos
│       └── notes/            # API notas
├── components/
│   └── clocks/               # Componentes relojes
├── lib/
│   ├── clocks.ts             # Lógica relojes
│   ├── favorites.ts          # Lógica favoritos
│   └── notes.ts              # Lógica notas
└── types/                    # Tipos TypeScript

## Funcionalidades
- [x] Vista cards con fotos
- [x] Vista detalle con galería
- [x] Sistema de favoritos
- [x] Sistema de notas
- [ ] Vista lista/tabla con filtros
- [ ] Docker producción

## Notas Importantes
- Este es un proyecto SEPARADO de elatico
- Ubicación: `~/.openclaw/workspace/clocks-dashboard/`
- GitHub: https://github.com/VeNoMZiTo/clocks-dashboard
