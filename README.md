# Clocks Dashboard

Dashboard para visualizar y gestionar relojes en Canarias.

## Stack

- **Next.js 14+** con App Router y TypeScript
- **PostgreSQL 16** para base de datos
- **Prisma** como ORM
- **Tailwind CSS** para estilos
- **Docker Compose** para desarrollo

## Inicio Rápido

### Con Docker Compose (Recomendado)

1. Copiar variables de entorno:
```bash
cp .env.example .env
```

2. Levantar servicios:
```bash
docker-compose up -d
```

3. Inicializar base de datos:
```bash
docker-compose exec app npx prisma db push
```

4. Abrir [http://localhost:3000](http://localhost:3000)

### Desarrollo Local

1. Instalar dependencias:
```bash
npm install
```

2. Configurar base de datos PostgreSQL y actualizar `.env`

3. Inicializar Prisma:
```bash
npm run db:push
```

4. Iniciar servidor de desarrollo:
```bash
npm run dev
```

## Scripts Disponibles

- `npm run dev` - Servidor de desarrollo
- `npm run build` - Build de producción
- `npm run start` - Servidor de producción
- `npm run lint` - Linter
- `npm run db:generate` - Generar cliente Prisma
- `npm run db:push` - Sincronizar schema con BD
- `npm run db:migrate` - Crear migración
- `npm run db:studio` - Abrir Prisma Studio

## API Externa

El dashboard se conecta a una API externa (n8n) para obtener datos de relojes:

- **Base URL**: `https://automation.dimensiontei.com/webhook/clocks`
- **Archive URL**: `https://automation.dimensiontei.com/webhook/archive-item`
- **Auth**: Basic Auth (ver `.env.example`)

## Estructura del Proyecto

```
clocks-dashboard/
├── src/
│   ├── app/           # Next.js App Router
│   ├── components/    # Componentes React
│   ├── lib/           # Utilidades y servicios
│   └── types/         # Tipos TypeScript
├── prisma/
│   └── schema.prisma  # Schema de base de datos
├── docker-compose.yml
├── Dockerfile
└── package.json
```

## Licencia

MIT
