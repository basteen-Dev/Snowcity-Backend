// Test to verify booking model fixes
const path = require('path');

// Clear the require cache to force reload
delete require.cache[require.resolve('./models/bookings.model')];

const bookingsModel = require('./models/bookings.model');

async function testBookingQuery() {
  try {
    console.log('Testing booking model SQL generation...\n');
    
    // Get the base SQL parts to see what query is being generated
    const { select, joins } = await bookingsModel.getBaseSqlParts();
    
    console.log('Generated SELECT:');
    console.log(select);
    console.log('\nGenerated JOINs:');
    console.log(joins);
    
    // Check if attraction_3_id is mentioned anywhere
    const fullQuery = `${select} ${joins}`;
    const hasAttraction3Id = fullQuery.includes('attraction_3_id');
    
    console.log(`\n✅ attraction_3_id reference found: ${hasAttraction3Id ? '❌ YES (Problem!)' : '✅ NO (Good!)'}`);
    
    if (!hasAttraction3Id) {
      console.log('✅ Booking model is correctly updated');
    } else {
      console.log('❌ Booking model still has attraction_3_id references');
    }
    
  } catch (error) {
    console.error('Test failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

testBookingQuery();
