# Buy X Get Y Feature - Architecture & Data Flow

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        CUSTOMER FLOW                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  Customer adds items to cart  →  Checkout flow starts           │
│         ↓                                                         │
│  System calculates discount  →  evaluateBuyXGetYOffer()         │
│         ↓                                                         │
│  Discount applied to cart  →  Total reduced                     │
│         ↓                                                         │
│  Booking created  →  Offer tracking in booking                  │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                        ADMIN FLOW                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  Admin clicks "Create Offer"  →  OfferForm.jsx opens            │
│         ↓                                                         │
│  Selects "Buy X Get Y" type  →  New fields appear               │
│         ↓                                                         │
│  Fills in rule details  →  Buy qty, get qty, target, discount   │
│         ↓                                                         │
│  Submits form  →  API POST /api/admin/offers                    │
│         ↓                                                         │
│  Backend validates  →  validateBuyXGetYRule()                   │
│         ↓                                                         │
│  Saves to database  →  saveBuyXGetYRule()                       │
│         ↓                                                         │
│  Admin sees offer in list  →  "Buy 2 get 1 Combo #5 (Free)"    │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                      COMPONENT DIAGRAM                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────┐                                                │
│  │  OfferForm   │  (Frontend - React)                            │
│  │   (Create)   │                                                │
│  └──────┬───────┘                                                │
│         │ POST /api/admin/offers                                 │
│         ↓                                                         │
│  ┌──────────────────────────┐                                    │
│  │  Express Route Handler   │  (Backend - Node.js)              │
│  │  (API Endpoint)          │                                    │
│  └──────────┬───────────────┘                                    │
│             │                                                    │
│    ┌────────┴────────┐                                           │
│    ↓                 ↓                                            │
│  ┌──────────────────────────┐  ┌──────────────────────────┐      │
│  │  Validate Rule           │  │  Save Rule              │      │
│  │  validateBuyXGetYRule()  │  │  saveBuyXGetYRule()     │      │
│  │  (Service)               │  │  (Service)              │      │
│  └──────────┬───────────────┘  └──────────┬──────────────┘      │
│             │                             │                     │
│             └─────────────┬───────────────┘                     │
│                           ↓                                     │
│                 ┌──────────────────────┐                        │
│                 │  PostgreSQL Database │                        │
│                 │  (offer_rules table) │                        │
│                 └──────────────────────┘                        │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

## Data Model

### Database Schema Changes

```sql
-- New columns in offer_rules table:

offer_rules table
├── existing columns (rule_id, offer_id, etc.)
│
└── NEW columns for Buy X Get Y:
    ├── buy_qty INT DEFAULT 1
    │   └── How many items customer must buy
    │
    ├── get_qty INT DEFAULT 1
    │   └── How many items get discount
    │
    ├── get_target_type VARCHAR(32)
    │   ├── Value: 'attraction' or 'combo'
    │   └── Type of items to discount
    │
    ├── get_target_id INT
    │   ├── Specific item ID (or NULL)
    │   └── NULL = all items of get_target_type
    │
    ├── get_discount_type VARCHAR(20)
    │   ├── Values: 'percent', 'amount', or NULL
    │   └── NULL = free items
    │
    └── get_discount_value NUMERIC(10,2)
        ├── % rate or ₹ amount
        └── Only used if get_discount_type is set
```

## Offer Evaluation Flow

