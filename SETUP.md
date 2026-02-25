# Setup Guide - Complete Project Setup

## Prerequisites

- Node.js 18+ installed
- npm or yarn package manager
- Vercel account (for database, storage, and deployment)
- Git repository
- Twilio account (for SMS - Milestone 2)
- SendGrid account (for Email - Milestone 2)

## Step-by-Step Setup

### 1. Install Dependencies

```bash
npm install
```

This will install:
- Next.js 16
- @neondatabase/serverless (database client)
- @vercel/blob (file storage)
- @sendgrid/mail (email service)
- twilio (SMS service)
- xlsx (Excel file processing)
- jsonwebtoken (authentication)
- TypeScript and related types

### 2. Set Up Neon Postgres Database

**Option A: Via Vercel (Recommended)**
1. Go to your Vercel dashboard
2. Navigate to **Storage** → **Create Database** → **Neon**
3. Create a new Neon database (or use existing if migrated from Vercel Postgres)
4. Copy the connection strings:
   - `POSTGRES_URL`
   - `POSTGRES_PRISMA_URL` (if available)
   - `POSTGRES_URL_NON_POOLING` (if available)

**Option B: Directly from Neon**
1. Sign up at [neon.tech](https://neon.tech)
2. Create a new project
3. Copy the connection string from the Neon dashboard
4. Use it as your `POSTGRES_URL`

**Note:** If you had an existing Vercel Postgres database, it should have been automatically migrated to Neon. Check your Vercel dashboard for the migrated Neon database.

### 3. Set Up Vercel Blob Storage

1. In Vercel dashboard, go to **Storage** → **Create Database** → **Blob**
2. Create a new Blob store
3. Copy the `BLOB_READ_WRITE_TOKEN`

### 4. Set Up Twilio (SMS - Milestone 2)

1. Sign up at [Twilio](https://www.twilio.com)
2. Get a phone number from Twilio
3. Copy your Account SID and Auth Token from the Twilio Console
4. Note your Twilio phone number (format: +1234567890)

### 5. Set Up SendGrid (Email - Milestone 2)

1. Sign up at [SendGrid](https://sendgrid.com)
2. Verify your sender email address
3. Create an API key in SendGrid Dashboard → Settings → API Keys
4. Copy the API key (starts with `SG.`)

### 6. Configure Environment Variables

Create a `.env.local` file in the root directory:

```bash
cp .env.example .env.local
```

Fill in all required values from `.env.example`. See the file for detailed descriptions.

**Important:** Generate secure random strings for `JWT_SECRET` and `CRON_SECRET`:
```bash
# Generate secrets
openssl rand -base64 32
```

### 7. Initialize Database Schema

Run all SQL schema files in order:

**Option A: Using psql command line**
```bash
# Base schema
psql $POSTGRES_URL < src/lib/db/schema.sql

# Milestone 3 additions (message templates)
psql $POSTGRES_URL < src/lib/db/schema-milestone3.sql

# Milestone 4 additions (energy savings)
psql $POSTGRES_URL < src/lib/db/schema-milestone4.sql
```

**Option B: Using a database GUI**
- Connect to your Vercel Postgres database
- Execute each SQL file in order:
  1. `src/lib/db/schema.sql`
  2. `src/lib/db/schema-milestone3.sql`
  3. `src/lib/db/schema-milestone4.sql`

**Option C: Using Vercel CLI**
```bash
vercel env pull .env.local
# Then connect to database and run all schema files
```

### 8. Create Initial Users

Create admin, staff, and building users in the database:

```sql
-- Create admin user (password: admin123 - CHANGE THIS!)
-- Use bcrypt to hash password: https://bcrypt-generator.com/
INSERT INTO users (email, password_hash, role) 
VALUES ('admin@example.com', '$2a$10$...', 'ADMIN');

-- Create staff user
INSERT INTO users (email, password_hash, role) 
VALUES ('staff@example.com', '$2a$10$...', 'STAFF');

-- Create building user (link to a building after creating one)
INSERT INTO users (email, password_hash, role, building_id) 
VALUES ('building@example.com', '$2a$10$...', 'BUILDING', 'building-uuid-here');
```

**Note:** Use a bcrypt hash generator to create password hashes. Never store plain text passwords.

### 9. Seed Initial Data (Optional)

Create initial NYC city configuration:

```sql
-- Insert NYC city
INSERT INTO cities (name, state, nws_office, nws_grid_x, nws_grid_y, alert_temp_delta, alert_window_hours, is_active)
VALUES ('New York', 'NY', 'OKX', 33, 35, 5.0, 6, true);
```

Or use the API after starting the server.

### 10. Start Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:3000`

## Verifying Setup

### 1. Check Database Connection

The database connection is tested when you make your first API call. Check the console for any connection errors.

### 2. Test Authentication

**Test login:**
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"admin123"}'
```

### 3. Test City Management (Milestone 1)

**Create a city:**
```bash
curl -X POST http://localhost:3000/api/cities \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "New York",
    "state": "NY",
    "nwsOffice": "OKX",
    "nwsGridX": 33,
    "nwsGridY": 35,
    "alertTempDelta": 5,
    "alertWindowHours": 6
  }'
```

### 4. Test Alert System (Milestone 1)

**Manually trigger alert check:**
```bash
curl -X POST http://localhost:3000/api/cron/check-alerts \
  -H "x-cron-secret: your-cron-secret-here"
```

### 5. Test Messaging (Milestone 2)

**Send pending messages:**
```bash
curl -X POST http://localhost:3000/api/cron/send-pending \
  -H "x-cron-secret: your-cron-secret-here"
```

**Note:** Requires Twilio and SendGrid to be configured.

### 6. Test Photo Upload (Milestone 2)

**Upload a photo:**
```bash
curl -X POST http://localhost:3000/api/upload \
  -F "token=<messageId>" \
  -F "file=@/path/to/image.jpg"
```

### 7. Test Templates (Milestone 3)

**Create a message template:**
```bash
curl -X POST http://localhost:3000/api/admin/templates \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "cityId": "<city-id>",
    "templateType": "alert",
    "content": "Alert for {{cityName}}: {{temperatureChange}}°F change"
  }'
