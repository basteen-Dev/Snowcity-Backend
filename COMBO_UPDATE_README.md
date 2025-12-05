# Combo Module Backend Update

This document describes the comprehensive backend updates to support the new combo module features in the Snow City admin dashboard.

## 🚀 New Features

### 1. Multiple Attractions Support
- Combos can now include 2+ attractions (not limited to 2)
- Dynamic pricing per attraction
- Flexible attraction management

### 2. Enhanced Combo Fields
- **Combo Name**: Required field for combo identification
- **Image URL**: Optional field for combo images
- **Individual Attraction Pricing**: Set price for each attraction in the combo
- **Total Price**: Automatically calculated from individual prices
- **Auto Slot Creation**: Generate time slots automatically

### 3. Automatic Slot Generation
- **Dynamic Duration**: Slot duration based on number of attractions
  - 2 attractions = 2-hour slots
  - 3 attractions = 3-hour slots
  - etc.
- **Default Time Window**: 10:00 AM to 8:00 PM
- **Customizable**: Can provide custom slot data

## 📊 Database Schema Changes

### Migration File
`db/migrations/0010_update_combos_schema.sql`

### New Tables

#### `combo_attractions` (Junction Table)
```sql
CREATE TABLE combo_attractions (
    id BIGINT PRIMARY KEY,
    combo_id BIGINT REFERENCES combos(combo_id),
    attraction_id BIGINT REFERENCES attractions(attraction_id),
    price NUMERIC(10,2) NOT NULL,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
);
```

#### `combo_slots` (Physical Slot Management)
```sql
CREATE TABLE combo_slots (
    combo_slot_id BIGINT PRIMARY KEY,
    combo_id BIGINT REFERENCES combos(combo_id),
    start_date DATE,
    end_date DATE,
    start_time TIME,
    end_time TIME,
    capacity INT,
    price NUMERIC(10,2),
    available BOOLEAN,
    combo_slot_code VARCHAR(20) UNIQUE,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
);
```

### Updated `combos` Table
```sql
ALTER TABLE combos ADD COLUMN name VARCHAR(200) NOT NULL DEFAULT '';
ALTER TABLE combos ADD COLUMN attraction_ids BIGINT[] DEFAULT '{}';
ALTER TABLE combos ADD COLUMN attraction_prices JSONB DEFAULT '{}';
ALTER TABLE combos ADD COLUMN total_price NUMERIC(10,2) DEFAULT 0;
ALTER TABLE combos ADD COLUMN image_url VARCHAR(255);
ALTER TABLE combos ADD COLUMN create_slots BOOLEAN DEFAULT TRUE;
```

### New View: `combo_details`
```sql
CREATE VIEW combo_details AS
SELECT 
    c.combo_id, c.name, c.attraction_ids, c.attraction_prices,
    c.total_price, c.image_url, c.discount_percent, c.active,
    c.create_slots, c.created_at, c.updated_at,
    -- Legacy fields for backward compatibility
    c.attraction_1_id, c.attraction_2_id, c.combo_price,
    -- Aggregated attraction details
    json_agg(
        json_build_object(
            'attraction_id', ca.attraction_id,
            'title', a.title,
            'price', ca.price,
            'image_url', a.image_url,
            'slug', a.slug
        )
    ) FILTER (WHERE ca.attraction_id IS NOT NULL) as attractions
FROM combos c
LEFT JOIN combo_attractions ca ON c.combo_id = ca.combo_id
LEFT JOIN attractions a ON ca.attraction_id = a.attraction_id
GROUP BY c.combo_id, ...;
```

## 🔧 Backend Components

### Models

#### `models/combos.model.js`
- **New Functions**: `mapCombo()`, enhanced `createCombo()`, `updateCombo()`
- **Features**: 
  - Supports new schema with multiple attractions
  - Integrates with auto slot service
  - Maintains backward compatibility
  - Transaction-based operations

#### `models/comboSlots.model.js`
- **Updated**: `getComboDetails()` to work with new schema
- **Enhanced**: Slot generation with dynamic pricing

### Services

#### `services/comboSlotAutoService.js` (New)
- **Purpose**: Automatic slot creation and management
- **Features**:
  - Generate default slots (10 AM - 8 PM)
  - Custom slot creation
  - Slot updates and deletion
  - Date-based slot queries

### Validators

#### `validators/combos.validators.js`
- **New Validators**: `createComboValidator`, `updateComboValidator`
- **Legacy Validators**: `createComboLegacyValidator`, `updateComboLegacyValidator`
- **Validations**:
  - Combo name required
  - At least 2 attractions
  - Individual attraction prices
  - Slot data validation
  - Image URL format

### Controllers

