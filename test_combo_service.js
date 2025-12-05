require('dotenv').config();

console.log('🔍 COMBO SERVICE TEST...');

async function testComboService() {
  try {
    const comboService = require('./services/comboService');
    
    console.log('\n🎯 Testing comboService.getById(1):');
    
    const combo = await comboService.getById(1);
    
    console.log('✅ Combo found:', !!combo);
    console.log('📋 Combo Structure:');
    console.log('   combo_id:', combo.combo_id);
    console.log('   id:', combo.id);
    console.log('   name:', combo.name);
    console.log('   title:', combo.title);
    console.log('   attraction_ids:', combo.attraction_ids);
    console.log('   attractions:', combo.attractions);
    console.log('   combo_price:', combo.combo_price);
    console.log('   price:', combo.price);
    console.log('   total_price:', combo.total_price);
    
    // Check what fields are available
    console.log('\n🔍 All Available Fields:');
    Object.keys(combo).forEach(key => {
      console.log(`   ${key}: ${JSON.stringify(combo[key])}`);
    });
    
    // Calculate attraction count based on available fields
    let attractionCount = 1;
    if (combo.attraction_ids && Array.isArray(combo.attraction_ids)) {
      attractionCount = combo.attraction_ids.length;
    } else if (combo.attractions && Array.isArray(combo.attractions)) {
      attractionCount = combo.attractions.length;
    } else if (typeof combo.attraction_ids === 'string') {
      try {
        const parsed = JSON.parse(combo.attraction_ids);
        attractionCount = Array.isArray(parsed) ? parsed.length : 1;
      } catch (e) {
        attractionCount = combo.attraction_ids.split(',').length;
      }
    }
    
    console.log('\n🔢 Calculated Values:');
    console.log('   attractionCount:', attractionCount);
    console.log('   slotDuration:', Math.max(attractionCount, 1));
    
  } catch (error) {
    console.error('❌ Combo service test failed:', error);
    console.error('Stack:', error.stack);
  }
}

testComboService();
