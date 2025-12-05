require('dotenv').config();

console.log('🔧 DIRECT SLOT GENERATION TEST...');

async function testDirectSlotGeneration() {
  try {
    // Test the slot generation function directly
    const { generateDynamicSlotsForDateRange } = require('./models/comboSlots.model');
    
    console.log('\n🎯 Testing Combo Slot Generation:');
    
    const comboId = 1;
    const startDate = new Date('2025-11-29');
    const endDate = new Date('2025-11-29');
    const slotDuration = 2; // 2 hours for combo with 2 attractions
    
    console.log('📋 Parameters:', { comboId, startDate, endDate, slotDuration });
    
    const slots = generateDynamicSlotsForDateRange(comboId, startDate, endDate, slotDuration);
    
    console.log('🎰 Slots Generated:', slots.length);
    
    if (slots.length > 0) {
      console.log('✅ First Slot Sample:');
      const firstSlot = slots[0];
      console.log('   combo_slot_id:', firstSlot.combo_slot_id);
      console.log('   combo_id:', firstSlot.combo_id);
      console.log('   start_date:', firstSlot.start_date);
      console.log('   start_time:', firstSlot.start_time);
      console.log('   end_time:', firstSlot.end_time);
      console.log('   capacity:', firstSlot.capacity);
      console.log('   available:', firstSlot.available);
      
      // Test timing format
      const formatTime12Hour = (time24) => {
        if (!time24) return '';
        const [hours, minutes] = time24.split(':');
        const hour = parseInt(hours);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const hour12 = hour % 12 || 12;
        return `${hour12}:${minutes} ${ampm}`;
      };
      
      const start = formatTime12Hour(firstSlot.start_time);
      const end = formatTime12Hour(firstSlot.end_time);
      const timeText = start && end ? `${start} → ${end}` : '';
      
      console.log('   🕐 Formatted Timing:', timeText);
      
      console.log('\n📋 All Slots Times:');
      slots.forEach((slot, index) => {
        const start = formatTime12Hour(slot.start_time);
        const end = formatTime12Hour(slot.end_time);
        console.log(`   ${index + 1}. ${start} → ${end}`);
      });
    } else {
      console.log('❌ No slots generated');
    }
    
    console.log('\n🎢 Testing Attraction Slot Generation:');
    
    const { generateDynamicSlotsForDateRange: generateAttractionSlots } = require('./models/attractionSlots.model');
    
    const attractionId = 2;
    const attractionStartDate = new Date('2025-11-29');
    const attractionEndDate = new Date('2025-11-29');
    const attractionSlotDuration = 1; // 1 hour for attractions
    
    console.log('📋 Parameters:', { attractionId, startDate: attractionStartDate, endDate: attractionEndDate, slotDuration: attractionSlotDuration });
    
    const attractionSlots = generateAttractionSlots(attractionId, attractionStartDate, attractionEndDate, attractionSlotDuration);
    
    console.log('🎰 Attraction Slots Generated:', attractionSlots.length);
    
    if (attractionSlots.length > 0) {
      console.log('✅ First Attraction Slot Sample:');
      const firstSlot = attractionSlots[0];
      console.log('   slot_id:', firstSlot.slot_id);
      console.log('   attraction_id:', firstSlot.attraction_id);
      console.log('   start_date:', firstSlot.start_date);
      console.log('   start_time:', firstSlot.start_time);
      console.log('   end_time:', firstSlot.end_time);
      console.log('   capacity:', firstSlot.capacity);
      console.log('   available:', firstSlot.available);
      
      // Test timing format
      const start = formatTime12Hour(firstSlot.start_time);
      const end = formatTime12Hour(firstSlot.end_time);
      const timeText = start && end ? `${start} → ${end}` : '';
      
      console.log('   🕐 Formatted Timing:', timeText);
    } else {
      console.log('❌ No attraction slots generated');
    }
    
  } catch (error) {
    console.error('❌ Direct test failed:', error);
    console.error('Stack:', error.stack);
  }
}

testDirectSlotGeneration();
