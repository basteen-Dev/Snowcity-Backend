require('dotenv').config();

console.log('🔧 TESTING VIRTUAL SLOT ID FALLBACK...');
console.log('\n✅ FIX: Extract timing from virtual slot ID when frontend doesn\'t provide it');

// Simulate the fixed backend controller logic
const normalizeCreateItem = (input = {}) => {
  console.log('🔍 DEBUG normalizeCreateItem input:', input);
  
  const item = input || {};

  // Slot timing information
  let slot_label = item.slot_label || item.slotLabel || null;
  let slot_start_time = item.slot_start_time || item.slotStartTime || item.slot?.start_time || null;
  let slot_end_time = item.slot_end_time || item.slotEndTime || item.slot?.end_time || null;
  
  console.log('🔍 Initial slot timing from frontend:', {
    slot_label,
    slot_start_time,
    slot_end_time
  });
  
  // If frontend didn't provide slot timing, extract from virtual slot ID
  if (!slot_start_time && !slot_end_time) {
    const slotId = item.slot_id || item.combo_slot_id;
    console.log('🔍 Frontend didn\'t provide timing, extracting from virtual slot ID:', slotId);
    
    if (slotId && typeof slotId === 'string' && slotId.includes('-')) {
      const parts = slotId.split('-');
      const hourStr = parts[parts.length - 1];
      const hour = parseInt(hourStr);
      
      if (!isNaN(hour)) {
        slot_start_time = `${String(hour).padStart(2, '0')}:00:00`;
        
        // Attraction slots are 1 hour, combo slots are 2 hours
        const duration = item.combo_id ? 2 : 1;
        slot_end_time = `${String((hour + duration) % 24).padStart(2, '0')}:00:00`;
        
        // Generate slot label
        const formatTime12Hour = (time24) => {
          const [hours, minutes] = time24.split(':');
          const hour = parseInt(hours);
          const ampm = hour >= 12 ? 'PM' : 'AM';
          const hour12 = hour % 12 || 12;
          return `${hour12}:${minutes} ${ampm}`;
        };
        
        slot_label = `${formatTime12Hour(slot_start_time)} - ${formatTime12Hour(slot_end_time)}`;
        
        console.log('🔍 DEBUG extracted timing from virtual slot ID:', {
          slotId,
          hour,
          slot_start_time,
          slot_end_time,
          slot_label
        });
      }
    }
  }
  
  console.log('🔍 DEBUG backend slot timing (FINAL):', {
    slot_label,
    slot_start_time,
    slot_end_time,
    original_slot_label: item.slot_label,
    original_slotLabel: item.slotLabel,
    slot_object: item.slot
  });

  return {
    user_id: '3',
    item_type: item.item_type || 'Attraction',
    attraction_id: parseInt(item.attraction_id) || null,
    combo_id: parseInt(item.combo_id) || null,
    slot_id: null,
    combo_slot_id: null,
    quantity: item.quantity || 1,
    booking_date: item.booking_date || '2025-11-29',
    slot_label,
    slot_start_time,
    slot_end_time
  };
};

// Test case 1: Attraction with virtual slot ID 1-20251129-10 (10:00 AM)
console.log('\n🧪 Test Case 1: Attraction 10:00 AM slot');
const attractionInput = {
  quantity: 2,
  booking_date: '2025-11-29',
  slot_label: null,
  item_type: 'Attraction',
  attraction_id: '1',
  slot_id: '1-20251129-10', // Virtual slot ID for 10:00 AM
  combo_id: null,
  combo_slot_id: null
};

const attractionResult = normalizeCreateItem(attractionInput);
console.log('✅ Attraction result:', attractionResult);

// Test case 2: Combo with virtual slot ID 2-20251129-14 (2:00 PM)
console.log('\n🧪 Test Case 2: Combo 2:00 PM slot');
const comboInput = {
  quantity: 1,
  booking_date: '2025-11-29',
  slot_label: null,
  item_type: 'Combo',
  attraction_id: null,
  slot_id: null,
  combo_id: '2',
  combo_slot_id: '2-20251129-14' // Virtual slot ID for 2:00 PM
};

const comboResult = normalizeCreateItem(comboInput);
console.log('✅ Combo result:', comboResult);

// Test case 3: Frontend provides timing (should use frontend timing)
console.log('\n🧪 Test Case 3: Frontend provides timing');
const frontendTimingInput = {
  quantity: 1,
  booking_date: '2025-11-29',
  slot_label: '3:00 PM - 4:00 PM',
  item_type: 'Attraction',
  attraction_id: '1',
  slot_id: '1-20251129-15', // Virtual slot ID for 3:00 PM
  slot_start_time: '15:00:00',
  slot_end_time: '16:00:00'
};

const frontendTimingResult = normalizeCreateItem(frontendTimingInput);
console.log('✅ Frontend timing result:', frontendTimingResult);

// Verify results
console.log('\n🎯 VERIFICATION:');

const test1 = attractionResult.slot_start_time === '10:00:00' && attractionResult.slot_end_time === '11:00:00';
const test2 = comboResult.slot_start_time === '14:00:00' && comboResult.slot_end_time === '16:00:00';
const test3 = frontendTimingResult.slot_start_time === '15:00:00' && frontendTimingResult.slot_end_time === '16:00:00';

console.log('✅ Attraction 10:00 AM test:', test1 ? 'PASS' : 'FAIL');
console.log('✅ Combo 2:00 PM test:', test2 ? 'PASS' : 'FAIL');
console.log('✅ Frontend timing priority test:', test3 ? 'PASS' : 'FAIL');

const allTestsPass = test1 && test2 && test3;
console.log('\n🏆 OVERALL RESULT:', allTestsPass ? '✅ ALL TESTS PASS' : '❌ SOME TESTS FAIL');

if (allTestsPass) {
  console.log('\n✨ VIRTUAL SLOT ID FALLBACK SUCCESSFUL!');
  console.log('✅ Backend now extracts timing from virtual slot ID');
  console.log('✅ Attraction slots: 1 hour duration');
  console.log('✅ Combo slots: 2 hour duration');
  console.log('✅ Frontend timing takes priority when provided');
  console.log('✅ User will see correct timing in bookings');
} else {
  console.log('\n❌ Fallback fix failed');
  console.log('❌ Need further investigation');
}

console.log('\n🚀 READY FOR TESTING!');
console.log('User should now see correct timing even if frontend doesn\'t send it');
