# Northeast US Heat-Cool Savings Portal

Temperature monitoring and alerting system that tracks forecasted temperature fluctuations in cities (starting with NYC) and supports configurable alert rules. **Milestone 1** delivers core architecture, weather integration, and admin configuration.

## Milestone 1 Scope

- **Project setup**: Vercel cloud infrastructure, database, storage
- **City and building structure**: Initial NYC configuration; manage cities and buildings
- **National Weather Service**: Hourly forecast data integration
- **Configurable alert logic**: Temperature-change threshold and time window per city
- **Admin configuration**: Configure alert rules and NWS settings per city
- **Database**: Cities, buildings, recipients, alert logs
- **Alert events**: System detects forecast-based temperature changes and creates alert events
- **Daily summary**: Average, min, max temperature and change from previous day

## Key Features (MS-1)

### Temperature Monitoring & Alerts

- **Hourly Forecast Integration**: NWS API for hourly temperature forecasts
- **Configurable Alert Logic**: Adjustable temperature change thresholds (e.g. 5–10°F) and time windows (e.g. 3–12 hours)
- **Proactive Alerts**: Based on forecasted temperatures
- **Daily Summaries**: Daily temperature summaries
- **City-Level Configuration**: Each city has its own alert rules

### Admin

- Configure cities, buildings, and recipients
- Set NWS office code and alert parameters per city
- View recent alerts

## Tech Stack

- **Stack**: Next.js 16 (App Router), Vercel Postgres (PostgreSQL)
- **Weather**: National Weather Service (NWS) API

### Project Structure (MS-1 relevant)

```
src/
├── app/
│   ├── api/
│   │   ├── auth/         # Login
│   │   ├── cities/       # City CRUD & config
│   │   ├── buildings/    # Building management
│   │   ├── weather/      # Forecast
│   │   └── admin/        # City config (alert rules)
│   └── (pages)           # Admin UI, weather
├── lib/
│   ├── db/               # Database client and schema
│   ├── services/         # Alert/weather logic
│   └── controllers/      # Request handlers
└── types/
```

## API Endpoints (MS-1)

### Auth

- `POST /api/auth/login` — User login

### Cities

- `GET /api/cities` — List cities
- `GET /api/cities/[id]` — Get city
- `PUT /api/cities/[id]` — Update city
- `GET /api/admin/cities/[id]/config` — Get city alert config
- `PUT /api/admin/cities/[id]/config` — Update city alert config

### Buildings

- `GET /api/buildings` — List buildings
- `GET /api/buildings/[id]` — Get building
- `POST /api/buildings` — Create building (Admin)

### Weather

- `GET /api/weather/forecast/[cityId]` — Hourly forecast for city

### Cron (MS-1)

- `POST /api/cron/check-alerts` — Check for temperature fluctuations
- `POST /api/cron/daily-summary` — Send daily summaries

## Environment Variables

```env
# Database
POSTGRES_URL=
POSTGRES_PRISMA_URL=
POSTGRES_URL_NON_POOLING=

# Auth
JWT_SECRET=

# Weather
NWS_API_BASE=https://api.weather.gov

# App
NEXT_PUBLIC_APP_URL=

# Cron
CRON_SECRET=
```

## Getting Started

1. Install: `npm install`
2. Set up Vercel Postgres and add env vars above
3. Run schema: `psql $POSTGRES_URL < src/lib/db/schema.sql`
4. Seed (optional): `npm run db:seed`
5. Dev: `npm run dev`

### Scripts

| Command              | Description             |
| -------------------- | ----------------------- |
| `npm run dev`        | Start dev server        |
| `npm run build`      | Production build        |
| `npm run start`      | Start production server |
| `npm run lint`       | Run ESLint              |
| `npm run db:migrate` | Print migration command |
| `npm run db:seed`    | Seed database           |
| `npm run test:ms1`   | Run Milestone 1 tests   |

## Project Status

**Milestone 1** — Database done (cities, buildings, recipients). Admin UI in place: Cities, Buildings, and Recipients data can be viewed and edited; Dashboard shows weather and recent alerts. See [docs/MS1_PROGRESS.md](docs/MS1_PROGRESS.md) for a short progress summary and where to add screenshots.

## License

Private project — All rights reserved.
