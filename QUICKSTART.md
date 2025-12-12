# Buy X Get Y Feature - Quick Start Guide

## 📋 What This Feature Does

Enables admins to create "Buy X Get Y" discount offers:
- **Example**: "Buy 2 combos, get 1 free"
- **Example**: "Buy 1 attraction, get 2 at 50% off"
- **Example**: "Buy 2 items, get 1 at ₹100 off"

## ⚡ Quick Deployment (5 Steps)

### 1️⃣ Backup Database (2 minutes)
```bash
pg_dump snowcity > backup_$(date +%s).sql
```

### 2️⃣ Pull Latest Code (1 minute)
```bash
git pull origin main
npm install
```

### 3️⃣ Run Migration (1 minute)
```bash
npm run migrate:001
```

### 4️⃣ Verify Migration (1 minute)
```bash
npm run migrate:check
```
✅ All checks should pass

### 5️⃣ Deploy & Restart (1 minute)
```bash
pm2 restart snowcity-backend
```

## 📂 What Was Added

### Files Created
```
migrations/
├── 001_add_buy_x_get_y_offers.sql          (Migration SQL)
├── run_001_add_buy_x_get_y_offers.js       (Runner)
└── check_migration_status.js               (Validator)

services/
└── buyXGetYService.js                      (Business Logic)

Documentation/
├── MIGRATION_BUYX_GETY.md                  (Detailed Guide)
├── BUYX_GETY_README.md                     (Overview)
├── EXAMPLE_API_ENDPOINTS.js                (API Examples)
└── QUICKSTART.md                           (This File)
```

### Files Modified
```
package.json                                 (Added npm scripts)
```

## 🔧 Database Schema Changes

### New Columns in `offer_rules`
```sql
-- What you need to buy
buy_qty INTEGER DEFAULT 1                   -- Must buy this many

-- What you get discount on
get_qty INTEGER DEFAULT 1                   -- Get this many items
get_target_type VARCHAR(32)                 -- 'attraction' or 'combo'
get_target_id INTEGER                       -- Specific item (or NULL for all)

-- Type of discount
get_discount_type VARCHAR(20)               -- 'percent', 'amount', or NULL (free)
get_discount_value NUMERIC(10,2)            -- % or ₹ amount
```

### New ENUM Value
```sql
offer_rule_type: 'holiday', 'happy_hour', 'weekday_special', 
                 'dynamic_pricing', 'date_slot_pricing', 'buy_x_get_y' ✨
```

## 🎯 Admin Features

### Creating an Offer
1. Go to Admin → Catalog → Offers
2. Click "Create Offer"
3. Select "Buy X Get Y" from rule type
4. Fill in:
   - Buy Quantity: `2`
   - Get Quantity: `1`
   - Get Target Type: `Combo`
   - Get Target: `Combo #5`
   - Get Discount: `Free`
5. Save

### Display Examples
- "Buy 2 get 1 Combo #5 (Free)"
- "Buy 1 get 2 Attraction #3 (₹50)"
- "Buy 2 get 1 Attraction #7 (15%)"

## 🛒 Customer Experience

### At Checkout
1. Customer adds items to cart
2. System checks active Buy X Get Y offers
3. If cart matches offer conditions → discount applied
4. Display: "Buy 2 Get 1 Discount: -₹800"
5. Final total reduced

### Example Scenario
```
Cart: 3× Combo #5 @ ₹800 = ₹2400
Offer: Buy 2 Get 1 Free
Discount: -₹800 (1 free item)
Total: ₹1600
```

## 📖 Documentation Reference

| Document | Purpose | When to Read |
|----------|---------|--------------|
| `MIGRATION_BUYX_GETY.md` | **Comprehensive guide** with all details, troubleshooting, performance notes | Before deployment, for troubleshooting |
| `BUYX_GETY_README.md` | **Complete feature overview** with implementation checklist, scenarios, rollback | Implementation planning |
| `EXAMPLE_API_ENDPOINTS.js` | **API integration patterns** with working code examples | When building API endpoints |
| `QUICKSTART.md` | **This file** - Quick reference for common tasks | Quick lookup |

