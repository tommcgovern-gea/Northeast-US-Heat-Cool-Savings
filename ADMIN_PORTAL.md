# Admin Portal UI - Complete

## Overview

The admin portal UI has been fully implemented with all major features and pages. The portal provides a comprehensive interface for managing the Heat-Cool Savings system.

## Pages Implemented

### 1. Authentication
- **Login Page** (`/admin/login`)
  - Email/password authentication
  - Token-based authentication using JWT
  - Database-backed user authentication (replaced mock users)
  - Automatic redirect to dashboard on success
  - Error handling and validation

### 2. Admin Dashboard (`/admin`)
- Overview statistics (cities, buildings, messages, compliance)
- Energy savings summary
- City-level statistics table
- Recent alerts list
- Recent energy reports
- Configurable time period (30 days default)

### 3. City Management (`/admin/cities`)
- List all cities with key information
- Create new cities with NWS configuration
- Edit city details and alert configurations
- View city statistics (buildings, alerts)
- City detail page with full edit capabilities

### 4. Building Management (`/admin/buildings`)
- List all buildings with status and compliance
- Create new buildings
- Pause/activate buildings
- Building detail page with:
  - Compliance statistics
  - Recent messages history
  - Recent photo uploads
  - Latest energy report
  - Building-specific dashboard

### 5. Recipient Management (`/admin/recipients`)
- Filter recipients by building
- Create new recipients
- View recipient details (email, phone, preferences)
- Manage communication preferences (email, SMS, both)

### 6. Message Templates (`/admin/templates`)
- City-specific template management
- Three template types:
  - Alert templates
  - Daily summary templates
  - Warning templates
- Edit template content and subject
- Variable substitution support
- Default templates fallback

### 7. Compliance Dashboard (`/admin/compliance`)
- Overall compliance rate visualization
- Building-level compliance tracking
- Message history with upload status
- Configurable time period (7, 30, 90 days)
- Color-coded compliance indicators

### 8. Messages (`/admin/messages`)
- View all sent messages
- Filter by building
- Message delivery status
- Upload compliance tracking
- Pagination support
- Detailed message information

### 9. Energy & Reports (`/admin/energy`)
- Building energy data management
- Upload utility consumption data
- View calculated baselines
- Generate monthly energy reports
- View report history with PDF links
- Utility consumption history table

## Features

### Navigation
- Responsive top navigation bar
- Active page highlighting
- Role-based access (shown in header)
- Logout functionality

### Authentication
- JWT token storage in localStorage
- Token expiration checking
- Automatic redirect to login when unauthorized
- Protected routes

### UI/UX
- Modern, clean design using Tailwind CSS
- Responsive layout
- Loading states
- Error handling and display
- Modal dialogs for forms
- Tables with sorting and filtering
- Status badges and indicators

## Technical Implementation

### Authentication
- Updated `authController.ts` to use database instead of mock users
- Added `bcryptjs` for password hashing
- Database user lookup and verification
- JWT token generation with user role and building ID

### Database Integration
- Added `getUserByEmail` and `createUser` methods to database client
- All pages fetch data from API endpoints
- Real-time data updates

### Layout System
- Admin layout with navigation (skips login page)
- Login page has separate layout
- Protected route handling

## Setup Requirements

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Database Setup**
   - Ensure users table exists (from schema.sql)
   - Create admin user with hashed password:
     ```sql
     INSERT INTO users (email, password_hash, role) 
     VALUES ('admin@example.com', '$2a$10$...', 'ADMIN');
     ```
   - Use bcrypt generator: https://bcrypt-generator.com/

3. **Environment Variables**
   - Ensure all required env vars are set (see `.env.example`)

4. **Start Development Server**
   ```bash
   npm run dev
   ```

5. **Access Portal**
   - Navigate to `http://localhost:3000/admin/login`
   - Login with admin credentials

## Default Test Credentials

For development, you can use the mock users temporarily:
- Email: `admin@test.com`
- Password: `123456`

**Note:** After setting up database users, the system will use database authentication instead.

## Next Steps

1. **Role-Based UI Filtering**: Hide/show features based on user role
2. **Building User Dashboard**: Create view-only dashboard for building users
3. **Staff Portal**: Create simplified interface for staff data uploads
4. **Real-time Updates**: Add WebSocket support for live data updates
5. **Export Features**: Add CSV/PDF export for reports and data
6. **Advanced Filtering**: Add more filter options across pages
7. **Bulk Operations**: Add bulk edit/delete capabilities

## File Structure

```
src/app/admin/
├── layout.tsx              # Main admin layout with navigation
├── login/
│   ├── layout.tsx         # Login page layout (no nav)
│   └── page.tsx           # Login form
├── page.tsx               # Admin dashboard
├── cities/
│   ├── page.tsx           # Cities list
│   └── [id]/
│       └── page.tsx      # City detail/edit
├── buildings/
│   ├── page.tsx           # Buildings list
│   └── [id]/
│       └── page.tsx       # Building detail/dashboard
├── recipients/
│   └── page.tsx           # Recipients management
├── templates/
│   └── page.tsx           # Template management
├── compliance/
│   └── page.tsx           # Compliance dashboard
├── messages/
│   └── page.tsx           # Messages history
└── energy/
    └── page.tsx           # Energy & reports
```

## API Endpoints Used

All pages consume the existing API endpoints:
- `/api/auth/login` - Authentication
- `/api/cities` - City management
- `/api/buildings` - Building management
- `/api/recipients` - Recipient management
- `/api/admin/templates` - Template management
- `/api/admin/dashboard` - Dashboard data
- `/api/admin/compliance` - Compliance data
- `/api/admin/messages` - Message history
- `/api/buildings/[id]/dashboard` - Building dashboard
- `/api/buildings/[id]/energy` - Energy data
- `/api/staff/upload-utility` - Utility data upload
- `/api/staff/generate-report` - Report generation

## Status

✅ **Complete** - All core admin portal pages are implemented and functional.
