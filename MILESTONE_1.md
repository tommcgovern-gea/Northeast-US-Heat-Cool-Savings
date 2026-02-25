# Milestone 1: Core Architecture & Weather Alert Engine

## Status: ✅ Completed

## Deliverables

### ✅ Project Setup
- Next.js 16 project configured for Vercel deployment
- Database schema created (PostgreSQL via Vercel Postgres)
- Database client with TypeScript types
- Environment variable configuration

### ✅ City and Building Structure
- Database tables for cities, buildings, recipients, users, alert logs, messages, photo uploads, and temperature snapshots
- Initial NYC configuration ready (seed script available)
- City management API endpoints (GET, POST, PUT, DELETE)

### ✅ National Weather Service Integration
- Hourly forecast fetching from NWS API
- Fallback mock data for development/testing
- Forecast data structure for 24-hour projections
- Integration with city-specific NWS grid coordinates

### ✅ Configurable Alert Logic
- **Adjustable degree change threshold**: Configurable per city (default: 5°F)
- **Adjustable time window threshold**: Configurable per city (default: 6 hours)
- **Sudden fluctuation detection**: Compares forecasted temperature changes within the time window
- **Daily summary calculation**: Calculates average, min, max temperatures and change from previous day

### ✅ Admin Capability to Configure Rules Per City
- Admin API endpoint: `GET /api/admin/cities/[id]/config`
- Admin API endpoint: `PUT /api/admin/cities/[id]/config`
- City configuration includes:
  - Alert temperature delta (degrees)
  - Alert window hours
  - NWS office and grid coordinates

### ✅ Database Structure
All required tables implemented:
- **cities**: City configuration with NWS coordinates and alert thresholds
- **buildings**: Building information linked to cities
- **recipients**: Contact information and preferences
- **users**: Admin, staff, and building user accounts
- **alert_logs**: Alert events with temperature data and thresholds
- **messages**: Message history (ready for Milestone 2)
- **photo_uploads**: Photo upload tracking (ready for Milestone 2)
- **temperature_snapshots**: Historical temperature data for daily summaries

## API Endpoints

### Cities Management
- `GET /api/cities` - List all cities (Admin only)
- `POST /api/cities` - Create new city (Admin only)
- `PUT /api/cities/[id]` - Update city (Admin only)
- `DELETE /api/cities/[id]` - Soft delete city (Admin only)

### City Configuration
- `GET /api/admin/cities/[id]/config` - Get city alert configuration (Admin only)
- `PUT /api/admin/cities/[id]/config` - Update city alert configuration (Admin only)

### Weather
- `GET /api/weather/forecast/[cityId]` - Get hourly forecast for city (Authenticated)

### Cron Jobs
- `POST /api/cron/check-alerts` - Check for temperature fluctuations (requires CRON_SECRET)
- `POST /api/cron/daily-summary` - Generate daily temperature summaries (requires CRON_SECRET)

## Database Schema

See `src/lib/db/schema.sql` for complete schema definition.

Key tables:
- Cities with NWS grid coordinates and alert thresholds
- Buildings linked to cities
- Alert logs with temperature data and threshold information
- Temperature snapshots for historical tracking

## Setup Instructions

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up Vercel Postgres:**
   - Create a Postgres database in Vercel
   - Copy connection strings to `.env.local`

3. **Run database migration:**
   ```bash
   # Connect to your database and run:
   psql $POSTGRES_URL < src/lib/db/schema.sql
   ```

4. **Seed initial data (optional):**
   ```bash
   # Run the seed script to create NYC city
   npm run seed
   ```

5. **Configure environment variables:**
   - Copy `.env.example` to `.env.local`
   - Fill in required values (especially `JWT_SECRET` and `CRON_SECRET`)

6. **Start development server:**
   ```bash
   npm run dev
   ```

## Testing

### Manual Testing
1. Create a city via `POST /api/cities` (Admin login required)
2. Configure alert thresholds via `PUT /api/admin/cities/[id]/config`
3. Trigger alert check via `POST /api/cron/check-alerts` (with CRON_SECRET header)
4. Verify alert logs created in database

### Cron Job Setup (Vercel)
Configure Vercel Cron Jobs:
- `check-alerts`: Run every hour
- `daily-summary`: Run once per day (e.g., 7 AM)

## Next Steps (Milestone 2)

- SMS integration (Twilio)
- Email integration (SendGrid)
- Message queue system
- Photo upload functionality
- Compliance tracking

## Notes

- Weather API integration includes fallback mock data for development
- All database operations use parameterized queries for security
- Alert logic is proactive (based on forecasts) not reactive
- System designed to scale to multiple cities and thousands of buildings