## 🧪 Testing

### Test Migration
```bash
npm run migrate:check
```
Expected output: ✅ All migration checks passed!

### Test API Endpoints (if implemented)
```bash
# Create offer
curl -X POST http://localhost:3000/api/admin/offers \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Buy 2 Get 1 Free",
    "rule_type": "buy_x_get_y",
    "rules": [{
      "buy_qty": 2,
      "get_qty": 1,
      "get_target_type": "combo",
      "get_target_id": 5,
      "get_discount_type": null
    }],
    "active": true
  }'

# Calculate discount
curl -X POST http://localhost:3000/api/booking/calculate-discount \
  -H "Content-Type: application/json" \
  -d '{
    "cart": [
      {"type": "combo", "id": 5, "quantity": 2, "price": 800},
      {"type": "combo", "id": 5, "quantity": 1, "price": 800}
    ]
  }'
```

## 🐛 Troubleshooting

### Problem: Migration fails with "already exists"
```bash
# This is normal - just verify everything was applied
npm run migrate:check
```

### Problem: Database connection error
```bash
# Check .env file has correct connection string
cat .env | grep DB_
```

### Problem: Discount not applying
1. Check migration was executed: `npm run migrate:check`
2. Verify cart meets offer conditions (buy_qty)
3. Check offer is active and within valid_from/to dates

### Problem: Want to undo changes
```bash
# Restore from backup
psql -U postgres -d snowcity < backup_1234567890.sql
```

## 🚀 Next Steps

### For Developers
1. ✅ Migration completed - database ready
2. 📝 Integrate API endpoints (see `EXAMPLE_API_ENDPOINTS.js`)
3. 🧪 Test with sample data
4. 📊 Monitor performance if many offers

### For DevOps
1. ✅ Execute migration on staging
2. ✅ Verify with status checker
3. ✅ Execute migration on production
4. ✅ Monitor application logs
5. ✅ Verify customer checkout flow

### For Product/Admin
1. 🎯 Create sample Buy X Get Y offers
2. 📱 Test on mobile and desktop
3. 💬 Gather customer feedback
4. 🔄 Create more variations

## 💡 Tips

### Performance
- Caching active offers for ~5 minutes reduces database load
- Add index: `CREATE INDEX idx_offers_rule_type ON offer_rules(rule_type)`

### Best Practices
- Use descriptive offer titles: "Spring Sale: Buy 2 Get 1 Free"
- Set reasonable expiration dates
- Start with limited offers to test
- Monitor usage patterns

### Common Offers
```
Buy 2 Get 1 Free           (buy_qty=2, get_qty=1, discount=free)
Buy 1 Get 2 at 50% Off     (buy_qty=1, get_qty=2, discount=50%)
Buy 3 Get ₹200 Off         (buy_qty=3, get_qty=1, discount=₹200)
Bundle Deal                (buy_qty=2, get_qty=2, discount=free on all)
```

## 📞 Support

### Resources
- Full migration guide: `MIGRATION_BUYX_GETY.md`
- API patterns: `EXAMPLE_API_ENDPOINTS.js`
- Service docs: `services/buyXGetYService.js`

### Common Commands
```bash
# Check everything is ready
npm run migrate:check

# Deploy migration
npm run migrate:001

# Restart backend
pm2 restart snowcity-backend

# View logs
pm2 logs snowcity-backend
```

## ✅ Deployment Checklist

- [ ] Database backed up
- [ ] Latest code pulled
- [ ] Migration executed: `npm run migrate:001`
- [ ] Migration verified: `npm run migrate:check`
- [ ] Backend restarted
- [ ] Admin can access Offers section
- [ ] Can create Buy X Get Y offers
- [ ] Offers display correctly in admin list
- [ ] Ready for customer testing

---

**Ready to deploy?** Follow the 5 quick steps above! 🚀

Questions? See the full documentation in `MIGRATION_BUYX_GETY.md`
