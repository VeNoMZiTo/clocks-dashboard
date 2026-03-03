# Sistema nocturno de búsqueda de oportunidades

Este sistema analiza relojes cada madrugada y genera un reporte con oportunidades de compra por debajo del mercado.

## Configuración

- `data/opportunity-config.json`: reglas, marcas de alta rotación, horarios.
- `data/opportunity-reference.json`: precios de referencia (eBay/Chrono24/segunda mano).

## Scripts

### 1) Análisis nocturno (03:00)

```bash
node scripts/opportunity-scan.mjs
```

Genera:
- `data/opportunities-latest.json`
- `data/opportunities-YYYY-MM-DD.json`

### 2) Notificación Telegram (08:00)

```bash
TELEGRAM_BOT_TOKEN=... TELEGRAM_CHAT_ID=... node scripts/opportunity-notify.mjs
```

## Variables de entorno

- `CLOCKS_API_BASE` (opcional)
- `CLOCKS_API_USER` (opcional)
- `CLOCKS_API_PASS` (opcional)
- `OPPORTUNITY_OUTPUT_DIR` (opcional)
- `TELEGRAM_BOT_TOKEN` (para enviar mensajes)
- `TELEGRAM_CHAT_ID`

## Cron sugerido

```cron
# Análisis 03:00
0 3 * * * /usr/bin/node /ruta/clocks-dashboard/scripts/opportunity-scan.mjs

# Notificación 08:00
0 8 * * * TELEGRAM_BOT_TOKEN=XXX TELEGRAM_CHAT_ID=YYY /usr/bin/node /ruta/clocks-dashboard/scripts/opportunity-notify.mjs
```
