require('dotenv').config();

console.log('🧪 TESTING BOOKING FLOW...');
console.log('\n🎯 Simulating user selecting 2:00 PM - 4:00 PM slot');

// Test the normalizeBookingCreatePayload function
const toYMD = (d) => {
  if (typeof d === 'string') {
    return d;
  }
  const date = new Date(d);
  return date.getFullYear() + '-' + 
         String(date.getMonth() + 1).padStart(2, '0') + '-' + 
         String(date.getDate()).padStart(2, '0');
};

const getVal = (obj, keys) => {
  for (const k of keys) {
    if (obj[k] !== undefined && obj[k] !== null && obj[k] !== '') return obj[k];
  }
  return null;
};

// Simulate the frontend normalizeBookingCreatePayload function
const normalizeBookingCreatePayload = (p = {}) => {
  console.log('🔍 DEBUG normalizeBookingCreatePayload input:', p);
  
  // 1. Determine Type
  const rawType = p.item_type || p.itemType || '';
  const hasComboId = !!getVal(p, ['combo_id', 'comboId']);
  const hasAttrId = !!getVal(p, ['attraction_id', 'attractionId']);

  let isCombo = false;
  if (rawType.toLowerCase() === 'combo') isCombo = true;
  else if (hasComboId && !hasAttrId) isCombo = true;

  // 2. Construct NEW clean object (Whitelist approach)
  const clean = {
    quantity: Number(getVal(p, ['quantity', 'qty']) || 1),
    booking_date: toYMD(getVal(p, ['booking_date', 'date', 'bookingDate']) || new Date()),
    // Pass through context
    coupon_code: getVal(p, ['coupon_code', 'couponCode', 'code']),
    offer_id: getVal(p, ['offer_id', 'offerId']),
    // Add slot timing information
    slot_label: getVal(p, ['slotLabel', 'slot_label']),
    slot_start_time: getVal(p, ['slot', 'slot'])?.start_time,
    slot_end_time: getVal(p, ['slot', 'slot'])?.end_time,
  };
  
  console.log('🔍 DEBUG extracted slot timing:', {
    slot_label: clean.slot_label,
    slot_start_time: clean.slot_start_time,
    slot_end_time: clean.slot_end_time,
    slot_object: getVal(p, ['slot', 'slot'])
  });

  if (isCombo) {
    clean.item_type = 'Combo';
    clean.attraction_id = null;
    clean.slot_id = null;
    clean.combo_id = getVal(p, ['combo_id', 'comboId']);
    clean.combo_slot_id = getVal(p, ['combo_slot_id', 'comboSlotId']);
  } else {
    clean.item_type = 'Attraction';
    clean.combo_id = null;
    clean.combo_slot_id = null;
    clean.attraction_id = getVal(p, ['attraction_id', 'attractionId']);
    clean.slot_id = getVal(p, ['slot_id', 'slotId']);
  }

  return clean;
};

// Test case 1: User selects 2:00 PM - 4:00 PM combo slot
console.log('\n📋 Test Case 1: Combo slot 2:00 PM - 4:00 PM');
const comboPayload = {
  item_type: 'Combo',
  combo_id: 1,
  combo_slot_id: '1-20251129-14', // Virtual slot ID for 2:00 PM
  slotLabel: '2:00 PM - 4:00 PM',
  slot: {
    combo_slot_id: '1-20251129-14',
    combo_id: 1,
    start_date: '2025-11-29',
    start_time: '14:00:00',
    end_time: '16:00:00',
    capacity: 300,
    price: 850
  },
  quantity: 1,
  booking_date: '2025-11-29'
};

const normalizedCombo = normalizeBookingCreatePayload(comboPayload);
console.log('✅ Normalized combo payload:', normalizedCombo);

