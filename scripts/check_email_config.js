require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env') });

const { email } = require('../config/messaging');

console.log('Email Configuration Check:');
console.log('SMTP Host:', email.smtpHost ? 'Set' : 'NOT SET');
console.log('SMTP Port:', email.smtpPort ? email.smtpPort : 'NOT SET');
console.log('SMTP User:', email.smtpUser ? 'Set' : 'NOT SET');
console.log('SMTP Pass:', email.smtpPass ? 'Set' : 'NOT SET');
console.log('From Email:', email.from);

if (email.smtpHost && email.smtpUser && email.smtpPass) {
  console.log('✅ Email config appears complete.');
} else {
  console.log('❌ Email config is incomplete. Missing SMTP credentials.');
}