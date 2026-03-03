# Clocks Dashboard

## Local development

```bash
npm install
npm run dev
```

App runs at http://localhost:3000

## Docker (development)

```bash
npm run docker:dev
```

- App: http://localhost:3000
- Postgres: localhost:5432 (user/pass/db: postgres)

## Docker (production)

```bash
npm run docker:build
npm run docker:prod
```

Nginx will expose the app on http://localhost:80

### Environment variables

- `DATABASE_URL` (set in compose files by default)
- `NODE_ENV` (development/production)

### Notes

- Production image uses Next.js standalone output (multi-stage build)
- Nginx is configured as a reverse proxy to the app container

## Sistema nocturno de oportunidades

Ver la guía en `docs/opportunities.md` para configurar el análisis nocturno y la notificación por Telegram.
