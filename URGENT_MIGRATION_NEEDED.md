# 🚨 URGENT: Execute Migration on Production Database

**Issue**: ENUM value `buy_x_get_y` not found in production database  
**Error**: `error: invalid input value for enum offer_rule_type: "buy_x_get_y"`  
**Root Cause**: Migration SQL hasn't been executed on Render PostgreSQL database  
**Solution**: Execute migration immediately

---

## 🔴 Problem Identified

The backend code is trying to save offers with `rule_type: "buy_x_get_y"` but the database doesn't have this ENUM value yet.

**Stack trace shows**: 
```
at /opt/render/project/src/models/offers.model.js:139:20
error: invalid input value for enum offer_rule_type: "buy_x_get_y"
```

This means the migration needs to be executed on the Render PostgreSQL database.

---

## ✅ SOLUTION: Execute Migration Now

### Option 1: Use Render Dashboard (Easiest)

1. **Go to Render Dashboard**
   - Visit https://dashboard.render.com
   - Find your Snowcity PostgreSQL database

2. **Open Database Shell/Console**
   - Click on your PostgreSQL database
   - Go to "External Database URL" or "Details"
   - Click "Open Terminal" or "Query Editor"

3. **Copy and Paste Migration SQL**
   - From: `migrations/001_add_buy_x_get_y_offers.sql`
   - Paste entire SQL into the console
   - Execute

4. **Verify**
   ```sql
   SELECT enum_range(NULL::offer_rule_type);
   ```
   Should show: `'buy_x_get_y'` in the list

---

### Option 2: Use psql Command Line (If you have database URL)

```bash
# Get your DATABASE_URL from Render environment variables
# Format: postgresql://user:password@host:port/database

# Execute migration file
psql $DATABASE_URL < migrations/001_add_buy_x_get_y_offers.sql

# Verify
psql $DATABASE_URL -c "SELECT enum_range(NULL::offer_rule_type);"
```

---

### Option 3: Run via Backend Service (From App)

If you can SSH into Render backend:

```bash
# SSH into Render backend
# Then execute:
npm run migrate:001

# Verify:
npm run migrate:check
```

---

## 📋 Migration SQL (What Gets Executed)

```sql
-- Step 1: Update ENUM type (add 'buy_x_get_y')
ALTER TYPE public.offer_rule_type RENAME TO offer_rule_type_old;

CREATE TYPE public.offer_rule_type AS ENUM (
    'holiday',
    'happy_hour',
    'weekday_special',
    'dynamic_pricing',
    'date_slot_pricing',
    'buy_x_get_y'  -- ← NEW VALUE
);

ALTER TABLE public.offers
    ALTER COLUMN rule_type TYPE public.offer_rule_type USING rule_type::text::public.offer_rule_type;

DROP TYPE public.offer_rule_type_old;

-- Step 2: Add 6 new columns
ALTER TABLE public.offer_rules
    ADD COLUMN IF NOT EXISTS buy_qty integer DEFAULT 1,
    ADD COLUMN IF NOT EXISTS get_qty integer DEFAULT 1,
    ADD COLUMN IF NOT EXISTS get_target_type character varying(32) DEFAULT 'attraction',
    ADD COLUMN IF NOT EXISTS get_target_id integer,
    ADD COLUMN IF NOT EXISTS get_discount_type character varying(20),
    ADD COLUMN IF NOT EXISTS get_discount_value numeric(10,2);

-- Step 3: Add constraints
-- Step 4: Add documentation comments
```

---

## ⚡ Quick Steps to Fix

### Immediate Action (Next 5 Minutes)

1. **Connect to Render Database**
   - Open Render dashboard
   - Navigate to your PostgreSQL database
   - Open Query Editor or Terminal

2. **Execute Migration**
   ```sql
   -- Copy entire migration SQL from:
   -- migrations/001_add_buy_x_get_y_offers.sql
   ```

3. **Verify Success**
   ```sql
   SELECT column_name FROM information_schema.columns 
   WHERE table_name = 'offer_rules' 
   AND column_name IN ('buy_qty', 'get_qty', 'get_target_type', 'get_target_id', 'get_discount_type', 'get_discount_value');
   
   -- Should return 6 rows
   ```

