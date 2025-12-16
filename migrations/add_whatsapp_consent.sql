-- Migration: Add whatsapp_consent to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS whatsapp_consent BOOLEAN DEFAULT false;