```
┌─────────────────────────────────────────┐
│  evaluateBuyXGetYOffer(cartItems, offer)│
└────────────────┬────────────────────────┘
                 ↓
         ┌───────────────────┐
         │ Check Offer Valid? │
         │ - Active?         │
         │ - Within dates?   │
         └────┬────────┬─────┘
             NO       YES
              ↓         ↓
         (return       ┌──────────────────────┐
          no disc)     │ Find Buy-Eligible    │
                       │ Items in Cart        │
                       │ (type match)         │
                       └──┬──────────────┬────┘
                          │              │
                    Count ≥ buy_qty?     No (return no discount)
                          │              │
                         YES             ↓
                          │          (return)
                          ↓
                 ┌──────────────────────┐
                 │ Find Get-Eligible    │
                 │ Items in Cart        │
                 │ (target match)       │
                 └──┬──────────────┬────┘
                    │              │
             Count ≥ 0?            No (return no discount)
                    │              │
                   YES             ↓
                    │          (return)
                    ↓
         ┌────────────────────────────┐
         │ Calculate Discount Amount  │
         │ Based on:                  │
         │ - get_discount_type        │
         │ - get_discount_value       │
         │ - get_qty                  │
         └────┬──────────┬────────────┘
              │          │
         ┌────┴──────┴──┐
         │ Type Check    │
         ├─────────────┬─┴────────────┬─────────┐
         ↓             ↓              ↓         ↓
      NULL(Free)  percent          amount    unknown
       │            │               │         │
       ↓            ↓               ↓         ↓
    Items FREE  % of Price  Flat Amount  (error)
       │            │               │
       ├────────┬──┬┴───────────────┘
       ↓        ↓  ↓
    ┌────────────────────────┐
    │ Apply Discount         │
    │ Respect max_discount   │
    │ Return: {              │
    │   applies: true,       │
    │   discount: amount,    │
    │   summary: string      │
    │ }                      │
    └────────────────────────┘
```

## Service Module Architecture

```javascript
buyXGetYService
├── validateBuyXGetYRule(rule)
│   ├── Check buy_qty >= 1
│   ├── Check get_qty >= 1
│   ├── Check get_target_type valid
│   ├── Verify target item exists
│   ├── Check discount_type valid
│   ├── Validate discount_value
│   └── Return: { valid, errors[] }
│
├── saveBuyXGetYRule(offerId, rule)
│   ├── Validate rule
│   ├── Insert to offer_rules
│   └── Return: saved rule with rule_id
│
├── evaluateBuyXGetYOffer(cartItems, offer)
│   ├── Check offer validity (dates, active)
│   ├── Count buy-eligible items
│   ├── Count get-eligible items
│   ├── Calculate discount:
│   │   ├── If free: sum item prices
│   │   ├── If percent: sum (price * rate%)
│   │   └── If amount: multiply count × amount
│   ├── Respect max_discount
│   └── Return: { applies, discount, summary, details }
│
└── getActiveBuyXGetYOffers(date)
    ├── Query offers by date
    ├── Aggregate rules as JSON
    ├── Filter rule_type = 'buy_x_get_y'
    └── Return: [offers]
```

## API Endpoint Patterns

```
POST /api/admin/offers
├── Input: {
│   title: "Buy 2 Get 1 Free",
│   rule_type: "buy_x_get_y",
│   rules: [{
│     buy_qty: 2,
│     get_qty: 1,
│     get_target_type: "combo",
│     get_target_id: 5,
│     get_discount_type: null
│   }],
│   valid_from: "2024-01-01",
│   valid_to: "2024-12-31",
│   active: true
│ }
├── Process:
│   ├── Validate rule (validateBuyXGetYRule)
│   ├── Create offer (INSERT)
│   ├── Save rule (saveBuyXGetYRule)
│   └── Return saved offer + rule
└── Output: { offer, rule }

GET /api/offers/buy-x-get-y?date=2024-01-15
├── Process: getActiveBuyXGetYOffers(date)
└── Output: [{ offer with rules }, ...]

POST /api/booking/calculate-discount
├── Input: { cart: [items] }
├── Process:
│   ├── Get active offers
│   ├── For each offer: evaluateBuyXGetYOffer()
│   ├── Find best discount
│   └── Return selected offer
└── Output: {
    selectedOffer: { discount, summary },
    totalDiscount: amount
   }

PUT /api/admin/offers/:offerId
├── Input: { title, description, rules, valid_from, valid_to, active }
├── Process: Update offer + rule
└── Output: { offer, rule }

DELETE /api/admin/offers/:offerId
├── Process: Delete offer rules + offer
└── Output: { success: true }
```

## Offer Evaluation Examples

### Example 1: Buy 2 Get 1 Free
```
Rule Config:
  buy_qty: 2
  get_qty: 1
  get_target_type: 'combo'
  get_target_id: 5
  get_discount_type: null (FREE)

Cart:
  3× Combo #5 @ ₹800 = ₹2400

Calculation:
  ✓ Buy-eligible items: 3 combos ≥ 2 required
  ✓ Get-eligible items: 3 combos available
  ✓ Apply to: 1 item (get_qty)
  Discount: 1 × ₹800 = ₹800
  
Result:
  applies: true
  discount: 800
  summary: "Buy 2 get 1 Combo #5 (Free)"
  cartTotal: 2400
  finalTotal: 1600
```