#### `admin/controllers/combos.controller.js`
- **Enhanced**: Support for new fields and legacy format
- **Features**:
  - Auto-detects new vs legacy format
  - Converts legacy data to new format
  - Handles slot creation
  - Maintains backward compatibility

### Routes

#### `admin/routes/combos.routes.js`
- **Updated**: Added validation middleware
- **Features**: Uses new validators with proper error handling

## 🔄 API Changes

### New Combo Format (POST /api/admin/combos)
```json
{
  "name": "Adventure Combo",
  "attraction_ids": [1, 2, 3],
  "attraction_prices": {
    "1": 299.99,
    "2": 199.99,
    "3": 149.99
  },
  "total_price": 649.97,
  "image_url": "https://example.com/image.jpg",
  "discount_percent": 10,
  "active": true,
  "create_slots": true,
  "slots": [
    {
      "start_date": "2024-01-01",
      "start_time": "10:00",
      "end_time": "13:00",
      "capacity": 10,
      "price": 649.97,
      "available": true
    }
  ]
}
```

### Legacy Format (Still Supported)
```json
{
  "attraction_1_id": 1,
  "attraction_2_id": 2,
  "combo_price": 499.99,
  "discount_percent": 5,
  "active": true
}
```

### Response Format
```json
{
  "combo_id": 1,
  "name": "Adventure Combo",
  "attraction_ids": [1, 2, 3],
  "attraction_prices": {"1": 299.99, "2": 199.99, "3": 149.99},
  "total_price": 649.97,
  "image_url": "https://example.com/image.jpg",
  "discount_percent": 10,
  "active": true,
  "create_slots": true,
  "attractions": [
    {
      "attraction_id": 1,
      "title": "Snow Slide",
      "price": 299.99,
      "image_url": "...",
      "slug": "snow-slide"
    }
  ],
  // Legacy fields for backward compatibility
  "attraction_1_id": 1,
  "attraction_2_id": 2,
  "combo_price": 649.97
}
```

## 🧪 Testing

### Test Script
`test_combo_api.js` - Comprehensive API testing script

### Running Tests
```bash
# Start backend server
npm start

# Run tests (in another terminal)
node test_combo_api.js
```

### Test Coverage
- ✅ Create combo (new format)
- ✅ Create combo (legacy format)
- ✅ List combos
- ✅ Get combo by ID
- ✅ Update combo
- ✅ Automatic slot creation
- ✅ Backward compatibility

## 📋 Migration Steps

### 1. Database Migration
```bash
cd backend
node db/index.js migrate
```

### 2. Data Migration
The migration script automatically:
- Migrates existing combos to new format
- Creates combo_attractions records
- Generates default combo names
- Populates attraction prices (splits combo_price equally)

### 3. Backend Deployment
- Deploy updated backend code
- Restart application server
- Verify API endpoints

## 🔒 Backward Compatibility

The backend maintains full backward compatibility:

1. **Legacy API Format**: Still accepts old `attraction_1_id`, `attraction_2_id`, `combo_price`
2. **Legacy Database Fields**: Old columns remain in database
3. **Response Format**: Includes both new and legacy fields
4. **Auto-conversion**: Legacy data automatically converted to new format

## 🚨 Important Notes

1. **Migration Required**: Database migration must be run before using new features
2. **Attraction Dependencies**: Ensure attractions exist before creating combos
3. **Slot Generation**: Default slots created only if `create_slots: true`
4. **Validation**: New format requires at least 2 attractions
5. **Testing**: Use provided test script to verify functionality

## 🐛 Troubleshooting

### Common Issues

1. **Migration Fails**
   - Check database connection
   - Verify permissions
   - Check for existing constraints

2. **Combo Creation Fails**
   - Verify attraction IDs exist
   - Check required fields
   - Review validation errors

3. **Slot Creation Issues**
   - Verify `create_slots` flag
   - Check slot data format
   - Review time format (HH:MM)

4. **Legacy Data Issues**
   - Migration should handle automatically
   - Check migration logs
   - Verify data conversion

## 📚 API Documentation

### Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/combos` | List all combos |
| GET | `/api/admin/combos/:id` | Get combo by ID |
| POST | `/api/admin/combos` | Create new combo |
| PUT | `/api/admin/combos/:id` | Update combo |
| DELETE | `/api/admin/combos/:id` | Delete combo |

### Query Parameters

- `active` (boolean): Filter by active status
- `page` (number): Pagination page
- `limit` (number): Items per page

## 🎯 Next Steps

1. **Frontend Integration**: Update frontend to use new API format
2. **Testing**: Comprehensive testing with real data
3. **Documentation**: Update API documentation
4. **Monitoring**: Add logging and monitoring
5. **Performance**: Optimize queries and add caching

---

**Version**: 2.0  
**Last Updated**: 2024  
**Compatibility**: Full backward compatibility maintained