```

### 8. Test Energy Upload (Milestone 4)

**Upload utility data:**
```bash
curl -X POST http://localhost:3000/api/staff/upload-utility \
  -H "Authorization: Bearer YOUR_STAFF_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "buildingId": "<building-id>",
    "month": 1,
    "year": 2024,
    "electricKWH": 10000,
    "gasTherms": 500,
    "totalKBTU": 1500
  }'
```

## Vercel Deployment

### 1. Connect Repository

1. Push your code to GitHub/GitLab/Bitbucket
2. In Vercel dashboard, click **"Add New Project"**
3. Import your repository

### 2. Configure Environment Variables

Add all environment variables from `.env.local` to Vercel:
- Go to **Project Settings** → **Environment Variables**
- Add each variable for **Production**, **Preview**, and **Development**
- Make sure to set `NEXT_PUBLIC_APP_URL` to your production domain

### 3. Set Up Cron Jobs

Create `vercel.json` in the root directory:

```json
{
  "crons": [
    {
      "path": "/api/cron/check-alerts",
      "schedule": "0 * * * *"
    },
    {
      "path": "/api/cron/daily-summary",
      "schedule": "0 7 * * *"
    },
    {
      "path": "/api/cron/send-pending",
      "schedule": "*/5 * * * *"
    },
    {
      "path": "/api/cron/check-compliance",
      "schedule": "0 * * * *"
    }
  ]
}
```

Or configure via Vercel dashboard:
- Go to **Project Settings** → **Cron Jobs**
- Add each cron job with the paths and schedules above

### 4. Deploy

1. Push to your main branch (Vercel auto-deploys)
2. Or manually trigger deployment from Vercel dashboard
3. Wait for build to complete
4. Test production endpoints

## Database Migration Checklist

After initial setup, verify all tables exist:

```sql
-- Check all tables
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Should see:
-- alert_logs
-- buildings
-- cities
-- degree_days
-- energy_baselines
-- energy_reports
-- message_templates
-- messages
-- photo_uploads
-- recipients
-- temperature_snapshots
-- users
-- utility_consumption
```

## Initial Data Setup

### 1. Create Cities

Use the API or SQL to create cities with proper NWS grid coordinates.

### 2. Create Buildings

Link buildings to cities via the API.

### 3. Add Recipients

Add recipients to buildings with their contact preferences.

### 4. Upload Historical Data (Milestone 4)

For energy savings module:
- Upload 3+ years of historical utility consumption data
- Upload corresponding degree days data
- System will automatically calculate baselines

## Troubleshooting

### Database Connection Issues

- Verify `POSTGRES_URL` is correct
- Check that database is active in Vercel
- Ensure IP allowlist allows your connection (if configured)
- Test connection: `psql $POSTGRES_URL -c "SELECT 1"`

### TypeScript Errors

- Run `npm install` to ensure all types are installed
- Check that `@types/node` is in devDependencies
- Restart your IDE/editor
- Run `npm run build` to check for build errors

### API Authentication Errors

- Verify `JWT_SECRET` is set and matches
- Check token format in Authorization header: `Bearer <token>`
- Ensure user exists in database with correct role
- Verify password hash is correct (use bcrypt)

### SMS/Email Not Sending (Milestone 2)

- Verify Twilio credentials are correct
- Check SendGrid API key is valid
- Ensure phone numbers are in E.164 format (+1234567890)
- Verify sender email is verified in SendGrid
- Check service account limits/quota

### Photo Upload Fails (Milestone 2)

- Verify `BLOB_READ_WRITE_TOKEN` is set
- Check file size (max 10MB)
- Ensure file is an image type
- Verify token is valid message ID

### Cron Job Not Running

- Verify `CRON_SECRET` matches in environment variables
- Check cron job configuration in Vercel
- Verify the endpoint returns 200 status
- Check Vercel function logs for errors
- Ensure cron jobs are enabled in Vercel dashboard

### Energy Baseline Not Calculating (Milestone 4)

- Ensure 3+ years of historical data uploaded
- Verify degree days data exists for same periods
- Check that utility and degree days data match by month/year
- Verify building has associated city

### Report Generation Fails (Milestone 4)

- Ensure utility consumption data exists for the month/year
- Verify degree days data exists for the month/year
- Check that baseline has been calculated
- Verify BLOB_READ_WRITE_TOKEN is set

## Service-Specific Setup

### Twilio Setup
1. Create account at twilio.com
2. Get a phone number (US numbers work best)
3. Copy Account SID and Auth Token
4. Add phone number to environment variables

### SendGrid Setup
1. Create account at sendgrid.com
2. Verify your sender email address
3. Create API key with "Mail Send" permissions
4. Copy API key to environment variables

### Vercel Blob Storage
1. Create Blob store in Vercel dashboard
2. Copy the read/write token
3. Add to environment variables
4. Storage is automatically available in production

## Production Checklist

Before going live:

- [ ] All environment variables set in Vercel
- [ ] Database schema fully migrated
- [ ] Initial users created
- [ ] Cities and buildings configured
- [ ] Recipients added with valid contact info
- [ ] Twilio phone number verified
- [ ] SendGrid sender email verified
- [ ] Cron jobs configured and tested
- [ ] Historical data uploaded (if using energy module)
- [ ] Baselines calculated for all buildings
- [ ] Test all API endpoints
- [ ] Verify SMS and email delivery
- [ ] Test photo uploads
- [ ] Test report generation
- [ ] Set up monitoring/error tracking

## Next Steps After Setup

1. **Frontend Development**: Build admin and building user interfaces
2. **Data Migration**: Upload historical utility and degree-day data
3. **Baseline Calculation**: Calculate baselines for all buildings
4. **Testing**: Comprehensive testing with real data
5. **Documentation**: Create user guides for staff and building users
6. **Monitoring**: Set up error tracking and monitoring

## Support

If you encounter issues:
1. Check console logs for error messages
2. Verify all environment variables are set correctly
3. Ensure database schema is properly initialized
4. Review API endpoint responses for error details
5. Check Vercel function logs for server-side errors
6. Verify all external services (Twilio, SendGrid) are configured

## Additional Resources

- [Vercel Postgres Docs](https://vercel.com/docs/storage/vercel-postgres)
- [Vercel Blob Storage Docs](https://vercel.com/docs/storage/vercel-blob)
- [Twilio API Docs](https://www.twilio.com/docs)
- [SendGrid API Docs](https://docs.sendgrid.com/)
- [National Weather Service API](https://www.weather.gov/documentation/services-web-api)