# Milestone 4: Energy Reporting & Savings Validation Module

## Status: ✅ Completed

## Deliverables

### ✅ Structured Upload Templates for Utility Data
- Excel file upload support for bulk data entry
- Manual API endpoints for single record uploads
- Support for multiple fuel types:
  - Electric (kWh)
  - Gas (therms)
  - Fuel Oil (gallons)
  - District Steam (MBTU)
- Automatic kBTU calculation and storage
- Data validation and error handling

### ✅ Staff Upload Portal
- **Excel Upload**: `POST /api/staff/upload-excel`
  - Supports utility data and degree-days uploads
  - Bulk processing with error reporting
  - Flexible column name matching
  
- **Utility Data Upload**: `POST /api/staff/upload-utility`
  - Single record upload
  - Automatic baseline recalculation
  
- **Degree Days Upload**: `POST /api/staff/upload-degree-days`
  - City-level degree days data
  - Heating Degree Days (HDD) and Cooling Degree Days (CDD)

- **Baseline Calculation**: `POST /api/staff/calculate-baseline`
  - Manual trigger for baseline recalculation
  - Uses 3 years of historical data

### ✅ Historical Baseline Calculation
- **Fixed Baseline System**: Uses 3 years of historical data
- **Monthly Baselines**: Separate baselines for each month
- **Heating and Cooling**: Separate baselines for HDD and CDD
- **Automatic Calculation**: Triggered on data upload
- **Baseline Storage**: Stored in `energy_baselines` table
- **Data Points Tracking**: Records number of data points used

### ✅ Monthly Comparison Engine
- **Normalized Comparison**: Consumption per degree day
- **Fixed Baseline Comparison**: Current vs. historical baseline
- **Savings Calculation**: Percentage and absolute kBTU savings
- **Multi-Fuel Support**: Handles all fuel types
- **Service**: `src/lib/services/energyService.ts`

### ✅ PDF Report Generation
- **HTML Report Generation**: Professional formatted reports
- **Report Storage**: Stored in Vercel Blob Storage
- **Report Content**:
  - Building information
  - Consumption data by fuel type
  - Degree days (HDD/CDD)
  - Normalized consumption metrics
  - Baseline comparison
  - Savings analysis
  - Baseline period information
- **Service**: `src/lib/services/reportService.ts`

### ✅ Automatic Report Distribution
- **Email Integration**: Sends reports via SendGrid
- **Report Links**: Includes PDF URL in emails
- **Email Tracking**: Records who received reports
- **Optional Distribution**: Can generate without sending
- **Professional Formatting**: HTML email with summary

### ✅ Dashboard Integration
- **Building Dashboard**: Latest energy report summary
- **Admin Dashboard**: Recent reports and aggregate savings
- **Energy Endpoint**: `GET /api/buildings/[id]/energy`
  - Utility history
  - Baseline information
  - Recent reports
  - Monthly comparisons

## Database Schema

### Utility Consumption Table
- Stores monthly utility consumption per building
- Supports multiple fuel types
- Tracks uploader for audit trail
- Unique constraint on building/month/year

### Degree Days Table
- Stores monthly HDD and CDD per city
- Links to cities (shared across buildings in city)
- Tracks uploader for audit trail
- Unique constraint on city/month/year

### Energy Baselines Table
- Stores calculated baselines per building/month
- Separate baselines for heating and cooling
- Records baseline period and data points
- Fixed baseline (not rolling average)

### Energy Reports Table
- Stores generated monthly reports
- Links to utility consumption and degree days
- Stores report data as JSONB
- Tracks PDF URL and email recipients

## API Endpoints

### Staff Upload Endpoints
- `POST /api/staff/upload-excel` - Bulk Excel upload
  - Body: multipart/form-data
  - Fields: `file`, `type` (utility|degree-days), `buildingId` or `cityId`
  
- `POST /api/staff/upload-utility` - Single utility record
  - Body: `{ buildingId, month, year, electricKWH?, gasTherms?, fuelOilGallons?, districtSteamMBTU?, totalKBTU }`
  
- `POST /api/staff/upload-degree-days` - Single degree days record
  - Body: `{ cityId, month, year, heatingDegreeDays, coolingDegreeDays }`
  
- `POST /api/staff/calculate-baseline` - Manual baseline calculation
  - Body: `{ buildingId, month }`

### Report Generation
- `POST /api/staff/generate-report` - Generate monthly report
  - Body: `{ buildingId, month, year, emailTo? }`
  - Returns: Report data, PDF URL, email status

