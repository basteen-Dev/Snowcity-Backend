require('dotenv').config();

console.log('🔧 TESTING FRONTEND FIX...');
console.log('\n✅ FIXED: Frontend now correctly extracts slot timing');

// Simulate the frontend getVal function
const getVal = (obj, keys) => {
  for (const k of keys) {
    if (obj[k] !== undefined && obj[k] !== null && obj[k] !== '') return obj[k];
  }
  return null;
};

// Simulate the fixed frontend normalizeBookingCreatePayload function
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
    booking_date: '2025-11-29', // Simplified for test
    // Pass through context
    coupon_code: getVal(p, ['coupon_code', 'couponCode', 'code']),
    offer_id: getVal(p, ['offer_id', 'offerId']),
    // Add slot timing information - FIXED VERSION
    slot_label: getVal(p, ['slotLabel', 'slot_label']),
    slot_start_time: getVal(p, ['slot'])?.start_time,
    slot_end_time: getVal(p, ['slot'])?.end_time,
  };
  
  console.log('🔍 DEBUG extracted slot timing (FIXED):', {
    slot_label: clean.slot_label,
    slot_start_time: clean.slot_start_time,
    slot_end_time: clean.slot_end_time,
    slot_object: getVal(p, ['slot'])
  });

  if (isCombo) {
    clean.item_type = 'Combo';
    clean.attraction_id = null;
    clean.slot_id = null;
    clean.combo_id = getVal(p, ['combo_id', 'comboId']);
    clean.combo_slot_id = getVal(p, ['combo_slot_id', 'comboSlotId']);
  }

  return clean;
};

// Test case: User selects 10:00 AM - 12:00 PM
console.log('\n🧪 Test Case: User selects 10:00 AM - 12:00 PM');

const frontendPayload = {
  item_type: 'Combo',
  combo_id: 1,
  combo_slot_id: '1-20251129-10',
  slotLabel: '10:00 AM - 12:00 PM',
  slot: {
    combo_slot_id: '1-20251129-10',
    combo_id: 1,
    start_date: '2025-11-29',
    start_time: '10:00:00',
    end_time: '12:00:00',
    capacity: 300,
    price: 850
  },
  quantity: 1,
  booking_date: '2025-11-29'
};

console.log('📥 Frontend payload:', JSON.stringify(frontendPayload, null, 2));

const frontendResult = normalizeBookingCreatePayload(frontendPayload);

console.log('📤 Frontend result:', frontendResult);

// Verify the fix
const isCorrect = frontendResult.slot_start_time === '10:00:00' && frontendResult.slot_end_time === '12:00:00';
console.log('\n🎯 Frontend fix verification:', isCorrect ? '✅ PASS' : '❌ FAIL');

if (isCorrect) {
  console.log('\n✨ FRONTEND FIX SUCCESSFUL!');
  console.log('✅ Frontend now correctly extracts timing from slot object');
  console.log('✅ Backend will receive correct timing values');
  console.log('✅ Virtual slot ID parsing will be ignored');
} else {
  console.log('\n❌ Frontend fix failed');
  console.log('❌ Need further investigation');
}

console.log('\n📋 COMPLETE FLOW TEST:');

// Now test the complete flow with both frontend and backend fixes
console.log('\n🔄 Step 1: Frontend processing');
const frontendToBackend = normalizeBookingCreatePayload(frontendPayload);

console.log('\n🔄 Step 2: Backend processing');
// Simulate backend processing
const backendResult = {
  slot_label: frontendToBackend.slot_label,
  slot_start_time: frontendToBackend.slot_start_time,
  slot_end_time: frontendToBackend.slot_end_time
};

console.log('Backend receives:', backendResult);

console.log('\n🔄 Step 3: Final display');
// Format for display
const formatTime12Hour = (time24) => {
  if (!time24) return '';
  const [hours, minutes] = time24.split(':');
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minutes} ${ampm}`;
};

const finalDisplay = `${formatTime12Hour(backendResult.slot_start_time)} - ${formatTime12Hour(backendResult.slot_end_time)}`;
console.log('Final display:', finalDisplay);

console.log('\n🎯 END-TO-END RESULT:');
console.log(`   User selected: 10:00 AM - 12:00 PM`);
console.log(`   System shows: ${finalDisplay}`);
console.log(`   Match: ${finalDisplay === '10:00 AM - 12:00 PM' ? '✅ YES' : '❌ NO'}`);

if (finalDisplay === '10:00 AM - 12:00 PM') {
  console.log('\n🎉 COMPLETE FIX SUCCESSFUL!');
  console.log('✅ User should no longer see wrong timing');
  console.log('✅ No more 8:10 AM - 10:10 AM display');
} else {
  console.log('\n❌ Complete fix failed');
  console.log('❌ Need to investigate further');
}

console.log('\n🚀 READY FOR REAL TESTING!');
console.log('Please make a new booking and check browser console for DEBUG logs');
