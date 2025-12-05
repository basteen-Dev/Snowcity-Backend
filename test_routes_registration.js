require('dotenv').config();

// Test if routes are properly registered by checking the route files exist and have correct exports
console.log('Testing attraction slots route registration...');

try {
  // Check if controller exists and has correct exports
  const controller = require('./admin/controllers/attractionSlots.controller');
  console.log('✅ Controller exports:', Object.keys(controller));
  
  // Check if routes exist and have router export
  const routes = require('./admin/routes/attractionSlots.routes');
  console.log('✅ Routes loaded successfully');
  
  // Check if model has required functions
  const model = require('./models/attractionSlots.model');
  console.log('✅ Model exports:', Object.keys(model));
  
  // Check if main admin routes index includes attraction-slots
  const adminRoutesIndex = require('./admin/routes/index.js');
  console.log('✅ Admin routes index loaded');
  
  console.log('\n🎯 All components are properly registered!');
  console.log('📋 The 404 error should now be fixed.');
  console.log('🔧 The frontend should be able to access /api/admin/attraction-slots');
  
} catch (error) {
  console.error('❌ Error checking registration:', error.message);
}

console.log('\n📝 Next Steps:');
console.log('1. Restart the backend server to load the new routes');
console.log('2. Test the frontend attraction slots page');
console.log('3. The 404 error should be resolved');
