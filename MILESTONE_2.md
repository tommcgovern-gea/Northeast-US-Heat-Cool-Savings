# Milestone 2: Messaging, Photo Upload & Compliance Tracking

## Status: ✅ Completed

## Deliverables

### ✅ SMS Integration (Twilio)
- Twilio client setup with error handling
- SMS sending service with delivery tracking
- Configuration check for SMS availability
- Service: `src/lib/services/smsService.ts`

### ✅ Email Integration (SendGrid)
- SendGrid client setup with error handling
- Email sending service with HTML/text support
- Configuration check for email availability
- Service: `src/lib/services/emailService.ts`

### ✅ Recipient Preference Selection
- Database support for preferences: 'email', 'sms', 'both'
- Message routing based on recipient preferences
- Automatic channel selection in message queue

### ✅ Secure Upload Links (No Login Required)
- Token-based upload system using message IDs
- GET endpoint to validate upload tokens
- Secure token generation and validation
- Endpoint: `GET /api/upload?token=<messageId>`

### ✅ Photo Upload System
- File upload endpoint with validation
- Image type and size validation (max 10MB)
- Vercel Blob Storage integration
- Automatic timestamping on upload
- Linked to building, recipient, and message
- Endpoint: `POST /api/upload`

### ✅ Two-Hour Compliance Tracking
- Automatic compliance calculation on upload
- Time-based compliance window (2 hours default)
- Compliance status stored in database
- Service: `src/lib/services/complianceService.ts`

### ✅ Automatic Warning Notifications
- Cron job to check for non-compliant messages
- Automatic warning message generation
- Sent via recipient's preferred channel
- Endpoint: `POST /api/cron/check-compliance`
- Prevents duplicate warnings

### ✅ Delivery Tracking
- Message delivery status tracking
- Failed SMS/email detection
- Delivery status stored in database
- Error message capture
- Admin visibility into delivery issues

### ✅ Admin Dashboard Endpoints
- **Compliance Dashboard**: `GET /api/admin/compliance`
  - Overall compliance rate
  - Per-building compliance rates
  - Message history with upload status
  - Configurable time period (default 30 days)

- **Message History**: `GET /api/admin/messages`
  - All messages with delivery status
  - Filter by building
  - Pagination support
  - Upload status per message

## Message Flow

1. **Alert Triggered** → Alert log created
2. **Message Queue** → Messages created for all active recipients
3. **Message Sending** → SMS/Email sent via Twilio/SendGrid
4. **Delivery Tracking** → Status updated in database
5. **Photo Upload** → Recipient uploads via secure link
6. **Compliance Check** → Automatic compliance calculation
7. **Warning System** → Warnings sent if no upload within 2 hours

## API Endpoints

### Photo Upload
- `GET /api/upload?token=<messageId>` - Validate upload token
- `POST /api/upload` - Upload photo (multipart/form-data)
  - Body: `token`, `file`

### Cron Jobs
- `POST /api/cron/check-compliance` - Check and send compliance warnings
- `POST /api/cron/send-pending` - Send pending messages (updated)

### Admin Dashboard
- `GET /api/admin/compliance?buildingId=<id>&days=<n>` - Get compliance data
- `GET /api/admin/messages?buildingId=<id>&limit=<n>&offset=<n>` - Get message history

## Database Updates

### Messages Table
- `delivered` - Boolean flag for delivery status
- `delivery_status` - Status: 'delivered', 'failed', 'error', 'pending'
- `sent_at` - Timestamp when message was sent

### Photo Uploads Table
- `is_compliant` - Boolean flag for compliance
- `compliance_window_hours` - Configurable window (default 2)
- `uploaded_at` - Automatic timestamp

## Environment Variables Required

```env
# SMS (Twilio)
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+1234567890

# Email (SendGrid)
SENDGRID_API_KEY=your_api_key
SENDGRID_FROM_EMAIL=noreply@yourdomain.com

# Storage (Vercel Blob)
BLOB_READ_WRITE_TOKEN=your_blob_token

# App URL (for upload links)
NEXT_PUBLIC_APP_URL=https://yourdomain.com
```

## Integration Points

### Alert System Integration
- `checkAlerts` cron now creates messages automatically
- `dailySummary` cron now creates messages automatically
- Messages queued immediately when alerts are triggered

### Compliance System Integration
- Automatic compliance check on photo upload
- Warning system checks every hour (via cron)
- Compliance rates calculated on-demand for dashboard

## Testing

### Manual Testing Steps

1. **Test SMS Sending:**
   ```bash
   # Create a test message and trigger send
   curl -X POST http://localhost:3000/api/cron/send-pending \
     -H "x-cron-secret: your-secret"
   ```

2. **Test Photo Upload:**
   ```bash
   curl -X POST http://localhost:3000/api/upload \
     -F "token=<messageId>" \
     -F "file=@/path/to/image.jpg"
   ```

3. **Test Compliance Check:**
   ```bash
   curl -X POST http://localhost:3000/api/cron/check-compliance \
     -H "x-cron-secret: your-secret"
   ```

4. **Test Admin Dashboard:**
   ```bash
   curl -X GET http://localhost:3000/api/admin/compliance \
     -H "Authorization: Bearer <admin-token>"
   ```

## Cron Job Configuration

Add to Vercel Cron Jobs:
- `check-compliance`: Run every hour
  - Path: `/api/cron/check-compliance`
  - Schedule: `0 * * * *`

- `send-pending`: Run every 5 minutes
  - Path: `/api/cron/send-pending`
  - Schedule: `*/5 * * * *`

## Security Features

- Token-based upload (no login required)
- File type validation (images only)
- File size limits (10MB max)
- Secure token generation
- SQL injection protection (parameterized queries)
- Authentication required for admin endpoints

## Error Handling

- Graceful fallback when SMS/Email not configured
- Error logging for failed deliveries
- Retry logic for transient failures
- User-friendly error messages

## Next Steps (Milestone 3)

- Multi-city scaling enhancements
- Building login portal
- Editable message templates
- Enhanced dashboards
- Building activation/pause controls

## Notes

- Messages are queued immediately but sent asynchronously
- Compliance window is configurable per upload (default 2 hours)
- Delivery tracking helps identify communication issues
- Photo uploads are stored in Vercel Blob Storage
- System designed to handle high message volumes
