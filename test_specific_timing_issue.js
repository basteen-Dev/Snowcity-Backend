require('dotenv').config();

console.log('🎯 DEBUGGING SPECIFIC TIMING ISSUE...');
console.log('\n🚨 USER REPORT:');
console.log('Selected: 10:00 AM - 12:00 PM');
console.log('Showing: 8:03 AM - 10:03 AM');
console.log('Date: 29 Nov, 2025');

console.log('\n🔍 STEP-BY-STEP ANALYSIS:');

// Step 1: Check what virtual slot IDs are generated for 10:00 AM
console.log('\n📅 Step 1: Virtual Slot ID Generation for 10:00 AM');

function generateDynamicSlotsForDateRange(comboId, startDate, endDate, slotDuration) {
  const slots = [];
  const startHour = 10; // 10:00 AM
  const endHour = 20;   // 8:00 PM

  const current = new Date(startDate);
  console.log('   Current date object:', current);
  console.log('   Current date toString:', current.toString());
  console.log('   Current date toISOString:', current.toISOString());

  // Generate slots for the complete date range
  while (current <= endDate) {
    const dateStr = current.toISOString().slice(0, 10);
    console.log('   Date string (toISOString):', dateStr);

    // Generate slots throughout the day
    for (let hour = startHour; hour + slotDuration <= endHour; hour++) {
      const startTime = `${hour.toString().padStart(2, '0')}:00:00`;
      const endTime = `${(hour + slotDuration).toString().padStart(2, '0')}:00:00`;

      // Generate virtual slot ID
      const virtualSlotId = `${comboId}-${dateStr.replace(/-/g, '')}-${hour.toString().padStart(2, '0')}`;
      
      console.log(`   Hour ${hour}:`);
      console.log(`     Start time: ${startTime}`);
      console.log(`     End time: ${endTime}`);
      console.log(`     Virtual slot ID: ${virtualSlotId}`);

      if (hour === 10) { // Focus on 10:00 AM slot
        console.log('   🎯 FOUND 10:00 AM SLOT:');
        console.log(`     Virtual slot ID: ${virtualSlotId}`);
        console.log(`     Start time: ${startTime}`);
        console.log(`     End time: ${endTime}`);
        return { virtualSlotId, startTime, endTime };
      }
    }

    current.setDate(current.getDate() + 1);
  }

  return null;
}

// Test for today's date
const today = new Date('2025-11-29');
const slot10AM = generateDynamicSlotsForDateRange(1, today, today, 2);

console.log('\n📤 Step 2: What frontend should send to backend');

// Simulate what frontend sends when user selects 10:00 AM - 12:00 PM
const frontendPayload = {
  item_type: 'Combo',
  combo_id: 1,
  combo_slot_id: slot10AM.virtualSlotId,
  slotLabel: '10:00 AM - 12:00 PM',
  slot: {
    combo_slot_id: slot10AM.virtualSlotId,
    combo_id: 1,
    start_date: '2025-11-29',
    start_time: slot10AM.startTime,
    end_time: slot10AM.endTime,
    capacity: 300,
    price: 850
  },
  quantity: 1,
  booking_date: '2025-11-29'
};

console.log('   Frontend payload:', JSON.stringify(frontendPayload, null, 2));

console.log('\n🔧 Step 3: Backend processing');

// Simulate backend normalizeCreateItem
const normalizeCreateItem = (input = {}) => {
  console.log('   Backend input:', input);
  
  const slot_label = input.slot_label || input.slotLabel || null;
  const slot_start_time = input.slot_start_time || input.slotStartTime || null;
  const slot_end_time = input.slot_end_time || input.slotEndTime || null;
  
  console.log('   Extracted timing:');
  console.log(`     slot_label: ${slot_label}`);
  console.log(`     slot_start_time: ${slot_start_time}`);
  console.log(`     slot_end_time: ${slot_end_time}`);
  
  return { slot_label, slot_start_time, slot_end_time };
};

