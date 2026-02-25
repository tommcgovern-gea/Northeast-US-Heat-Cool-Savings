# Milestone 3: Multi-City Scaling & Building Login Portal

## Status: ✅ Completed

## Deliverables

### ✅ Multi-City Support with Scalable Architecture
- Enhanced city management with proper isolation
- City-level statistics and reporting
- Scalable database queries with proper indexing
- Support for unlimited cities and buildings
- City-based template management

### ✅ Building Login Portal
- Building user authentication and authorization
- View-only access to building-specific data
- Building dashboard endpoint: `GET /api/buildings/[id]/dashboard`
- Isolated data access (buildings can only see their own data)
- Building-specific statistics and compliance tracking

### ✅ Role-Based Access Control Enhancements
- **Admin**: Full access to all cities, buildings, templates, and dashboards
- **Staff**: Data upload access (prepared for Milestone 4)
- **Building**: View-only access to their own building's data
- Proper authorization checks on all endpoints
- Building isolation for security

### ✅ Editable Message Templates Per City
- Template management service: `src/lib/services/templateService.ts`
- Template storage in database with city association
- Support for three template types:
  - `alert` - Sudden temperature fluctuation alerts
  - `daily_summary` - Daily temperature summaries
  - `warning` - Compliance warnings
- Variable substitution system:
  - `{{temperatureChange}}` - Temperature change in degrees
  - `{{timeWindow}}` - Time window in hours
  - `{{currentTemp}}` - Current temperature
  - `{{futureTemp}}` - Future temperature
  - `{{averageTemp}}` - Average temperature
  - `{{minTemp}}` - Minimum temperature
  - `{{maxTemp}}` - Maximum temperature
  - `{{cityName}}` - City name
  - `{{buildingName}}` - Building name
  - `{{uploadUrl}}` - Photo upload URL
- Default templates when city templates don't exist
- Template CRUD operations via API

### ✅ Building Activation/Pause Controls
- Pause/activate building endpoint: `POST /api/buildings/[id]/pause`
- Prevents messages from being sent to paused buildings
- Building status visible in dashboards
- Admin-only control

### ✅ Enhanced Dashboards

#### Admin Dashboard
- **Endpoint**: `GET /api/admin/dashboard`
- **Features**:
  - Overview statistics (cities, buildings, messages, alerts)
  - Overall compliance rate
  - Failed message tracking
  - City-level statistics
  - Building compliance data
  - Recent alerts history
  - Configurable time period (default 30 days)

#### Building Dashboard
- **Endpoint**: `GET /api/buildings/[id]/dashboard`
- **Features**:
  - Building information and status
  - Compliance rate
  - Total alerts count
  - Total recipients
  - Recent messages with upload status
  - Recent photo uploads
  - Configurable time period (default 30 days)
  - Role-based access (building users see only their building)

## API Endpoints

### Message Templates
- `GET /api/admin/templates?cityId=<id>` - Get all templates for a city
- `POST /api/admin/templates` - Create or update template
  - Body: `{ cityId, templateType, content, subject?, variables? }`
- `PUT /api/admin/templates/[id]` - Update template
- `DELETE /api/admin/templates/[id]` - Delete template (soft delete)

### Building Controls
- `POST /api/buildings/[id]/pause` - Pause or activate building
  - Body: `{ isPaused: boolean }`
- `GET /api/buildings/[id]/dashboard` - Get building dashboard data

### Admin Dashboard
- `GET /api/admin/dashboard?days=<n>` - Get admin dashboard data

## Database Schema Updates

### Message Templates Table
```sql
CREATE TABLE message_templates (
  id UUID PRIMARY KEY,
  city_id UUID REFERENCES cities(id),
  template_type VARCHAR(20) CHECK (template_type IN ('alert', 'daily_summary', 'warning')),
  subject VARCHAR(200),
  content TEXT NOT NULL,
  variables JSONB,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  UNIQUE(city_id, template_type)
);
```

## Template System

### Template Variables
Templates support variable substitution using `{{variableName}}` syntax:

- **Alert Templates**: `temperatureChange`, `timeWindow`, `currentTemp`, `futureTemp`, `cityName`, `buildingName`, `uploadUrl`
- **Daily Summary Templates**: `averageTemp`, `minTemp`, `maxTemp`, `temperatureChange`, `cityName`, `buildingName`, `uploadUrl`
- **Warning Templates**: `hoursAgo`, `uploadUrl`

### Default Templates
If no custom template exists for a city, the system uses default templates that work for all cities.

### Template Example
```
⚠️ SUDDEN TEMPERATURE ALERT for {{cityName}}

Temperature is expected to change by {{temperatureChange}}°F 
in the next {{timeWindow}} hours 
({{currentTemp}}°F → {{futureTemp}}°F).

Building: {{buildingName}}

Please adjust heating/cooling settings accordingly.

Upload compliance photo: {{uploadUrl}}
```

## Integration Points

### Message Service Integration
- Message service now uses templates when creating messages
- Falls back to default templates if city template doesn't exist
- Variables automatically populated from alert data

### Building Access Control
- All building endpoints check user role and building ID
- Building users can only access their assigned building
- Admin and Staff can access all buildings

### Dashboard Data Aggregation
- Efficient queries with proper joins
- Caching-friendly structure
- Configurable time periods for historical data

## Security Features

- Role-based access control on all endpoints
- Building isolation for building users
- Admin-only template management
- Admin-only building pause/activate controls
- Proper authorization checks before data access

## Performance Optimizations

- Indexed database queries
- Efficient aggregation queries
- Limited result sets (pagination support)
- Optimized joins for dashboard data

## Testing

### Manual Testing Steps

1. **Test Template Management:**
   ```bash
   # Create template
   curl -X POST http://localhost:3000/api/admin/templates \
     -H "Authorization: Bearer <admin-token>" \
     -H "Content-Type: application/json" \
     -d '{
       "cityId": "<city-id>",
       "templateType": "alert",
       "content": "Alert for {{cityName}}: {{temperatureChange}}°F change"
     }'
   ```

2. **Test Building Pause:**
   ```bash
   curl -X POST http://localhost:3000/api/buildings/<id>/pause \
     -H "Authorization: Bearer <admin-token>" \
     -H "Content-Type: application/json" \
     -d '{"isPaused": true}'
   ```

3. **Test Building Dashboard:**
   ```bash
   curl -X GET http://localhost:3000/api/buildings/<id>/dashboard \
     -H "Authorization: Bearer <building-token>"
   ```

4. **Test Admin Dashboard:**
   ```bash
   curl -X GET http://localhost:3000/api/admin/dashboard?days=30 \
     -H "Authorization: Bearer <admin-token>"
   ```

## Migration Steps

1. **Run schema migration:**
   ```bash
   psql $POSTGRES_URL < src/lib/db/schema-milestone3.sql
   ```

2. **Verify templates table exists:**
   ```sql
   SELECT * FROM message_templates LIMIT 1;
   ```

3. **Create default templates for existing cities (optional):**
   - Templates are created on-demand when messages are sent
   - Or create via API for each city

## Next Steps (Milestone 4)

- Energy savings module
- Staff upload portal
- Utility data management
- PDF report generation
- Historical baseline calculations

## Notes

- Templates are city-specific but can be copied between cities
- Building pause prevents message sending but doesn't delete data
- Dashboard queries are optimized for performance
- All endpoints maintain proper authorization
- System ready to scale to thousands of buildings across multiple cities
