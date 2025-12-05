BEGIN;

-- Sample users (dev only). These use proper bcrypt hashes for 'password123'
INSERT INTO users (name, email, phone, password_hash, otp_verified)
VALUES
('Alice', 'alice@example.com', '+10000000001', '$2b$10$XIx899rMxUsYWhJP.izHCOuTQvXH3rFJanRV8zV83wvWntyE1Zjju', TRUE),
('Bob', 'bob@example.com', '+10000000002', '$2b$10$XIx899rMxUsYWhJP.izHCOuTQvXH3rFJanRV8zV83wvWntyE1Zjju', TRUE),
('Charlie', 'charlie@example.com', '+10000000003', '$2b$10$XIx899rMxUsYWhJP.izHCOuTQvXH3rFJanRV8zV83wvWntyE1Zjju', TRUE)
ON CONFLICT (email) DO NOTHING;

COMMIT;