const backendResult = normalizeCreateItem(frontendPayload);
console.log('   Backend result:', backendResult);

console.log('\n🗄️ Step 4: Booking model processing');

// Simulate booking model virtual slot ID parsing
const processBookingModel = (fields) => {
  let slot_start_time = fields.slot_start_time;
  let slot_end_time = fields.slot_end_time;
  let booking_time = fields.booking_time;
  
  console.log('   Model input timing:');
  console.log(`     slot_start_time: ${slot_start_time}`);
  console.log(`     slot_end_time: ${slot_end_time}`);
  console.log(`     booking_time: ${booking_time}`);
  
  const combo_slot_id = fields.combo_slot_id;
  console.log(`   combo_slot_id: ${combo_slot_id}`);
  
  if (combo_slot_id && typeof combo_slot_id === 'string' && combo_slot_id.includes('-')) {
    console.log('   Parsing virtual slot ID...');
    const parts = combo_slot_id.split('-');
    console.log('   Slot ID parts:', parts);
    
    const hour = parseInt(parts[parts.length - 1]);
    console.log(`   Parsed hour: ${hour}`);
    
    const parsed_booking_time = `${String(hour).padStart(2, '0')}:00:00`;
    const parsed_start_time = parsed_booking_time;
    const parsed_end_time = `${String((hour + 2) % 24).padStart(2, '0')}:00:00`;
    
    console.log('   Parsed timing:');
    console.log(`     parsed_booking_time: ${parsed_booking_time}`);
    console.log(`     parsed_start_time: ${parsed_start_time}`);
    console.log(`     parsed_end_time: ${parsed_end_time}`);
    
    // Only use parsed times if frontend didn't provide timing
    if (!slot_start_time) slot_start_time = parsed_start_time;
    if (!slot_end_time) slot_end_time = parsed_end_time;
    if (!booking_time) booking_time = parsed_booking_time;
    
    console.log('   Final timing after processing:');
    console.log(`     booking_time: ${booking_time}`);
    console.log(`     slot_start_time: ${slot_start_time}`);
    console.log(`     slot_end_time: ${slot_end_time}`);
  }
  
  return { booking_time, slot_start_time, slot_end_time };
};

const modelResult = processBookingModel({
  ...frontendPayload,
  slot_start_time: backendResult.slot_start_time,
  slot_end_time: backendResult.slot_end_time
});

console.log('   Model result:', modelResult);

console.log('\n📱 Step 5: Display formatting');

// Format time for display
const formatTime12Hour = (time24) => {
  if (!time24) return '';
  const [hours, minutes] = time24.split(':');
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minutes} ${ampm}`;
};

const displayStart = formatTime12Hour(modelResult.slot_start_time);
const displayEnd = formatTime12Hour(modelResult.slot_end_time);
const displayText = `${displayStart} - ${displayEnd}`;

console.log('   Display timing:', displayText);

console.log('\n🎯 COMPARISON:');
console.log(`   User selected: 10:00 AM - 12:00 PM`);
console.log(`   System shows: ${displayText}`);
console.log(`   Match: ${displayText === '10:00 AM - 12:00 PM' ? '✅ YES' : '❌ NO'}`);

if (displayText !== '10:00 AM - 12:00 PM') {
  console.log('\n🚨 ISSUE IDENTIFIED:');
  console.log('   The timing is being corrupted somewhere in the process');
  console.log('   Need to check actual browser console and server logs');
} else {
  console.log('\n✅ TIMING SHOULD BE CORRECT');
  console.log('   Issue might be elsewhere (browser cache, different code path, etc.)');
}

console.log('\n🔍 NEXT DEBUGGING STEPS:');
console.log('1. Check browser console for DEBUG logs during booking');
console.log('2. Check server logs for DEBUG output');
console.log('3. Compare actual values with expected values');
console.log('4. Check if there are multiple code paths for booking');
