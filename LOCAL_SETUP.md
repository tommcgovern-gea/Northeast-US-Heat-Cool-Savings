# Local Development Setup Guide

This guide will help you run the Heat-Cool Savings Portal locally on your machine.

## Prerequisites

- Node.js 18+ installed
- npm or yarn package manager
- PostgreSQL (optional - can use Vercel Postgres instead)

## Quick Start

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Set Up Environment Variables**
   ```bash
   # The .env.local file is already created with defaults
   # Edit it and fill in your values (see below)
   ```

3. **Set Up Database** (Choose one option)

   **Option A: Use Neon Postgres (Easiest)**
   - Go to Vercel Dashboard → Storage → Neon (or neon.tech directly)
   - Create a new database (or use existing if migrated from Vercel Postgres)
   - Copy the connection string to `.env.local` as `POSTGRES_URL`
   - Skip to step 4

   **Option B: Use Local Postgres**
   ```bash
   # Install Postgres (Mac)
   brew install postgresql
   brew services start postgresql
   
   # Install Postgres (Linux)
   sudo apt-get install postgresql postgresql-contrib
   sudo systemctl start postgresql
   
   # Create database
   createdb heatcool_db
   
   # Update .env.local with local connection:
   # POSTGRES_URL=postgresql://postgres:postgres@localhost:5432/heatcool_db
   ```

4. **Run Database Migrations**
   ```bash
   # Using Neon Postgres
   psql $POSTGRES_URL < src/lib/db/schema.sql
   psql $POSTGRES_URL < src/lib/db/schema-milestone3.sql
   psql $POSTGRES_URL < src/lib/db/schema-milestone4.sql
   
   # Or using local Postgres
   psql -d heatcool_db -f src/lib/db/schema.sql
   psql -d heatcool_db -f src/lib/db/schema-milestone3.sql
   psql -d heatcool_db -f src/lib/db/schema-milestone4.sql
   ```

5. **Create Test Admin User**
   ```sql
   -- Connect to your database
   psql $POSTGRES_URL
   
   -- Create admin user (password: admin123)
   -- Use https://bcrypt-generator.com/ to generate password hash
   INSERT INTO users (email, password_hash, role) 
   VALUES (
     'admin@test.com', 
     '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 
     'ADMIN'
   );
   ```

6. **Start Development Server**
   ```bash
   npm run dev
   ```

7. **Access the Application**
   - Admin Portal: http://localhost:3000/admin/login
   - Login: admin@test.com / admin123
   - Weather Demo: http://localhost:3000/weather

## Environment Variables Setup

The `.env.local` file is already created with default values. You need to update:

### Required for Full Functionality

1. **Database Connection** (REQUIRED)
   - Either use Vercel Postgres (recommended)
   - Or set up local Postgres and update `POSTGRES_URL`

2. **JWT_SECRET** (REQUIRED)
   - Generate: `openssl rand -base64 32`
   - Or use the default dev secret (change in production!)

3. **CRON_SECRET** (REQUIRED)
   - Generate: `openssl rand -base64 32`
   - Or use the default dev secret (change in production!)

### Optional (App works without these, but features will be limited)

4. **Twilio** (Optional - for SMS)
   - Leave empty for local dev
   - SMS sending will fail, but app still works

5. **SendGrid** (Optional - for Email)
   - Leave empty for local dev
   - Email sending will fail, but app still works

6. **Vercel Blob** (Optional - for file uploads)
   - Leave empty for local dev
   - Photo uploads will fail, but app still works

7. **NEXT_PUBLIC_APP_URL** (Already set)
   - Default: `http://localhost:3000`
   - No need to change for local dev

## What Works Without External Services

Even without Twilio, SendGrid, or Blob Storage, you can:

✅ View all admin portal pages
✅ Test authentication and login
✅ Manage cities, buildings, recipients
✅ Edit message templates
✅ View dashboards and reports
✅ Test all API endpoints
✅ View compliance data
✅ Test database operations

❌ SMS sending will fail (but won't crash)
❌ Email sending will fail (but won't crash)
❌ Photo uploads will fail (but won't crash)

## Testing the Application

### 1. Test Authentication
- Go to http://localhost:3000/admin/login
- Login with: admin@test.com / admin123

### 2. Create Test Data
- Create a city (e.g., New York, NY)
- Create a building
- Add recipients
- Create message templates

### 3. Test API Endpoints
```bash
# Get auth token first
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@test.com","password":"admin123"}'

# Use token in subsequent requests
curl http://localhost:3000/api/cities \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 4. Test Cron Jobs (Manually)
```bash
# Check alerts
curl -X POST http://localhost:3000/api/cron/check-alerts \
  -H "Authorization: Bearer YOUR_CRON_SECRET"

# Daily summary
curl -X POST http://localhost:3000/api/cron/daily-summary \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

## Troubleshooting

### Database Connection Issues
```bash
# Test connection
psql $POSTGRES_URL -c "SELECT 1"

# If using local Postgres, check if it's running
# Mac: brew services list
# Linux: sudo systemctl status postgresql
```

### Port Already in Use
```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9

# Or use a different port
PORT=3001 npm run dev
```

### TypeScript Errors
```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Check for type errors
npm run build
```

### Authentication Not Working
- Verify user exists in database
- Check password hash is correct (use bcrypt generator)
- Verify JWT_SECRET is set
- Check browser console for errors

## Next Steps

1. **Add More Test Data**
   - Create multiple cities
   - Add buildings to cities
   - Add recipients to buildings

2. **Test All Features**
   - Navigate through all admin pages
   - Test CRUD operations
   - Test filters and search

3. **Set Up External Services** (Optional)
   - Configure Twilio for SMS testing
   - Configure SendGrid for email testing
   - Set up Vercel Blob for file uploads

## Production Deployment

When ready for production:
1. Update all environment variables in Vercel Dashboard
2. Use strong, randomly generated secrets
3. Set up proper database backups
4. Configure production domain in `NEXT_PUBLIC_APP_URL`
5. Set up Vercel Cron Jobs for automated tasks