// Test case 2: User selects 2:00 PM - 3:00 PM attraction slot
console.log('\n📋 Test Case 2: Attraction slot 2:00 PM - 3:00 PM');
const attractionPayload = {
  item_type: 'Attraction',
  attraction_id: 2,
  slot_id: '2-20251129-14', // Virtual slot ID for 2:00 PM
  slotLabel: '2:00 PM - 3:00 PM',
  slot: {
    slot_id: '2-20251129-14',
    attraction_id: 2,
    start_date: '2025-11-29',
    start_time: '14:00:00',
    end_time: '15:00:00',
    capacity: 300,
    price: 425
  },
  quantity: 1,
  booking_date: '2025-11-29'
};

const normalizedAttraction = normalizeBookingCreatePayload(attractionPayload);
console.log('✅ Normalized attraction payload:', normalizedAttraction);

// Test case 3: Check what happens with wrong slot ID format
console.log('\n📋 Test Case 3: Wrong slot ID format');
const wrongPayload = {
  item_type: 'Combo',
  combo_id: 1,
  combo_slot_id: '20251129-7', // This would parse as 7:00 AM
  slotLabel: '2:00 PM - 4:00 PM', // But label says 2:00 PM
  slot: {
    combo_slot_id: '20251129-7',
    combo_id: 1,
    start_date: '2025-11-29',
    start_time: '14:00:00',
    end_time: '16:00:00',
    capacity: 300,
    price: 850
  },
  quantity: 1,
  booking_date: '2025-11-29'
};

const normalizedWrong = normalizeBookingCreatePayload(wrongPayload);
console.log('✅ Normalized wrong payload:', normalizedWrong);

// Test the backend virtual slot ID parsing
console.log('\n🔧 Testing Backend Virtual Slot ID Parsing:');

function testVirtualSlotParsing(slotId, itemType) {
  console.log(`\n🎰 Testing ${itemType} slot ID: ${slotId}`);
  
  let booking_time = null;
  let slot_start_time = null;
  let slot_end_time = null;
  
  if (slotId && typeof slotId === 'string' && slotId.includes('-')) {
    const parts = slotId.split('-');
    console.log('   Slot ID parts:', parts);
    
    if (parts.length >= 2) {
      const hourStr = parts[parts.length - 1]; // Get the last part as hour
      const hour = parseInt(hourStr);
      console.log('   Parsed hour:', hour);
      
      booking_time = `${String(hour).padStart(2, '0')}:00:00`;
      
      if (itemType === 'Combo') {
        slot_start_time = booking_time;
        slot_end_time = `${String((hour + 2) % 24).padStart(2, '0')}:00:00`;
      } else {
        slot_start_time = booking_time;
        slot_end_time = `${String((hour + 1) % 24).padStart(2, '0')}:00:00`;
      }
      
      console.log('   Result times:', {
        booking_time,
        slot_start_time,
        slot_end_time
      });
    }
  }
  
  return { booking_time, slot_start_time, slot_end_time };
}

// Test different slot ID formats
const testSlotIds = [
  '1-20251129-14', // Correct format for 2:00 PM
  '20251129-14',   // Missing prefix
  '1-20251129-7',  // 7:00 AM
  '20251129-7',    // 7:00 AM without prefix
  '14',            // Just hour
  'invalid'        // Invalid format
];

testSlotIds.forEach(slotId => {
  testVirtualSlotParsing(slotId, 'Combo');
});

console.log('\n🎯 FINDINGS:');
console.log('1. Frontend correctly extracts slot timing from slot object');
console.log('2. Backend virtual slot ID parsing depends on format');
console.log('3. If slot_id is "20251129-7", it parses as 7:00 AM');
console.log('4. If slot_id is "1-20251129-14", it parses as 2:00 PM');
console.log('5. The issue might be virtual slot ID format mismatch');

console.log('\n✨ SOLUTION:');
console.log('1. Check what virtual slot ID format is being generated');
console.log('2. Ensure virtual slot ID format matches parsing logic');
console.log('3. Use slot object timing instead of parsing virtual ID');
console.log('4. Add validation to detect timing mismatches');
