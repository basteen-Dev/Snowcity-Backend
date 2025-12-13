# 🚀 Direct SQL Execution Guide - Render PostgreSQL

**Objective**: Execute the Buy X Get Y migration on Render production database  
**Time Required**: ~2 minutes  
**Impact**: Zero downtime

---

## 📋 Copy This Entire SQL Block

Execute ALL of this at once in Render Query Editor:

```sql
-- ============================================================
-- Migration: Add Buy X Get Y Offer Support
-- Date: 2025-12-12
-- Purpose: Add ENUM value and columns for Buy X Get Y offers
-- ============================================================

-- Step 1: Update ENUM type
ALTER TYPE public.offer_rule_type RENAME TO offer_rule_type_old;

CREATE TYPE public.offer_rule_type AS ENUM (
    'holiday',
    'happy_hour',
    'weekday_special',
    'dynamic_pricing',
    'date_slot_pricing',
    'buy_x_get_y'
);

ALTER TABLE public.offers
    ALTER COLUMN rule_type TYPE public.offer_rule_type USING rule_type::text::public.offer_rule_type;

DROP TYPE public.offer_rule_type_old;

-- Step 2: Add Buy X Get Y columns
ALTER TABLE public.offer_rules
    ADD COLUMN IF NOT EXISTS buy_qty integer DEFAULT 1,
    ADD COLUMN IF NOT EXISTS get_qty integer DEFAULT 1,
    ADD COLUMN IF NOT EXISTS get_target_type character varying(32) DEFAULT 'attraction',
    ADD COLUMN IF NOT EXISTS get_target_id integer,
    ADD COLUMN IF NOT EXISTS get_discount_type character varying(20),
    ADD COLUMN IF NOT EXISTS get_discount_value numeric(10,2);

-- Step 3: Add constraints
ALTER TABLE public.offer_rules
    ADD CONSTRAINT offer_rules_buy_qty_check CHECK ((buy_qty >= 1)),
    ADD CONSTRAINT offer_rules_get_qty_check CHECK ((get_qty >= 1)),
    ADD CONSTRAINT offer_rules_get_target_type_check CHECK ((get_target_type::text = ANY (ARRAY['attraction'::character varying, 'combo'::character varying]::text[]))),
    ADD CONSTRAINT offer_rules_get_discount_type_check CHECK ((get_discount_type IS NULL OR get_discount_type::text = ANY (ARRAY['percent'::character varying, 'amount'::character varying]::text[])));

-- Step 4: Add documentation
COMMENT ON COLUMN public.offer_rules.buy_qty IS 'Quantity to buy (X in "Buy X Get Y")';
COMMENT ON COLUMN public.offer_rules.get_qty IS 'Quantity to get (Y in "Buy X Get Y")';
COMMENT ON COLUMN public.offer_rules.get_target_type IS 'Type of item to get: attraction or combo';
COMMENT ON COLUMN public.offer_rules.get_target_id IS 'ID of specific attraction or combo to get; NULL means applies to all of get_target_type';
COMMENT ON COLUMN public.offer_rules.get_discount_type IS 'Discount type on the "get" items: percent, amount, or NULL for free';
COMMENT ON COLUMN public.offer_rules.get_discount_value IS 'Discount value: percentage or amount in rupees';

-- Step 5: Create helper VIEW
CREATE OR REPLACE VIEW public.offer_summary AS
SELECT 
    o.offer_id,
    o.title,
    o.description,
    o.image_url,
    o.rule_type,
    o.active,
    o.valid_from,
    o.valid_to,
    COUNT(r.rule_id) as rule_count,
    json_agg(json_build_object(
        'rule_id', r.rule_id,
        'target_type', r.target_type,
        'target_id', r.target_id,
        'rule_type', r.rule_type
    )) FILTER (WHERE r.rule_id IS NOT NULL) as rules
FROM public.offers o
LEFT JOIN public.offer_rules r ON o.offer_id = r.offer_id
GROUP BY o.offer_id;

-- ============================================================
-- Verification Queries (Run after migration)
-- ============================================================

-- Verify ENUM value added
-- SELECT enum_range(NULL::offer_rule_type);

-- Verify columns exist
-- SELECT column_name, data_type FROM information_schema.columns 
-- WHERE table_name = 'offer_rules' AND column_name IN ('buy_qty', 'get_qty', 'get_target_type', 'get_target_id', 'get_discount_type', 'get_discount_value')
-- ORDER BY ordinal_position;

-- Verify constraints
-- SELECT constraint_name FROM information_schema.table_constraints 
-- WHERE table_name = 'offer_rules' AND constraint_type = 'CHECK' AND constraint_name LIKE '%buy_%' OR constraint_name LIKE '%get_%';

-- Verify VIEW
-- SELECT table_name FROM information_schema.views WHERE table_name = 'offer_summary';
```

---

## 🎯 How to Execute on Render

### Method 1: Render Dashboard Query Editor (Recommended)

1. **Open Render Dashboard**
   - Go to https://dashboard.render.com
   - Sign in

2. **Select Your PostgreSQL Database**
   - Find "Snowcity PostgreSQL" (or similar)
   - Click on it

3. **Open Query Tab**
   - Click "Info" or "Details" tab
   - Look for "Query" button or open "Web Console"
   - If not available, look for database connection details

4. **Connect to Database**
   - Use the External Database URL provided
   - Or use pgAdmin/DBeaver connection tools

