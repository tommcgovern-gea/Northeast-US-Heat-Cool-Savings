# Northeast US Heat-Cool Savings Portal

A temperature monitoring and alerting system that tracks temperature fluctuations in cities (starting with NYC) and sends automated messages to building managers to adjust heating or cooling systems. The system tracks compliance through photo uploads and provides energy savings reporting.

## Project Overview

This portal helps manage heating and cooling systems across multiple buildings by:
- Monitoring forecasted temperature fluctuations proactively
- Sending daily summary messages and special alerts for sudden temperature changes
- Tracking compliance through photo uploads from recipients
- Providing energy savings validation using degree-day normalization
- Supporting multiple cities and hundreds to thousands of buildings

## Key Features

### Temperature Monitoring & Alerts
- **Hourly Forecast Integration**: Uses National Weather Service (NWS) API for hourly temperature forecasts
- **Configurable Alert Logic**: Adjustable temperature change thresholds (5-10°F) and time windows (3-12 hours)
- **Proactive Alerts**: Based on forecasted temperatures, not reactive to current conditions
- **Daily Summaries**: Automated daily temperature summaries sent to all recipients
- **City-Level Configuration**: Each city can have its own alert rules

### Communication System ✅ Milestone 2
- **Multi-Channel Notifications**: SMS (via Twilio) and Email (via SendGrid/SES)
- **Recipient Preferences**: Recipients choose SMS, Email, or both
- **Secure Upload Links**: No login required for photo uploads
- **Message Templates**: Editable templates per city
- **Delivery Tracking**: Monitor failed SMS/email deliveries

### Compliance Tracking ✅ Milestone 2
- **Photo Upload System**: Recipients upload photos to confirm heating/cooling adjustments
- **2-Hour Compliance Window**: Automatic warnings if photos not uploaded within 2 hours
- **Compliance Dashboard**: Track compliance rates per building
- **Delivery Tracking**: Monitor failed SMS/email deliveries
- **Automatic Warnings**: System sends warnings for non-compliance

### Energy Savings Module ✅ Milestone 4
- **Degree-Day Normalization**: Compare energy consumption using Heating Degree Days (HDD) and Cooling Degree Days (CDD)
- **Historical Baseline**: 3 years of historical data to establish baseline consumption per degree day
- **Monthly Reporting**: PDF reports showing savings vs. baseline
- **Multi-Fuel Support**: Electric, Gas, Fuel Oil, District Steam
- **Staff Upload Portal**: Excel and API uploads for utility and degree-day data
- **Fixed Baseline System**: Non-rolling baseline for consistent comparisons
- **Automated Calculations**: Automatic baseline updates on data upload

### User Roles
- **Admin**: Full access to all cities, buildings, dashboards, and reports
- **Staff**: Data upload role for utility and degree-day data
- **Building Users**: View-only access to their own alerts, photos, compliance, and reports

## Technical Architecture

### Technology Stack
- **Frontend & Backend**: Next.js 16 (App Router) deployed on Vercel
- **Database**: Vercel Postgres (PostgreSQL)
- **Storage**: Vercel Blob Storage for photo uploads
- **SMS**: Twilio
- **Email**: SendGrid or Amazon SES
- **Weather API**: National Weather Service (NWS) API

### Project Structure
```
src/
├── app/
│   ├── api/              # API routes
│   │   ├── auth/         # Authentication
│   │   ├── cities/       # City management
│   │   ├── buildings/     # Building management
│   │   ├── recipients/   # Recipient management
│   │   ├── weather/      # Weather data
│   │   ├── upload/       # Photo uploads
│   │   ├── admin/        # Admin dashboard
│   │   └── cron/         # Scheduled jobs
│   └── (pages)           # Frontend pages
├── lib/
│   ├── db/               # Database client and queries
│   ├── services/         # Business logic services
│   │   ├── smsService.ts
│   │   ├── emailService.ts
│   │   ├── messageService.ts
│   │   ├── alertService.ts
│   │   └── complianceService.ts
│   ├── controllers/      # Request handlers
│   └── utils/            # Utility functions
└── types/                # TypeScript type definitions
```

## Development Milestones

### ✅ Milestone 1: Core Architecture & Weather Alert Engine (Week 1)
✅ Project setup (Vercel cloud infrastructure, database, storage)
✅ City and building structure (initial NYC configuration)
✅ Integration with National Weather Service hourly forecast data
✅ Configurable alert logic with adjustable thresholds
✅ Admin capability to configure rules per city
✅ Database structure for all entities

### ✅ Milestone 2: Messaging, Photo Upload & Compliance Tracking (Week 2)
✅ SMS integration (Twilio)
✅ Email integration (SendGrid/SES)
✅ Recipient preference selection
✅ Secure upload links (no login required)
✅ Photo upload system with timestamping
✅ Two-hour compliance tracking
✅ Automatic warning notifications
✅ Delivery tracking
✅ Admin dashboard for compliance monitoring

### ✅ Milestone 3: Multi-City Scaling & Building Login Portal (Week 3)
✅ Multi-city support with scalable architecture
✅ Building login portal with view-only access
✅ Role-based access control enhancements
✅ Editable message templates per city
✅ Building activation/pause controls
✅ Enhanced dashboards (Admin and Building)

### ✅ Milestone 4: Energy Reporting & Savings Validation Module (Week 4)
✅ Structured upload templates for utility data
✅ Staff upload portal (Excel and API)
✅ Historical baseline calculation (3-year fixed baseline)
✅ Monthly comparison engine
✅ PDF report generation
✅ Automatic report distribution via email

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login

