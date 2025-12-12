# Buy X Get Y Offer Migration Guide

## Overview

This migration adds comprehensive "Buy X Get Y" discount offer support to the Snowcity backend. It updates the PostgreSQL schema to store and manage buy-quantity-based offers with flexible get-item targeting and discount types.

## Migration Files

### 1. **001_add_buy_x_get_y_offers.sql** (309 lines)
Main SQL migration script containing all schema changes:
- ENUM type update: Adds `buy_x_get_y` value to `offer_rule_type`
- 6 new columns to `offer_rules` table
- 4 CHECK constraints for data integrity
- Documentation comments
- Helper VIEW for offer reporting

### 2. **run_001_add_buy_x_get_y_offers.js** (Node.js Runner)
Automates migration execution:
- Reads and parses SQL migration file
- Executes SQL statements sequentially
- Handles "already exists" errors gracefully (idempotent)
- Provides progress feedback
- Exits with appropriate status codes

### 3. **check_migration_status.js** (Validation Script)
Verifies migration completeness:
- Checks ENUM value presence
- Validates all 6 columns exist with correct types
- Confirms CHECK constraints are in place
- Verifies helper VIEW exists
- Returns pass/fail status

### 4. **buyXGetYService.js** (Backend Service)
Implements core business logic:
- `validateBuyXGetYRule()` - Validates rule data before saving
- `saveBuyXGetYRule()` - Persists rule to database
- `evaluateBuyXGetYOffer()` - Calculates discount for cart
- `getActiveBuyXGetYOffers()` - Queries active offers for a date

## Schema Changes

### ENUM Update
```sql
ALTER TYPE offer_rule_type ADD VALUE 'buy_x_get_y';
```

### New Columns in offer_rules

| Column | Type | Default | Purpose |
|--------|------|---------|---------|
| `buy_qty` | INTEGER | 1 | Quantity to buy for offer qualification |
| `get_qty` | INTEGER | 1 | Quantity to get discount on |
| `get_target_type` | VARCHAR(32) | 'attraction' | Type of items to discount (attraction/combo) |
| `get_target_id` | INTEGER | NULL | Specific item ID, or NULL for all of type |
| `get_discount_type` | VARCHAR(20) | NULL | Discount method (percent/amount/NULL=free) |
| `get_discount_value` | NUMERIC(10,2) | NULL | Percentage or ₹ amount |

### CHECK Constraints
```sql
CHECK (buy_qty >= 1)
CHECK (get_qty >= 1)
CHECK (get_target_type IN ('attraction', 'combo'))
CHECK (get_discount_type IS NULL OR get_discount_type IN ('percent', 'amount'))
```

### Helper VIEW
```sql
CREATE OR REPLACE VIEW offer_summary AS
SELECT offer_id, title, COUNT(*) as rule_count
FROM offers o
LEFT JOIN offer_rules r ON o.offer_id = r.offer_id
GROUP BY o.offer_id;
```

## Execution Instructions

### Prerequisites
- PostgreSQL 12+ with `uuid-ossp` extension (optional, already installed)
- Node.js connection to Snowcity database
- Backup of current database (CRITICAL!)

### Step 1: Backup Current Database
```bash
# On production database server
pg_dump snowcity > snowcity_backup_$(date +%Y%m%d_%H%M%S).sql
```

### Step 2: Run Migration
```bash
# From backend root directory
npm run migrate:001

# OR run migration runner directly
node migrations/run_001_add_buy_x_get_y_offers.js

# OR execute SQL directly
psql -U postgres -d snowcity -f migrations/001_add_buy_x_get_y_offers.sql
```

### Step 3: Verify Migration
```bash
npm run migrate:check

# Expected output:
# ✓ offer_rule_type ENUM: ✅ has buy_x_get_y
# ✓ offer_rules columns: ✅ all 6 columns exist with correct types
# ✓ CHECK constraints: 4+ found
# ✓ offer_summary VIEW: ✅ exists
# 🎉 All migration checks passed!
```

### Step 4: Deploy Updated Code
```bash
# Pull updated backend code with migration scripts and service
git pull origin main

# Install any dependencies
npm install

# Restart application server
pm2 restart snowcity-backend
```

## API Integration

### Adding Buy X Get Y Offers (Admin)

**POST /api/admin/offers**
```json
{
  "title": "Buy 2 Get 1 Free",
  "description": "Buy 2 combos, get 1 free",
  "rule_type": "buy_x_get_y",
  "rules": [
    {
      "buy_qty": 2,
      "get_qty": 1,
      "get_target_type": "combo",
      "get_target_id": 5,
      "get_discount_type": null,
      "applies_to_all": false,
      "target_type": "combo",
      "target_id": 5
    }
  ],
  "valid_from": "2024-01-01",
  "valid_to": "2024-12-31",
  "active": true
}
```

### Applying Buy X Get Y Discounts (Checkout)

**POST /api/booking/calculate-discount**
```json
{
  "cart": [
    { "type": "combo", "id": 5, "quantity": 2, "price": 800 },
    { "type": "combo", "id": 5, "quantity": 1, "price": 800 }
  ]
}
```

**Response**:
```json
{
  "offerApplied": true,
  "offerId": 15,
  "offerTitle": "Buy 2 Get 1 Free",
  "discount": 800,
  "discountSummary": "Buy 2 get 1 Combo #5 (Free)"
}
```

## Frontend Integration

### Admin Offer Form
Already updated to include Buy X Get Y fields:
- Buy Quantity input
- Get Quantity input
- Get Target Type dropdown (attraction/combo)
- Get Target dropdown (filtered list)
- Get Discount Type dropdown (Free/Percentage/Flat Amount)
- Get Discount Value input

