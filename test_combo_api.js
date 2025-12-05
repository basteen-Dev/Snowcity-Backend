/**
 * Simple test script to verify combo API functionality
 * Run with: node test_combo_api.js
 */

const http = require('http');

// Configuration
const API_BASE = 'http://localhost:4000/api/admin';
const API_KEY = 'your-api-key-here'; // Add your auth token if needed

// Helper function to make HTTP requests
function makeRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 4000,
      path: `/api/admin${path}`,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}` // Add auth if needed
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        try {
          const response = JSON.parse(body);
          resolve({ status: res.statusCode, data: response });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', (e) => {
      reject(e);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

// Test functions
async function testCreateCombo() {
  console.log('🧪 Testing combo creation...');
  
  const testCombo = {
    name: 'Test Adventure Combo',
    attraction_ids: [1, 2, 3], // Assuming attractions 1, 2, 3 exist
    attraction_prices: {
      '1': 299.99,
      '2': 199.99,
      '3': 149.99
    },
    total_price: 649.97,
    image_url: 'https://example.com/combo-image.jpg',
    discount_percent: 10,
    active: true,
    create_slots: true,
    slots: [
      {
        start_date: '2024-01-01',
        start_time: '10:00',
        end_time: '13:00', // 3 hours for 3 attractions
        capacity: 10,
        price: 649.97,
        available: true
      },
      {
        start_date: '2024-01-01',
        start_time: '14:00',
        end_time: '17:00',
        capacity: 10,
        price: 649.97,
        available: true
      }
    ]
  };

  try {
    const response = await makeRequest('POST', '/combos', testCombo);
    console.log('✅ Combo creation response:', response.status);
    console.log('📄 Combo data:', JSON.stringify(response.data, null, 2));
    return response.data;
  } catch (error) {
    console.error('❌ Combo creation failed:', error.message);
    return null;
  }
}

async function testListCombos() {
  console.log('\n🧪 Testing combo listing...');
  
  try {
    const response = await makeRequest('GET', '/combos');
    console.log('✅ Combo listing response:', response.status);
    console.log('📄 Combos:', JSON.stringify(response.data, null, 2));
    return response.data;
  } catch (error) {
    console.error('❌ Combo listing failed:', error.message);
    return null;
  }
}

async function testGetComboById(comboId) {
  console.log(`\n🧪 Testing get combo by ID: ${comboId}...`);
  
  try {
    const response = await makeRequest('GET', `/combos/${comboId}`);
    console.log('✅ Get combo response:', response.status);
    console.log('📄 Combo details:', JSON.stringify(response.data, null, 2));
    return response.data;
  } catch (error) {
    console.error('❌ Get combo failed:', error.message);
    return null;
  }
}

async function testUpdateCombo(comboId) {
  console.log(`\n🧪 Testing combo update for ID: ${comboId}...`);
  
  const updateData = {
    name: 'Updated Test Adventure Combo',
    discount_percent: 15,
    active: false
  };

  try {
    const response = await makeRequest('PUT', `/combos/${comboId}`, updateData);
    console.log('✅ Combo update response:', response.status);
    console.log('📄 Updated combo:', JSON.stringify(response.data, null, 2));
    return response.data;
  } catch (error) {
    console.error('❌ Combo update failed:', error.message);
    return null;
  }
}

async function testLegacyCombo() {
  console.log('\n🧪 Testing legacy combo format...');
  
  const legacyCombo = {
    attraction_1_id: 1,
    attraction_2_id: 2,
    combo_price: 499.99,
    discount_percent: 5,
    active: true
  };

  try {
    const response = await makeRequest('POST', '/combos', legacyCombo);
    console.log('✅ Legacy combo creation response:', response.status);
    console.log('📄 Legacy combo data:', JSON.stringify(response.data, null, 2));
    return response.data;
  } catch (error) {
    console.error('❌ Legacy combo creation failed:', error.message);
    return null;
  }
}

// Main test runner
async function runTests() {
  console.log('🚀 Starting Combo API Tests...\n');
  
  // Test 1: Create new combo with new format
  const newCombo = await testCreateCombo();
  
  if (newCombo && newCombo.combo_id) {
    // Test 2: Get combo by ID
    await testGetComboById(newCombo.combo_id);
    
    // Test 3: Update combo
    await testUpdateCombo(newCombo.combo_id);
  }
  
  // Test 4: List all combos
  await testListCombos();
  
  // Test 5: Test legacy format
  await testLegacyCombo();
  
  console.log('\n✅ All tests completed!');
  console.log('\n📝 Notes:');
  console.log('- Make sure the backend server is running on localhost:4000');
  console.log('- Update API_KEY if authentication is required');
  console.log('- Ensure attractions with IDs 1, 2, 3 exist in the database');
  console.log('- Run the database migration first: node db/index.js migrate');
}

// Handle uncaught errors
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
});

// Run tests
runTests().catch(console.error);
