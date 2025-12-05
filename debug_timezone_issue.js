require('dotenv').config();

console.log('🌍 DEBUGGING TIMEZONE ISSUE...');
console.log('\n🚨 SYMPTOM:');
console.log('User selected 10:00 AM - 12:00 PM');
console.log('System showing 8:03 AM - 10:03 AM');
console.log('Current UTC time:', new Date().toISOString());

console.log('\n🔍 POTENTIAL TIMEZONE ISSUES:');

// Check current times
const now = new Date();
console.log('\n📅 Current Time Analysis:');
console.log('Local time:', now.toLocaleString());
console.log('UTC time:', now.toISOString());
console.log('Local hours:', now.getHours());
console.log('UTC hours:', now.getUTCHours());

// Calculate timezone offset
const offset = now.getTimezoneOffset();
console.log('Timezone offset (minutes):', offset);
console.log('Timezone offset (hours):', offset / 60);

// Test time conversion issues
console.log('\n🕐 Time Conversion Tests:');

// Test 10:00 AM local time
const local10AM = new Date();
local10AM.setHours(10, 0, 0, 0);
console.log('10:00 AM local:', local10AM.toLocaleString());
console.log('10:00 AM UTC:', local10AM.toISOString());

// Test what happens if we treat 10:00 AM as UTC
const utc10AM = new Date();
utc10AM.setUTCHours(10, 0, 0, 0);
console.log('10:00 AM UTC (converted to local):', utc10AM.toLocaleString());

// Test the specific case: user selected 10:00 AM - 12:00 PM
console.log('\n🎯 User Selection Analysis:');
console.log('User selected: 10:00 AM - 12:00 PM (local time)');

// If system incorrectly treats this as UTC:
const utcStart = new Date();
utcStart.setUTCHours(10, 0, 0, 0);
const utcEnd = new Date();
utcEnd.setUTCHours(12, 0, 0, 0);

console.log('If treated as UTC:');
console.log('  Start UTC:', utcStart.toISOString());
console.log('  Start Local:', utcStart.toLocaleString());
console.log('  End UTC:', utcEnd.toISOString());
console.log('  End Local:', utcEnd.toLocaleString());

// Check if this matches the wrong output (8:03 AM - 10:03 AM)
console.log('\n🔍 Comparing with wrong output:');
console.log('Wrong start: 8:03 AM');
console.log('Wrong end: 10:03 AM');
console.log('UTC start converted to local:', utcStart.toLocaleString([], { hour: '2-digit', minute: '2-digit' }));
console.log('UTC end converted to local:', utcEnd.toLocaleString([], { hour: '2-digit', minute: '2-digit' }));

// Test virtual slot ID generation
console.log('\n🎰 Virtual Slot ID Analysis:');

function generateVirtualSlotId(date, hour) {
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
  return `${dateStr}-${hour}`;
}

// Test for today at 10:00 AM
const today = new Date();
const virtualId10AM = generateVirtualSlotId(today, 10);
const virtualId8AM = generateVirtualSlotId(today, 8);

console.log('Virtual slot ID for 10:00 AM:', virtualId10AM);
console.log('Virtual slot ID for 8:00 AM:', virtualId8AM);

// Test parsing
function parseVirtualSlotId(slotId) {
  if (typeof slotId === 'string' && slotId.includes('-')) {
    const parts = slotId.split('-');
    const hour = parseInt(parts[parts.length - 1]);
    return hour;
  }
  return null;
}

console.log('Parsed hour from 10:00 AM slot:', parseVirtualSlotId(virtualId10AM));
console.log('Parsed hour from 8:00 AM slot:', parseVirtualSlotId(virtualId8AM));

console.log('\n🎯 LIKELY CAUSE:');
console.log('1. Timezone conversion issue in slot generation or display');
console.log('2. Virtual slot ID using UTC time instead of local time');
console.log('3. Booking time stored in UTC but displayed as local incorrectly');

console.log('\n✨ DEBUGGING STEPS:');
console.log('1. Check browser console for timing values');
console.log('2. Check network request payload');
console.log('3. Check server logs for timing values');
console.log('4. Verify database stored values');
console.log('5. Check display logic timezone handling');

console.log('\n📱 USER ACTION PLAN:');
console.log('1. Make a new booking selecting 10:00 AM - 12:00 PM');
console.log('2. Check browser console for DEBUG logs');
console.log('3. Check network tab for request payload');
console.log('4. Check server logs for DEBUG output');
console.log('5. Share the logs for analysis');