### Offer Display
Automatically renders human-readable summaries:
- "Buy 2 get 1 Combo #5 (Free)"
- "Buy 1 get 2 Attraction #3 (₹50)"
- "Buy 2 get 1 Attraction #7 (15%)"

## Evaluation Logic

### How Buy X Get Y Offers Work

1. **Qualification**: Customer buys `buy_qty` items of specified type
2. **Eligibility**: If qualified, customer gets discount on up to `get_qty` items of `get_target_type`
3. **Discount Calculation**:
   - **Free** (`get_discount_type = NULL`): Items are free
   - **Percentage** (`get_discount_type = 'percent'`): Apply percentage off to eligible items
   - **Flat Amount** (`get_discount_type = 'amount'`): Apply ₹ amount off to eligible items
4. **Stacking**: Offers respect `max_discount` and priority rules

### Example Scenarios

**Scenario 1: Buy 2 Get 1 Free**
```
Rule: buy_qty=2, get_qty=1, get_target_type='combo', get_discount_type=null
Cart: 3× Combo #5 (₹800 each)
Buy count: 3 items ≥ 2 required ✓
Get count: 3 items available, apply to 1 item
Discount: ₹800 (1 free item)
```

**Scenario 2: Buy 1 Get 2 at 50% Off**
```
Rule: buy_qty=1, get_qty=2, get_target_type='attraction', get_discount_type='percent', get_discount_value=50
Cart: 2× Attraction #3 (₹500 each)
Buy count: 2 items ≥ 1 required ✓
Get count: 2 items available, apply to 2 items
Discount: (500×50%) + (500×50%) = ₹500 total
```

**Scenario 3: Buy 2 Get 1 at ₹100 Off**
```
Rule: buy_qty=2, get_qty=1, get_target_type='combo', get_discount_type='amount', get_discount_value=100
Cart: 3× Combo #10 (₹1000 each)
Buy count: 3 items ≥ 2 required ✓
Get count: 3 items available, apply to 1 item (highest price)
Discount: ₹100
```

## Rollback Instructions

If migration causes issues:

### Option 1: Restore from Backup
```bash
# On production database server
psql -U postgres -d snowcity < snowcity_backup_20240101_120000.sql
```

### Option 2: Manual Rollback
```sql
-- Remove new columns from offer_rules (data will be lost)
ALTER TABLE offer_rules DROP COLUMN IF EXISTS buy_qty;
ALTER TABLE offer_rules DROP COLUMN IF EXISTS get_qty;
ALTER TABLE offer_rules DROP COLUMN IF EXISTS get_target_type;
ALTER TABLE offer_rules DROP COLUMN IF EXISTS get_target_id;
ALTER TABLE offer_rules DROP COLUMN IF EXISTS get_discount_type;
ALTER TABLE offer_rules DROP COLUMN IF EXISTS get_discount_value;

-- Remove offer_summary VIEW
DROP VIEW IF EXISTS offer_summary;

-- Remove buy_x_get_y from enum (requires type recreation)
-- [Use ENUM rename pattern in reverse]

-- Restart application
```

## Testing Checklist

After migration and deployment:

- [ ] Migration script runs without errors
- [ ] `npm run migrate:check` reports all checks passed
- [ ] Database queries confirm all 6 columns exist
- [ ] Admin can create Buy X Get Y offers
- [ ] Admin offer list displays Buy X Get Y summaries correctly
- [ ] API returns correct discount calculations
- [ ] User checkout applies Buy X Get Y discounts
- [ ] Multiple Buy X Get Y offers work together
- [ ] Offer expiration dates respected
- [ ] Invalid data rejected with clear error messages

## Performance Considerations

- **Index Strategy**: Consider adding index on `offer_rules(rule_type, active)` for faster query of active Buy X Get Y offers
- **Query Optimization**: `getActiveBuyXGetYOffers()` uses `json_agg()` which is efficient for moderate rule counts
- **Caching**: Cache active offers for 1-5 minutes to reduce database load
- **Monitoring**: Track discount calculation performance under high checkout volume

## Support & Troubleshooting

### Common Issues

**Issue**: "relation 'offer_rule_type_old' already exists"
- **Cause**: Migration was partially run
- **Solution**: Run `check_migration_status.js` to verify state, then run idempotent migration again

**Issue**: "column 'buy_qty' already exists"
- **Cause**: Columns already migrated
- **Solution**: This is expected if migration was already applied; check with `check_migration_status.js`

**Issue**: Database connection fails
- **Cause**: Connection string incorrect or database down
- **Solution**: Verify `DB_*` environment variables in `.env` file

**Issue**: "permission denied" error
- **Cause**: Database user lacks ALTER TABLE permissions
- **Solution**: Run migration with superuser account or grant appropriate privileges

## Maintenance

- Regularly backup database before running migrations
- Test migrations on staging environment before production
- Monitor offer evaluation performance as offer count grows
- Archive inactive offers to maintain query performance
- Review offer priority rules quarterly for conflicts

## References

- PostgreSQL ENUM documentation: https://www.postgresql.org/docs/14/datatype-enum.html
- Backend API documentation: See `/docs/api.md`
- Frontend OfferForm component: `src/admin/pages/catalog/OfferForm.jsx`
- Pricing engine: `services/pricingEngine.js`

---

**Version**: 1.0  
**Created**: 2024  
**Last Updated**: 2024  
**Status**: Ready for Production
