require('dotenv').config();

console.log('🔍 COMPREHENSIVE TIMING DEBUG...');
console.log('\n🚨 ISSUE: User still seeing wrong slot time despite fixes');

console.log('\n🔧 POSSIBLE CAUSES:');
console.log('1. Browser cache - old JavaScript code');
console.log('2. Different API endpoint being used');
console.log('3. Database has old incorrect data');
console.log('4. Multiple code paths for booking display');
console.log('5. Timezone conversion in display layer');
console.log('6. Server not restarted with new code');

console.log('\n📋 DEBUGGING CHECKLIST:');

console.log('\n1️⃣ BROWSER CACHE CHECK:');
console.log('   - Clear browser cache (Ctrl+Shift+R)');
console.log('   - Hard refresh the page');
console.log('   - Check browser console for errors');
console.log('   - Verify new DEBUG logs appear in console');

console.log('\n2️⃣ SERVER RESTART CHECK:');
console.log('   - Stop the server (Ctrl+C)');
console.log('   - Restart with npm start');
console.log('   - Verify server shows new startup message');
console.log('   - Check server logs for DEBUG output');

console.log('\n3️⃣ API ENDPOINT CHECK:');
console.log('   - Check which API endpoints are being called');
console.log('   - Verify /api/bookings/create is being used');
console.log('   - Check /api/bookings/my-bookings response');
console.log('   - Look for any alternative booking endpoints');

console.log('\n4️⃣ DATABASE DATA CHECK:');
console.log('   - Connect to database directly');
console.log('   - SELECT * FROM bookings ORDER BY created_at DESC LIMIT 5;');
console.log('   - Check slot_start_time and slot_end_time values');
console.log('   - Verify data matches what user selected');

console.log('\n5️⃣ FRONTEND DATA FLOW CHECK:');
console.log('   - Check browser Network tab during booking');
console.log('   - Verify request payload contains correct timing');
console.log('   - Check response data from booking creation');
console.log('   - Verify MyBookings API response contains timing');

console.log('\n6️⃣ DISPLAY LOGIC CHECK:');
console.log('   - Check getSlotDisplay function in MyBookings.jsx');
console.log('   - Verify formatTime function works correctly');
console.log('   - Check if booking_time is being used as fallback');
console.log('   - Look for timezone conversion in display');

console.log('\n🧪 IMMEDIATE TESTS:');

// Test all timing functions
console.log('\n🕐 TIMING FUNCTION TESTS:');

const formatTime12Hour = (time24) => {
  if (!time24) return '';
  const [hours, minutes] = time24.split(':');
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minutes} ${ampm}`;
};

const formatTime = (timeStr) => {
  if (!timeStr) return '';
  const [h, m] = String(timeStr).split(':');
  if (!h || !m) return '';
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const h12 = hour % 12 || 12;
  return `${h12}:${m} ${ampm}`;
};

const getSlotDisplay = (item) => {
  const start = formatTime(item.slot_start_time || item.start_time);
  const end = formatTime(item.slot_end_time || item.end_time);
  
  if (start && end) return `${start} - ${end}`;
  if (start) return start;
  if (item.slot_label) return item.slot_label;
  
  return formatTime(item.booking_time) || 'Slot Time';
};

// Test with correct data
console.log('\n✅ Test with correct data:');
const correctData = {
  slot_start_time: '10:00:00',
  slot_end_time: '12:00:00',
  slot_label: '10:00 AM - 12:00 PM',
  booking_time: '10:00:00'
};

console.log('Input data:', correctData);
console.log('getSlotDisplay result:', getSlotDisplay(correctData));

// Test with wrong data (what user might be seeing)
console.log('\n❌ Test with wrong data:');
const wrongData = {
  slot_start_time: '08:10:00',
  slot_end_time: '10:10:00',
  slot_label: '8:10 AM - 10:10 AM',
  booking_time: '08:10:00'
};

console.log('Input data:', wrongData);
console.log('getSlotDisplay result:', getSlotDisplay(wrongData));

// Test with missing slot timing (fallback to booking_time)
console.log('\n⚠️ Test with missing slot timing:');
const missingData = {
  slot_start_time: null,
  slot_end_time: null,
  slot_label: null,
  booking_time: '08:10:00'
};

console.log('Input data:', missingData);
console.log('getSlotDisplay result:', getSlotDisplay(missingData));

console.log('\n🎯 DIAGNOSIS:');
console.log('If user sees wrong timing, check:');
console.log('1. Are slot_start_time/slot_end_time null in database?');
console.log('2. Is booking_time wrong in database?');
console.log('3. Is virtual slot ID parsing still overriding?');
console.log('4. Is old cached code running in browser?');

console.log('\n🚀 IMMEDIATE ACTIONS:');
console.log('1. 🔄 Restart backend server');
console.log('2. 🗑️ Clear browser cache');
console.log('3. 🧪 Make new booking with browser console open');
console.log('4. 📋 Check for DEBUG logs in both browser and server');
console.log('5. 🔍 Check Network tab for request/response data');

console.log('\n📱 USER TESTING INSTRUCTIONS:');
console.log('1. Open browser Developer Tools (F12)');
console.log('2. Go to Console tab');
console.log('3. Make a new booking selecting specific time');
console.log('4. Look for "🔍 DEBUG" messages in console');
console.log('5. Check Network tab for booking API calls');
console.log('6. Share the console logs and network data');

console.log('\n🔧 IF ISSUE PERSISTS:');
console.log('1. Check if there are multiple booking creation endpoints');
console.log('2. Verify database schema has slot_start_time/end_time columns');
console.log('3. Check if any caching layer is interfering');
console.log('4. Look for any background jobs updating booking times');
console.log('5. Check if frontend is using old bundled JavaScript');

console.log('\n✨ NEXT STEPS:');
console.log('Please perform the immediate actions above and share:');
console.log('- Browser console DEBUG logs');
console.log('- Network tab request/response data');
console.log('- Server console output during booking');
console.log('- Database query results for recent bookings');
