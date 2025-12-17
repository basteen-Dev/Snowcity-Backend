const request = require('supertest');
const app = require('../../app');
const { createApiLog } = require('../../models/apiLogs.model');

describe('Interakt Webhook', () => {
  beforeEach(async () => {
    // Clear any existing logs if needed
  });

  it('should handle message_api_delivered event', async () => {
    const webhookPayload = {
      version: "1.0",
      timestamp: "2025-12-17T10:30:00.000Z",
      type: "message_api_delivered",
      data: {
        customer: {
          id: "test-customer-id",
          channel_phone_number: "919876543210",
          traits: {
            name: "Test Customer"
          }
        },
        message: {
          id: "6c2d7175-fddd-4fbf-b0eb-084f170dbe08",
          message_status: "Delivered"
        }
      }
    };

    const response = await request(app)
      .post('/webhooks/interakt')
      .send(webhookPayload)
      .set('Content-Type', 'application/json');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('received', true);
    expect(response.body).toHaveProperty('message_id', webhookPayload.data.message.id);
    expect(response.body).toHaveProperty('event_type', webhookPayload.type);
  });

  it('should handle message_api_failed event', async () => {
    const webhookPayload = {
      version: "1.0",
      timestamp: "2025-12-17T10:30:00.000Z",
      type: "message_api_failed",
      data: {
        customer: {
          id: "test-customer-id",
          channel_phone_number: "919876543210",
          traits: {
            name: "Test Customer"
          }
        },
        message: {
          id: "failed-message-id",
          message_status: "Failed",
          channel_failure_reason: "Recipient is not a valid WhatsApp user",
          channel_error_code: "1013"
        }
      }
    };

    const response = await request(app)
      .post('/webhooks/interakt')
      .send(webhookPayload)
      .set('Content-Type', 'application/json');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('received', true);
  });

  it('should handle message_api_clicked event', async () => {
    const webhookPayload = {
      version: "1.0",
      timestamp: "2025-12-17T10:30:00.000Z",
      type: "message_api_clicked",
      data: {
        customer: {
          id: "test-customer-id",
          channel_phone_number: "919876543210",
          traits: {
            name: "Test Customer"
          }
        },
        message: {
          id: "clicked-message-id"
        }
      },
      event: {
        click_type: "QR",
        button_text: "Confirm Order",
        click_timestamp: "2025-12-17 10:30:00.000000"
      }
    };

    const response = await request(app)
      .post('/webhooks/interakt')
      .send(webhookPayload)
      .set('Content-Type', 'application/json');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('received', true);
  });

  it('should handle message_received event', async () => {
    const webhookPayload = {
      version: "1.0",
      timestamp: "2025-12-17T10:30:00.000Z",
      type: "message_received",
      data: {
        customer: {
          id: "test-customer-id",
          channel_phone_number: "919876543210",
          traits: {
            name: "Test Customer"
          }
        },
        message: {
          id: "incoming-message-id",
          message: "Hello, I need help with my order"
        }
      }
    };

    const response = await request(app)
      .post('/webhooks/interakt')
      .send(webhookPayload)
      .set('Content-Type', 'application/json');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('received', true);
  });

  it('should handle account_update event', async () => {
    const webhookPayload = {
      version: "1.0",
      timestamp: "2025-12-17T10:30:00.000Z",
      type: "account_update",
      data: {
        phone_number: "16505551111",
        event: "VERIFIED_ACCOUNT"
      }
    };

    const response = await request(app)
      .post('/webhooks/interakt')
      .send(webhookPayload)
      .set('Content-Type', 'application/json');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('received', true);
  });

  it('should handle unknown event types', async () => {
    const webhookPayload = {
      version: "1.0",
      timestamp: "2025-12-17T10:30:00.000Z",
      type: "unknown_event_type",
      data: {
        message: {
          id: "unknown-event-id"
        }
      }
    };

    const response = await request(app)
      .post('/webhooks/interakt')
      .send(webhookPayload)
      .set('Content-Type', 'application/json');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('received', true);
  });
});