### Cities
- `GET /api/cities` - List all cities
- `GET /api/cities/[id]` - Get city details
- `PUT /api/cities/[id]` - Update city configuration
- `GET /api/admin/cities/[id]/config` - Get city alert config
- `PUT /api/admin/cities/[id]/config` - Update city alert config

### Buildings
- `GET /api/buildings` - List buildings (filtered by role)
- `GET /api/buildings/[id]` - Get building details
- `POST /api/buildings` - Create building (Admin only)

### Weather
- `GET /api/weather/forecast/[cityId]` - Get hourly forecast for city

### Photo Upload ✅ Milestone 2
- `GET /api/upload?token=<messageId>` - Validate upload token
- `POST /api/upload` - Upload photo (multipart/form-data)

### Admin Dashboard ✅ Milestone 2 & 3
- `GET /api/admin/compliance` - Get compliance data
- `GET /api/admin/messages` - Get message history
- `GET /api/admin/dashboard` - Get admin dashboard overview

### Building Dashboard ✅ Milestone 3
- `GET /api/buildings/[id]/dashboard` - Get building dashboard data

### Message Templates ✅ Milestone 3
- `GET /api/admin/templates?cityId=<id>` - Get city templates
- `POST /api/admin/templates` - Create/update template
- `PUT /api/admin/templates/[id]` - Update template
- `DELETE /api/admin/templates/[id]` - Delete template

### Building Controls ✅ Milestone 3
- `POST /api/buildings/[id]/pause` - Pause/activate building

### Energy & Reports ✅ Milestone 4
- `GET /api/buildings/[id]/energy` - Get energy data and reports
- `POST /api/staff/upload-utility` - Upload utility consumption data
- `POST /api/staff/upload-degree-days` - Upload degree days data
- `POST /api/staff/upload-excel` - Bulk Excel upload
- `POST /api/staff/calculate-baseline` - Calculate baseline
- `POST /api/staff/generate-report` - Generate monthly energy report

### Cron Jobs
- `POST /api/cron/check-alerts` - Check for temperature fluctuations
- `POST /api/cron/daily-summary` - Send daily summaries
- `POST /api/cron/send-pending` - Send pending messages
- `POST /api/cron/check-compliance` - Check and send compliance warnings

## Environment Variables

```env
# Database
POSTGRES_URL=
POSTGRES_PRISMA_URL=
POSTGRES_URL_NON_POOLING=

# Authentication
JWT_SECRET=

# Weather API
NWS_API_BASE=https://api.weather.gov

# SMS (Twilio) ✅ Milestone 2
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=

# Email (SendGrid) ✅ Milestone 2
SENDGRID_API_KEY=
SENDGRID_FROM_EMAIL=

# Storage (Vercel Blob) ✅ Milestone 2
BLOB_READ_WRITE_TOKEN=

# App
NEXT_PUBLIC_APP_URL=

# Cron Jobs
CRON_SECRET=
```

## Getting Started

See [SETUP.md](SETUP.md) for detailed setup instructions.

### Quick Start

1. Install dependencies: `npm install`
2. Set up Vercel Postgres database
3. Configure environment variables
4. Run database migration: `psql $POSTGRES_URL < src/lib/db/schema.sql`
5. Start dev server: `npm run dev`

## Deployment

The application is deployed on Vercel. Connect your GitHub repository to Vercel for automatic deployments.

### Vercel Cron Jobs
Configure in `vercel.json` or Vercel dashboard:
- `check-alerts`: Every hour
- `daily-summary`: Once per day (7 AM)
- `send-pending`: Every 5 minutes
- `check-compliance`: Every hour

## Testing Schedule

- **Week 1-2**: Internal testing
- **Before March 9**: Trial with 5 friends
- **Before March 16**: Trial with 12 friends  
- **Before March 19**: Trial with 25 friends
- **March 20**: Final delivery deadline

## Documentation

- [MILESTONE_1.md](MILESTONE_1.md) - Milestone 1 details
- [MILESTONE_2.md](MILESTONE_2.md) - Milestone 2 details
- [MILESTONE_3.md](MILESTONE_3.md) - Milestone 3 details
- [MILESTONE_4.md](MILESTONE_4.md) - Milestone 4 details
- [PROJECT_COMPLETE.md](PROJECT_COMPLETE.md) - Project completion summary
- [SETUP.md](SETUP.md) - Setup and deployment guide

## Future Enhancements

- Local Law 97 compliance functionality
- Weekly recommendation messages
- Automated OCR for thermostat reading
- Real-time utility integrations
- Advanced analytics and reporting

## Project Status

✅ **All 4 Milestones Completed**

The system is fully functional and ready for:
- Testing with real data
- Frontend development
- Production deployment
- Client trials (5 → 12 → 25 users)

See [PROJECT_COMPLETE.md](PROJECT_COMPLETE.md) for complete summary.

## Milestone Status

✅ **All 4 Core Milestones Completed**

The original project scope included 4 milestones, all of which are now complete:
1. ✅ Core Architecture & Weather Alert Engine
2. ✅ Messaging, Photo Upload & Compliance Tracking
3. ✅ Multi-City Scaling & Building Login Portal
4. ✅ Energy Reporting & Savings Validation Module

**No additional milestones are required for the core project delivery.**

## Future Enhancements (Post-Delivery)

These were mentioned as potential future additions but are not part of the core milestones:

- Local Law 97 compliance functionality
- Weekly recommendation messages
- Automated OCR for thermostat reading
- Real-time utility integrations
- Advanced analytics and reporting
- Mobile app for building users

## License

Private project - All rights reserved
