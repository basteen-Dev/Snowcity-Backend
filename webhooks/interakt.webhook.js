const express = require('express');
const crypto = require('crypto');
const logger = require('../config/logger');
const { createApiLog } = require('../models/apiLogs.model');

// Interakt WhatsApp webhook handler
// Handles webhook events from Interakt (message sent, delivered, read, failed, clicked, etc.)
module.exports = [
  express.json(),
  async (req, res) => {
    try {
      const payload = req.body || {};

      // Log the incoming webhook
      await createApiLog({
        endpoint: 'webhook:interakt',
        payload,
        response_code: 200,
        status: 'success',
      });

      logger.info('Interakt webhook received', {
        event_type: payload.event_type || payload.type,
        message_id: payload.id || payload.data?.message?.id,
        correlation_id: payload.id || payload.data?.message?.id,
        customer_phone: payload.data?.customer?.channel_phone_number,
        status: payload.status,
        timestamp: payload.timestamp,
      });

      // Verify signature if secret is configured
      const interaktSecret = process.env.INTERAKT_WEBHOOK_SECRET;
      if (interaktSecret) {
        const signature = req.headers['x-interakt-signature'] || req.headers['interakt-signature'] || req.headers['Interakt-Signature'];
        if (signature) {
          const expectedSignature = crypto
            .createHmac('sha256', interaktSecret)
            .update(JSON.stringify(payload))
            .digest('hex');

          // Handle both prefixed and non-prefixed signatures
          const prefixedSignature = `sha256=${expectedSignature}`;

          if (signature !== expectedSignature && signature !== prefixedSignature) {
            logger.warn('Interakt webhook signature verification failed', {
              received_signature: signature,
              expected_signature: prefixedSignature,
            });
            return res.status(401).json({ error: 'Invalid signature' });
          }
        } else {
          logger.warn('Interakt webhook received without signature');
        }
      }

      // Handle both payload formats: simple format (user's example) and complex format (current)
      const eventType = payload.event_type || payload.type;
      const messageId = payload.id || payload.data?.message?.id;
      const customerPhone = payload.data?.customer?.channel_phone_number;
      const customerName = payload.data?.customer?.traits?.name;

      // Handle different event types (supporting both simple and complex formats)
      switch (eventType) {
        // Simple format events (from user's example)
        case 'message_delivered':
        case 'delivered':
        case 'message_api_delivered':
          logger.info('Message delivered', {
            message_id: messageId,
            customer_phone: customerPhone,
            customer_name: customerName,
            status: payload.status
          });
          // TODO: Update message status to 'delivered' in database
          break;

        case 'message_read':
        case 'read':
        case 'message_api_read':
          logger.info('Message read', {
            message_id: messageId,
            customer_phone: customerPhone,
            customer_name: customerName,
            status: payload.status
          });
          // TODO: Update message status to 'read' in database
          break;

        case 'message_failed':
        case 'failed':
        case 'message_api_failed':
          const failureReason = payload.error || payload.failure_reason || payload.data?.message?.channel_failure_reason;
          const errorCode = payload.data?.message?.channel_error_code;
          logger.error('Message failed to deliver', {
            message_id: messageId,
            customer_phone: customerPhone,
            customer_name: customerName,
            failure_reason: failureReason,
            error_code: errorCode,
            status: payload.status
          });
          // TODO: Update message status to 'failed' in database and handle retry logic
          break;

        case 'message_replied':
        case 'replied':
          logger.info('Message replied', {
            message_id: messageId,
            customer_phone: customerPhone,
            customer_name: customerName,
            reply: payload.reply || payload.response,
            status: payload.status
          });
          // TODO: Handle incoming customer replies
          break;

        // API sent events
        case 'message_api_sent':
          logger.info('Message sent via API', {
            message_id: messageId,
            customer_phone: customerPhone,
            customer_name: customerName
          });
          // TODO: Update message status to 'sent' in database
          break;

        case 'message_api_clicked':
          const clickType = payload.event?.click_type;
          const buttonText = payload.event?.button_text;
          const buttonLink = payload.event?.button_link;
          logger.info('Message button clicked', {
            message_id: messageId,
            customer_phone: customerPhone,
            customer_name: customerName,
            click_type: clickType,
            button_text: buttonText,
            button_link: buttonLink,
            click_timestamp: payload.event?.click_timestamp
          });
          // TODO: Track button clicks for analytics
          break;

        case 'message_received':
          const incomingMessage = payload.data?.message?.message;
          logger.info('Incoming customer message received', {
            message_id: messageId,
            customer_phone: customerPhone,
            customer_name: customerName,
            incoming_message: incomingMessage
          });
          // TODO: Handle incoming customer messages/replies
          break;

        // Campaign message events
        case 'message_campaign_sent':
          logger.info('Campaign message sent', {
            message_id: messageId,
            customer_phone: customerPhone,
            customer_name: customerName
          });
          break;

        case 'message_campaign_delivered':
          logger.info('Campaign message delivered', {
            message_id: messageId,
            customer_phone: customerPhone,
            customer_name: customerName
          });
          break;

        case 'message_campaign_read':
          logger.info('Campaign message read', {
            message_id: messageId,
            customer_phone: customerPhone,
            customer_name: customerName
          });
          break;

        case 'message_campaign_failed':
          logger.error('Campaign message failed', {
            message_id: messageId,
            customer_phone: customerPhone,
            customer_name: customerName,
            failure_reason: payload.data?.message?.channel_failure_reason
          });
          break;

        // Account and template events
        case 'account_alerts':
          logger.warn('Account alert received', { payload });
          break;

        case 'account_update':
          logger.info('Account update received', { payload });
          break;

        case 'account_review_update':
          logger.info('Account review update', {
            decision: payload.data?.decision
          });
          break;

        case 'business_capability_update':
          logger.info('Business capability update', {
            max_daily_conversation: payload.data?.max_daily_conversation_per_phone,
            max_phone_numbers_per_waba: payload.data?.max_phone_numbers_per_waba
          });
          break;

        case 'phone_number_quality_update':
          logger.info('Phone number quality update', {
            phone_number: payload.data?.display_phone_number,
            event: payload.data?.event,
            current_limit: payload.data?.current_limit
          });
          break;

        case 'template_performance_metrics':
          logger.info('Template performance metrics', { payload });
          break;

        case 'message_template_status_update':
          logger.info('Template status update', {
            template_id: payload.data?.message_template_id,
            template_name: payload.data?.message_template_name,
            event: payload.data?.event,
            reason: payload.data?.reason
          });
          break;

        case 'workflow_response_update':
          logger.info('Workflow response update', {
            workflow_id: payload.data?.workflow_id,
            customer_id: payload.data?.customer_id,
            customer_number: payload.data?.customer_number,
            responses_count: payload.data?.data?.length || 0
          });
          break;

        default:
          logger.info('Unknown Interakt event type', {
            event_type: eventType,
            message_id: messageId,
            payload_keys: Object.keys(payload)
          });
      }

      // Always respond with 200 to acknowledge receipt
      return res.status(200).json({
        received: true,
        message_id: messageId,
        event_type: eventType,
        processed_at: new Date().toISOString()
      });

    } catch (err) {
      logger.error('Interakt webhook error', {
        err: err.message,
        stack: err.stack
      });

      // Still return 200 to prevent Interakt from retrying with errors
      return res.status(200).json({
        received: true,
        error: 'Internal processing error'
      });
    }
  },
];