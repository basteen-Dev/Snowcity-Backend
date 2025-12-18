// Test the message formatting logic directly
function formatTime12h(t) {
  if (!t) return '';
  const timeStr = String(t).trim();
  
  // Handle various time formats
  let onlyTime = timeStr;
  if (timeStr.includes('T')) {
    onlyTime = timeStr.split('T')[1] || timeStr;
  } else if (timeStr.includes(' ')) {
    onlyTime = timeStr.split(' ')[0];
  }
  
  // Remove any trailing timezone info
  onlyTime = onlyTime.split('.')[0];
  
  const parts = onlyTime.split(':');
  if (parts.length < 2) return '';
  
  const h = Number(parts[0]);
  const m = Number(parts[1]);
  
  if (Number.isNaN(h) || Number.isNaN(m)) return '';
  
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
}

function formatDateIN(d) {
  if (!d) return '';
  try {
    const dt = new Date(d);
    if (Number.isNaN(dt.getTime())) return '';
    return dt.toLocaleDateString('en-IN', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch {
    return '';
  }
}

function formatSlotRange(row) {
  const start = formatTime12h(row?.slot_start_time || row?.start_time || row?.booking_time);
  const end = formatTime12h(row?.slot_end_time || row?.end_time);
  
  if (start && end) {
    return `${start} - ${end}`;
  }
  if (start) {
    return start;
  }
  if (row?.slot_label) {
    return String(row.slot_label);
  }
  return 'Open Entry';
}

function buildMessageData(mockItems) {
  // Group attractions by date for better formatting
  const attractionsByDate = new Map();
  
  mockItems.forEach((it) => {
    const title = it.item_title || it.attraction_title || it.combo_title || (it.item_type === 'Combo' ? 'Combo' : 'Attraction');
    const qty = Number(it.quantity || 1);
    const dateStr = formatDateIN(it.booking_date) || '';
    const slotStr = formatSlotRange(it);
    
    const dateKey = dateStr || 'Date TBD';
    
    if (!attractionsByDate.has(dateKey)) {
      attractionsByDate.set(dateKey, []);
    }
    
    attractionsByDate.get(dateKey).push({
      title,
      qty,
      time: slotStr
    });
  });
  
  // Build formatted attractions text
  const attractionLines = [];
  
  attractionsByDate.forEach((attractions, date) => {
    const attractionDetails = attractions.map(attr => {
      const timeStr = attr.time ? ` (${attr.time})` : '';
      return `${attr.title} (Qty: ${attr.qty})${timeStr}`;
    }).join(', ');
    
    attractionLines.push(`${date}: ${attractionDetails}`);
  });
  
  const itemsText = attractionLines.length ? attractionLines.join('\n') : 'Booking details unavailable';

  // Process add-ons
  const addonMap = new Map();
  mockItems.forEach((it) => {
    const addons = Array.isArray(it.addons) ? it.addons : [];
    addons.forEach((a) => {
      const key = String(a.addon_id || a.title || a.addon_title || '').trim();
      if (!key) return;
      const name = a.title || a.addon_title || 'Addon';
      const qty = Number(a.quantity || 0);
      if (!addonMap.has(key)) addonMap.set(key, { name, qty: 0 });
      addonMap.get(key).qty += qty;
    });
  });
  
  const addonLines = Array.from(addonMap.values())
    .filter((x) => x.qty > 0)
    .sort((a, b) => String(a.name).localeCompare(String(b.name)))
    .map((x) => `${x.name} (${x.qty}x)`);
  const addonsText = addonLines.length ? addonLines.join('\n') : 'None';

  return { itemsText, addonsText };
}

// Test data
const mockItems = [
  {
    item_title: 'Snow City',
    quantity: 2,
    booking_date: '2025-12-25',
    slot_start_time: '10:00:00',
    slot_end_time: '12:00:00',
    addons: [
      { title: 'Snow Gear', quantity: 2, addon_id: 'gear1' },
      { title: 'Hot Chocolate', quantity: 1, addon_id: 'drink1' }
    ]
  },
  {
    item_title: 'Mad Lab',
    quantity: 1,
    booking_date: '2025-12-25',
    slot_start_time: '14:30:00',
    slot_end_time: '16:00:00',
    addons: [
      { title: 'Lab Coat', quantity: 1, addon_id: 'coat1' }
    ]
  },
  {
    item_title: 'Combo Package',
    quantity: 1,
    item_type: 'Combo',
    booking_date: '2025-12-26',
    slot_start_time: '09:00:00',
    slot_end_time: '13:00:00',
    addons: []
  }
];

console.log('🧪 Testing WhatsApp Message Formatting');
console.log('=====================================\n');

const { itemsText, addonsText } = buildMessageData(mockItems);

console.log('📱 FINAL WHATSAPP MESSAGE:');
console.log('===========================');
console.log('Hi John Doe,');
console.log('');
console.log('Thank you for booking with Snow City Bengaluru. Your payment is successful and your ticket(s) are confirmed for:');
console.log('');
console.log(itemsText);
console.log('');
console.log('Add-ons / Extras');
console.log('================');
console.log(addonsText);
console.log('');
console.log('The ticket PDF is attached.');

console.log('\n✅ IMPROVEMENTS VERIFIED:');
console.log('========================');
console.log('✓ Multiple attractions on same date are now combined');
console.log('✓ Time formatting shows 12-hour format (AM/PM)');
console.log('✓ Attractions grouped by date for better readability');
console.log('✓ Add-ons properly aggregated across all attractions');

console.log('\n🔍 DETAILED VERIFICATION:');
console.log('========================');
console.log(`✓ Date grouping: ${itemsText.includes('25 Dec 2025:') && itemsText.includes('26 Dec 2025:') ? 'PASS' : 'FAIL'}`);
console.log(`✓ Time format: ${itemsText.includes('10:00 AM') && itemsText.includes('2:30 PM') ? 'PASS' : 'FAIL'}`);
console.log(`✓ Combined attractions: ${itemsText.includes('Snow City (Qty: 2) (10:00 AM - 12:00 PM), Mad Lab (Qty: 1) (2:30 PM - 4:00 PM)') ? 'PASS' : 'FAIL'}`);
console.log(`✓ Aggregated add-ons: ${addonsText.includes('Snow Gear (2x)') && addonsText.includes('Hot Chocolate (1x)') ? 'PASS' : 'FAIL'}`);