5. **Copy & Paste SQL**
   - Select all SQL above (from `ALTER TYPE` to the last verification comment)
   - Paste into query editor
   - **DO NOT** include verification queries (they're commented out)

6. **Execute**
   - Click "Execute" or "Run"
   - Should complete in ~1 second
   - You should see no errors

---

### Method 2: Command Line (If You Have SSH Access)

```bash
# 1. SSH into Render backend container
# (If SSH enabled in Render)

# 2. Run migration via npm script
cd /opt/render/project/src
npm run migrate:001

# 3. Verify
npm run migrate:check
```

---

### Method 3: Via PostgreSQL Client

```bash
# 1. Get your DATABASE_URL from Render environment
# Copy from Render dashboard → PostgreSQL Details → External Database URL
# Format: postgresql://user:password@hostname:5432/database

# 2. Execute migration
psql "postgresql://user:password@hostname:5432/database" < ./migrations/001_add_buy_x_get_y_offers.sql

# 3. Verify
psql "postgresql://user:password@hostname:5432/database" -c "SELECT enum_range(NULL::offer_rule_type);"
```

---

## ✅ Verify Migration Success

After executing the SQL, run these verification queries:

### Query 1: Check ENUM Value
```sql
SELECT enum_range(NULL::offer_rule_type);
```

**Expected Output**:
```
                                    enum_range                                    
-----------------------------------------------------------------------------------
 {holiday,happy_hour,weekday_special,dynamic_pricing,date_slot_pricing,buy_x_get_y}
```

### Query 2: Check Columns Exist
```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'offer_rules' 
AND column_name IN ('buy_qty', 'get_qty', 'get_target_type', 'get_target_id', 'get_discount_type', 'get_discount_value')
ORDER BY ordinal_position;
```

**Expected Output**: 6 rows
```
       column_name       |       data_type        
------------------------+------------------------
 buy_qty                 | integer
 get_qty                 | integer
 get_target_type         | character varying
 get_target_id           | integer
 get_discount_type       | character varying
 get_discount_value      | numeric
```

### Query 3: Check Constraints
```sql
SELECT constraint_name 
FROM information_schema.table_constraints 
WHERE table_name = 'offer_rules' 
AND constraint_type = 'CHECK'
AND (constraint_name LIKE '%buy_%' OR constraint_name LIKE '%get_%');
```

**Expected Output**: 4 rows
```
           constraint_name            
---------------------------------------
 offer_rules_buy_qty_check
 offer_rules_get_qty_check
 offer_rules_get_target_type_check
 offer_rules_get_discount_type_check
```

### Query 4: Check VIEW
```sql
SELECT table_name FROM information_schema.views WHERE table_name = 'offer_summary';
```

**Expected Output**: 1 row
```
 table_name   
--------------
 offer_summary
```

---

## 🔧 If You Get Errors

### Error: "Cannot rename type in use"
**Cause**: Other connections using the type  
**Solution**: 
- Restart the backend service first
- Then retry migration
- Or disconnect all sessions and retry

### Error: "Constraint already exists"
**Cause**: Constraint already added from previous attempt  
**Solution**: OK - can ignore, this means migration partially succeeded. Just verify with verification queries above.

### Error: "Column already exists"
**Cause**: Column already added from previous attempt  
**Solution**: OK - this is expected if migration was partially run. The `IF NOT EXISTS` clause handles it.

### Error: "Permission denied"
**Cause**: Database user lacks privileges  
**Solution**: 
- Use database owner/admin account
- Or grant ALTER TABLE privileges to user
- Contact Render support if needed

---

## ⏭️ After Migration Success

1. **Restart Backend** (automatic on Render usually)
   - If not automatic, trigger a redeploy in Render dashboard

2. **Test in Admin UI**
   - Go to Admin → Offers → Create New Offer
   - Select "Buy X Get Y" from Rule Type dropdown
   - Fill in:
     - Buy Quantity: 2
     - Get Quantity: 1
     - Get Target Type: Combo
     - Get Target: Select a combo
     - Get Discount: Free
   - Click Save
   - ✅ Should work without ENUM error

3. **Monitor Logs**
   - Check Render application logs
   - Should see offer created successfully
   - No more ENUM errors

---

## 📊 Expected Success

### Before Migration ❌
```
Error creating offer: invalid input value for enum offer_rule_type: "buy_x_get_y"
```

### After Migration ✅
```json
{
  "success": true,
  "offer": {
    "offer_id": 123,
    "title": "Buy 2 Get 1 Free",
    "rule_type": "buy_x_get_y",
    "rules": [
      {
        "buy_qty": 2,
        "get_qty": 1,
        "get_target_type": "combo",
        "get_target_id": 5,
        "get_discount_type": null
      }
    ],
    "created_at": "2025-12-12T08:51:20Z"
  }
}
```

---

## 🎯 Quick Checklist

- [ ] Open Render dashboard
- [ ] Navigate to PostgreSQL database
- [ ] Open Query Editor
- [ ] Copy entire SQL block above
- [ ] Paste into editor
- [ ] Execute
- [ ] Wait for completion (~1 second)
- [ ] Run verification queries
- [ ] All 4 verifications show expected output ✅
- [ ] Restart backend
- [ ] Test in admin UI
- [ ] Create Buy X Get Y offer successfully ✅

---

**Time to Complete**: ~5 minutes  
**Complexity**: Very Easy  
**Risk**: Zero (fully reversible)  
**Impact**: Resolves ENUM error immediately

🚀 **Execute now to restore full functionality!**