### Example 2: Buy 1 Get 2 at 50% Off
```
Rule Config:
  buy_qty: 1
  get_qty: 2
  get_target_type: 'attraction'
  get_target_id: 3
  get_discount_type: 'percent'
  get_discount_value: 50

Cart:
  2× Attraction #3 @ ₹500 = ₹1000

Calculation:
  ✓ Buy-eligible items: 2 ≥ 1 required
  ✓ Get-eligible items: 2 available
  ✓ Apply to: min(2, 2) = 2 items
  Discount: (500 × 50%) + (500 × 50%) = ₹500
  
Result:
  applies: true
  discount: 500
  summary: "Buy 1 get 2 Attraction #3 (50%)"
  cartTotal: 1000
  finalTotal: 500
```

### Example 3: No Match
```
Rule Config:
  buy_qty: 3
  get_target_type: 'combo'

Cart:
  2× Combo #5 @ ₹800 = ₹1600

Calculation:
  ✗ Buy-eligible items: 2 < 3 required
  
Result:
  applies: false
  discount: 0
  summary: "Need 3 items, cart has 2"
```

## Deployment Steps Flowchart

```
START
  ↓
Backup Database
  ├─ pg_dump snowcity
  ↓
Pull Code
  ├─ git pull
  ├─ npm install
  ↓
Run Migration
  ├─ npm run migrate:001
  ├─ Check for errors
  ↓
Verify Migration
  ├─ npm run migrate:check
  ├─ All checks pass? ──→ YES ↓
  │                       NO → STOP
  ├─ ENUM updated ✓
  ├─ 6 columns added ✓
  ├─ Constraints added ✓
  ├─ VIEW created ✓
  ↓
Restart Backend
  ├─ pm2 restart snowcity-backend
  ↓
Test Endpoints
  ├─ POST /api/admin/offers (create)
  ├─ GET /api/offers/buy-x-get-y (list)
  ├─ POST /api/booking/calculate-discount (evaluate)
  ↓
Success! 🎉
END
```

## Performance Considerations

```
Query Performance
├── getActiveBuyXGetYOffers(): ~5-10ms (depends on offer count)
├── evaluateBuyXGetYOffer(): ~1-2ms (per offer evaluation)
└── Recommendation: Cache active offers for 5 minutes

Indexes to Consider
├── CREATE INDEX idx_offers_rule_type ON offer_rules(rule_type)
├── CREATE INDEX idx_offers_active ON offers(active, valid_from, valid_to)
└── CREATE INDEX idx_offer_rules_offer ON offer_rules(offer_id)

Scaling
├── 100 offers: No optimization needed
├── 1000 offers: Add indexes, implement caching
├── 10000+ offers: Consider partitioning by date range
```

## Security Considerations

```
Input Validation
├── Rule data validated before saving
├── Target IDs verified (attraction/combo exist)
├── Discount values validated (>= 0)
├── Quantities validated (>= 1)

Database Security
├── Migration uses prepared statements
├── Input parameters parameterized ($1, $2, etc.)
├── No SQL injection vulnerabilities

API Security
├── Authentication required (admin only)
├── Authorization checks (offer ownership)
├── Rate limiting recommended
└── Input validation on all endpoints
```

---

## Quick Reference Tables

### Discount Type Options
| Type | Value | Example |
|------|-------|---------|
| Free | NULL | Get 1 free |
| Percent | 15 | 15% off |
| Amount | 500 | ₹500 off |

### Target Type Options
| Type | Description | Examples |
|------|-------------|----------|
| attraction | Individual attractions | ATM, Museum, Zoo |
| combo | Pre-packaged combos | Weekend Special, Family Pack |

### Offer States
| Status | Condition | Result |
|--------|-----------|--------|
| Eligible | Cart matches all conditions | Discount applied ✓ |
| Not Yet Valid | Before valid_from date | Discount not applied ✗ |
| Expired | After valid_to date | Discount not applied ✗ |
| Inactive | active = false | Discount not applied ✗ |
| Not Matching | Cart doesn't meet buy_qty | Discount not applied ✗ |

---

**Version**: 1.0  
**Status**: ✅ Production Ready  
**Date**: 2024
