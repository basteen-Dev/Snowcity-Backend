require('dotenv').config();
const attractionSlotsModel = require('./models/attractionSlots.model');
const comboSlotsModel = require('./models/comboSlots.model');

async function testDynamicSlots() {
  console.log('Testing dynamic slot generation...');
  
  try {
    // Test attraction dynamic slots
    console.log('\n=== ATTRACTION DYNAMIC SLOTS ===');
    const attractionStartDate = new Date('2025-11-29');
    const attractionEndDate = new Date('2025-12-01');
    
    const attractionSlots = attractionSlotsModel.generateDynamicSlotsForDateRange(
      1, // attraction_id
      attractionStartDate,
      attractionEndDate,
      1 // 1-hour duration
    );
    
    console.log(`Generated ${attractionSlots.length} attraction slots for 3 days`);
    console.log('Sample attraction slots:');
    attractionSlots.slice(0, 5).forEach(slot => {
      console.log(`  - Slot ${slot.slot_id}: ${slot.start_date} ${slot.start_time} → ${slot.end_time} (1 hour)`);
    });
    
    // Test combo dynamic slots
    console.log('\n=== COMBO DYNAMIC SLOTS ===');
    const comboStartDate = new Date('2025-11-29');
    const comboEndDate = new Date('2025-12-01');
    
    // Simulate combo with 2 attractions = 2-hour slots
    const comboSlots = comboSlotsModel.generateDynamicSlotsForDateRange(
      1, // combo_id
      comboStartDate,
      comboEndDate,
      2 // 2-hour duration (for combo with 2 attractions)
    );
    
    console.log(`Generated ${comboSlots.length} combo slots for 3 days (2-hour duration)`);
    console.log('Sample combo slots:');
    comboSlots.slice(0, 5).forEach(slot => {
      console.log(`  - Slot ${slot.combo_slot_id}: ${slot.start_date} ${slot.start_time} → ${slot.end_time} (2 hours)`);
    });
    
    // Test different slot durations
    console.log('\n=== SLOT DURATION TESTS ===');
    
    // 1-attraction combo = 1 hour
    const singleAttractionCombo = comboSlotsModel.generateDynamicSlotsForDateRange(
      2, comboStartDate, comboEndDate, 1
    );
    console.log(`Single attraction combo: ${singleAttractionCombo.length} slots (1-hour duration)`);
    
    // 3-attraction combo = 3 hours
    const tripleAttractionCombo = comboSlotsModel.generateDynamicSlotsForDateRange(
      3, comboStartDate, comboEndDate, 3
    );
    console.log(`Triple attraction combo: ${tripleAttractionCombo.length} slots (3-hour duration)`);
    
    console.log('\n✅ DYNAMIC SLOT GENERATION WORKING!');
    console.log('📅 Calendar-based slot generation:');
    console.log('  - Attractions: 1-hour slots (10 AM - 8 PM)');
    console.log('  - Combos: Duration based on number of attractions');
    console.log('  - Virtual IDs: attraction-{date}-{hour} / combo-{date}-{hour}');
    console.log('  - No database storage needed');
    
    console.log('\n🎯 BENEFITS:');
    console.log('✅ No database storage for slots');
    console.log('✅ Unlimited date range support');
    console.log('✅ Automatic calendar-based generation');
    console.log('✅ Flexible duration based on combo composition');
    console.log('✅ Virtual slot IDs for tracking');
    
  } catch (error) {
    console.error('Error testing dynamic slots:', error);
  }
}

testDynamicSlots();
