# Interakt WhatsApp Webhook Setup

This document explains how to set up the Interakt WhatsApp webhook for handling message delivery status updates and other events.

## Webhook Endpoint

The webhook endpoint is available at:
```
POST /webhooks/interakt
```

## Environment Variables

Add the following environment variables to your `.env` file:

```env
# Interakt WhatsApp Configuration
INTERAKT_API_URL=https://api.interakt.ai/v1
INTERAKT_API_KEY=your_interakt_api_key
INTERAKT_SENDER=your_sender_id
INTERAKT_WEBHOOK_SECRET=your_webhook_secret_key
```

## Interakt Dashboard Configuration

1. **Set Webhook URL:**
   ```
   https://yourdomain.com/webhooks/interakt
   ```

2. **Set Secret Key:**
   - Use the same key in both your `.env` file and Interakt's "Secret key" field
   - The webhook verifies HMAC-SHA256 signatures for security

3. **Enable Required Webhooks:**
   - **API Messages:** `message_api_sent`, `message_api_delivered`, `message_api_read`, `message_api_failed`, `message_api_clicked`
   - **Campaign Messages:** `message_campaign_sent`, `message_campaign_delivered`, `message_campaign_read`, `message_campaign_failed`
   - **Incoming Messages:** `message_received`
   - **Account Events:** `account_alerts`, `account_update`, `account_review_update`, `business_capability_update`, `phone_number_quality_update`
   - **Template Events:** `template_performance_metrics`, `message_template_status_update`
   - **Workflow Events:** `workflow_response_update`

## Supported Webhook Events

### Message Status Events (API)
- `message_api_sent` - Message successfully sent
- `message_api_delivered` - Message delivered to recipient
- `message_api_read` - Message read by recipient
- `message_api_failed` - Message delivery failed
- `message_api_clicked` - Button clicked (Quick Reply or CTA)

### Message Status Events (Campaign)
- `message_campaign_sent` - Campaign message sent
- `message_campaign_delivered` - Campaign message delivered
- `message_campaign_read` - Campaign message read
- `message_campaign_failed` - Campaign message failed

### Incoming Messages
- `message_received` - Customer sent a message/reply

### Account & Template Events
- `account_alerts` - Account alerts and warnings
- `account_update` - Account status changes
- `account_review_update` - Account review status updates
- `business_capability_update` - Business capability changes
- `phone_number_quality_update` - Phone number quality updates
- `template_performance_metrics` - Template performance data
- `message_template_status_update` - Template approval status changes

### Workflow Events
- `workflow_response_update` - Customer responses in automated workflows

## Webhook Payload Structure

All webhooks follow this structure:

```json
{
  "version": "1.0",
  "timestamp": "2025-12-17T10:30:00.000Z",
  "type": "message_api_delivered",
  "data": {
    "customer": {
      "id": "customer-uuid",
      "channel_phone_number": "+919876543210",
      "traits": {
        "name": "Customer Name",
        "email": "customer@example.com"
      }
    },
    "message": {
      "id": "message-correlation-id",
      "message_status": "Delivered",
      "channel_failure_reason": null,
      "channel_error_code": null
    }
  }
}
```

## Correlation with Sent Messages

The `data.message.id` field contains the correlation ID returned when sending messages through the Interakt API. Use this to:

- Track message delivery status
- Handle failed messages with retry logic
- Update your database with message status
- Match button clicks to specific messages

## Security

The webhook includes HMAC-SHA256 signature verification:

- **Header:** `Interakt-Signature: sha256=hex_signature`
- **Algorithm:** HMAC-SHA256 with your webhook secret
- **Invalid signatures** are rejected with HTTP 401

## Logging

All webhook events are logged to:
- **Application logs** (via Winston logger)
- **API logs table** (via `createApiLog` function)

## Error Handling

- Webhook processing errors are logged but don't cause failures
- **HTTP 200** is always returned to prevent Interakt retry loops
- Failed signature verification returns **HTTP 401**

## Database Integration (TODO)

To fully utilize webhooks, implement database tracking:

```sql
CREATE TABLE message_status_logs (
  id SERIAL PRIMARY KEY,
  message_id VARCHAR(255) NOT NULL,
  event_type VARCHAR(100) NOT NULL,
  customer_phone VARCHAR(20),
  customer_name VARCHAR(255),
  status VARCHAR(50),
  failure_reason TEXT,
  error_code VARCHAR(10),
  click_type VARCHAR(20),
  button_text VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Testing

Run the webhook tests:

```bash
npm test -- tests/integration/interakt-webhook.int.test.js
```

## Local Development

For local development with ngrok:

```bash
ngrok http 4000
# Use: https://your-ngrok-url.ngrok.io/webhooks/interakt
```

## Example Webhook Payloads

### Message Delivered
```json
{
  "version": "1.0",
  "timestamp": "2025-12-17T10:30:00.000Z",
  "type": "message_api_delivered",
  "data": {
    "customer": {
      "channel_phone_number": "+919876543210",
      "traits": {"name": "John Doe"}
    },
    "message": {
      "id": "msg-12345",
      "message_status": "Delivered"
    }
  }
}
```

### Message Failed
```json
{
  "version": "1.0",
  "timestamp": "2025-12-17T10:30:00.000Z",
  "type": "message_api_failed",
  "data": {
    "customer": {
      "channel_phone_number": "+919876543210"
    },
    "message": {
      "id": "msg-12345",
      "channel_failure_reason": "Recipient is not a valid WhatsApp user",
      "channel_error_code": "1013"
    }
  }
}
```

### Button Clicked
```json
{
  "version": "1.0",
  "timestamp": "2025-12-17T10:30:00.000Z",
  "type": "message_api_clicked",
  "data": {
    "customer": {
      "channel_phone_number": "+919876543210"
    },
    "message": {"id": "msg-12345"}
  },
  "event": {
    "click_type": "QR",
    "button_text": "Confirm Order",
    "click_timestamp": "2025-12-17 10:30:00.000000"
  }
}
```