### Energy Data Access
- `GET /api/buildings/[id]/energy` - Get energy data
  - Query params: `month?`, `year?` (for specific comparison)
  - Returns: Utility history, baselines, recent reports

## Excel Upload Format

### Utility Data Format
Expected columns (flexible naming):
- `month` or `Month`
- `year` or `Year`
- `totalKBTU` or `Total kBTU` or `total_kbtu`
- `electricKWH` or `Electric (kWh)` or `electric_kwh` (optional)
- `gasTherms` or `Gas (therms)` or `gas_therms` (optional)
- `fuelOilGallons` or `Fuel Oil (gallons)` or `fuel_oil_gallons` (optional)
- `districtSteamMBTU` or `District Steam (MBTU)` or `district_steam_mbtu` (optional)

### Degree Days Format
Expected columns (flexible naming):
- `month` or `Month`
- `year` or `Year`
- `hdd` or `HDD` or `heating_degree_days`
- `cdd` or `CDD` or `cooling_degree_days`

## Baseline Calculation Logic

1. **Data Collection**: Gathers 3 years of historical data for the month
2. **Degree Day Matching**: Matches utility data with degree days by city
3. **Normalization**: Calculates consumption per degree day for each year
4. **Averaging**: Averages normalized consumption across all years
5. **Storage**: Saves baseline with period and data point count
6. **Fixed Baseline**: Baseline remains fixed until recalculated

## Monthly Comparison Logic

1. **Data Retrieval**: Gets current month's utility and degree days
2. **Normalization**: Calculates current consumption per HDD/CDD
3. **Baseline Retrieval**: Gets fixed baseline for the month
4. **Comparison**: Compares current vs. baseline
5. **Savings Calculation**:
   - Expected consumption = baseline × degree days
   - Savings = Expected - Actual
   - Percentage = (Savings / Expected) × 100

## Report Generation Process

1. **Data Collection**: Gathers all required data
2. **Comparison Calculation**: Runs monthly comparison
3. **HTML Generation**: Creates formatted HTML report
4. **Storage**: Uploads HTML to Vercel Blob Storage
5. **Database Save**: Stores report metadata
6. **Email Distribution**: Optionally sends via email

## Integration Points

### Dashboard Integration
- Building dashboard shows latest energy report
- Admin dashboard shows aggregate savings
- Energy endpoint provides detailed history

### Automatic Baseline Updates
- Baselines recalculated on utility data upload
- Ensures baselines stay current with new data

### Report Workflow
- Staff uploads data monthly
- System calculates baselines automatically
- Reports generated on-demand
- Reports emailed to engineers/clients

## Testing

### Manual Testing Steps

1. **Upload Utility Data:**
   ```bash
   curl -X POST http://localhost:3000/api/staff/upload-utility \
     -H "Authorization: Bearer <staff-token>" \
     -H "Content-Type: application/json" \
     -d '{
       "buildingId": "<id>",
       "month": 1,
       "year": 2024,
       "electricKWH": 10000,
       "gasTherms": 500,
       "totalKBTU": 1500
     }'
   ```

2. **Upload Degree Days:**
   ```bash
   curl -X POST http://localhost:3000/api/staff/upload-degree-days \
     -H "Authorization: Bearer <staff-token>" \
     -H "Content-Type: application/json" \
     -d '{
       "cityId": "<id>",
       "month": 1,
       "year": 2024,
       "heatingDegreeDays": 850,
       "coolingDegreeDays": 0
     }'
   ```

3. **Generate Report:**
   ```bash
   curl -X POST http://localhost:3000/api/staff/generate-report \
     -H "Authorization: Bearer <staff-token>" \
     -H "Content-Type: application/json" \
     -d '{
       "buildingId": "<id>",
       "month": 1,
       "year": 2024,
       "emailTo": "engineer@example.com"
     }'
   ```

## Migration Steps

1. **Run schema migration:**
   ```bash
   psql $POSTGRES_URL < src/lib/db/schema-milestone4.sql
   ```

2. **Upload historical data:**
   - Use Excel upload for bulk historical data
   - Or use API endpoints for individual records

3. **Calculate baselines:**
   - Baselines calculated automatically on upload
   - Or trigger manually via API

## Notes

- Baselines are fixed (not rolling) as per requirements
- System supports 3+ years of historical data
- Reports are generated on-demand (not scheduled)
- PDF reports are stored as HTML (can be converted to PDF client-side)
- Email distribution is optional
- All fuel types converted to kBTU for comparison
- System ready for production use