4. **Test in Frontend**
   - Go to Admin → Offers → Create Offer
   - Select "Buy X Get Y" from rule type
   - Save offer
   - Should work without error now ✅

---

## 🧪 Verification Queries

Run these to confirm migration succeeded:

```sql
-- 1. Check ENUM has new value
SELECT enum_range(NULL::offer_rule_type);
-- Output should include: buy_x_get_y

-- 2. Check columns exist
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'offer_rules' 
AND column_name LIKE 'get_%' OR column_name LIKE 'buy_%'
ORDER BY ordinal_position;
-- Output: 6 rows

-- 3. Check constraints exist
SELECT constraint_name 
FROM information_schema.table_constraints 
WHERE table_name = 'offer_rules' 
AND constraint_name LIKE '%buy_%' OR constraint_name LIKE '%get_%';
-- Output: 4+ constraints

-- 4. Verify data integrity
SELECT COUNT(*) FROM information_schema.views 
WHERE table_name = 'offer_summary';
-- Output: 1 (VIEW exists)
```

---

## ❌ If Migration Fails

### Error: "Cannot rename type in use"
**Solution**: Restart Render backend first, then try migration

### Error: "Column already exists"
**Solution**: This is OK - the `IF NOT EXISTS` clause handles this. Migration is idempotent.

### Error: "Permission denied"
**Solution**: Ensure you're using a database user with ALTER TABLE/TYPE permissions

---

## ✅ After Migration Succeeds

1. **Restart Backend** (if not automatic)
   ```bash
   # In Render dashboard, trigger redeploy
   ```

2. **Test Admin UI**
   - Navigate to Admin → Offers
   - Click "Create Offer"
   - Select "Buy X Get Y" type
   - Fill in details:
     - Buy Qty: 2
     - Get Qty: 1
     - Get Target Type: Combo
     - Get Target: (select a combo)
     - Get Discount: Free
   - Save
   - ✅ Should work without the ENUM error

3. **Monitor Logs**
   - Check Render logs for any errors
   - Should see offer created successfully

---

## 📊 Expected Result After Migration

When you try to create a Buy X Get Y offer:

**Before Migration** ❌:
```
error: invalid input value for enum offer_rule_type: "buy_x_get_y"
```

**After Migration** ✅:
```
{
  "offer_id": 123,
  "title": "Buy 2 Get 1 Free",
  "rule_type": "buy_x_get_y",
  "rules": [{...}],
  "created_at": "2025-12-12T08:51:20Z"
}
```

---

## 🆘 Need Help?

### Step-by-Step for Render Dashboard

1. Log into https://dashboard.render.com
2. Click on your PostgreSQL database service
3. Click "Details" tab
4. Scroll down to "External Database URL"
5. Copy the URL (looks like: `postgresql://user:pass@host/db`)
6. Click "Query" tab or "Terminal"
7. Paste this command:
   ```bash
   psql postgresql://user:pass@host/db < migrations/001_add_buy_x_get_y_offers.sql
   ```
8. Or copy-paste the entire SQL migration and execute

---

## 📝 Migration File Location

The complete migration SQL is at:
```
Snowcity-Backend-main/migrations/001_add_buy_x_get_y_offers.sql
```

---

## ⏱️ Timeline

- **Time to Execute**: ~1 second
- **Expected Downtime**: None
- **Rollback Available**: Yes (see MIGRATION_BUYX_GETY.md)

---

## 🎯 Next Actions

1. ✅ Execute migration on Render database (RIGHT NOW)
2. ✅ Verify with SQL queries above
3. ✅ Restart backend (if needed)
4. ✅ Test in admin UI
5. ✅ Monitor logs

---

**Status**: 🚨 **CRITICAL - Execute migration immediately to resolve ENUM error**

**Timeline**: Execute within next 5-10 minutes to restore functionality

---

**Error Time**: 2025-12-12 08:51:20 UTC  
**Fix Time**: ~5 minutes
**Impact**: Can't create Buy X Get Y offers until migration runs
