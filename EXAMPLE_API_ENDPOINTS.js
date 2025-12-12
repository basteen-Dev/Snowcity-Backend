/**
 * Example: Buy X Get Y Offer API Endpoints
 * 
 * This file demonstrates how to integrate the buyXGetYService into your Express routes.
 * Copy and adapt these patterns to your actual route handlers.
 */

const express = require('express');
const { 
  validateBuyXGetYRule, 
  saveBuyXGetYRule,
  evaluateBuyXGetYOffer,
  getActiveBuyXGetYOffers 
} = require('../services/buyXGetYService');

/**
 * Example 1: Create Buy X Get Y Offer (Admin)
 * 
 * POST /api/admin/offers
 * Body: { title, description, rule_type: 'buy_x_get_y', rules: [...] }
 */
async function createBuyXGetYOffer(req, res) {
  try {
    const { title, description, rules, valid_from, valid_to, image_url, active } = req.body;

    if (!rules || rules.length === 0) {
      return res.status(400).json({ error: 'At least one rule required' });
    }

    // Validate first rule
    const validation = await validateBuyXGetYRule(rules[0]);
    if (!validation.valid) {
      return res.status(400).json({ 
        error: 'Invalid Buy X Get Y rule', 
        details: validation.errors 
      });
    }

    // Create offer in database
    const offerResult = await pool.query(`
      INSERT INTO offers (title, description, rule_type, image_url, valid_from, valid_to, active)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *;
    `, [title, description, 'buy_x_get_y', image_url, valid_from, valid_to, active !== false]);

    const offerId = offerResult.rows[0].offer_id;

    // Save rule
    const savedRule = await saveBuyXGetYRule(offerId, rules[0]);

    res.status(201).json({
      message: 'Buy X Get Y offer created successfully',
      offer: offerResult.rows[0],
      rule: savedRule
    });
  } catch (err) {
    console.error('Create offer error:', err.message);
    res.status(500).json({ error: 'Failed to create offer', details: err.message });
  }
}

/**
 * Example 2: Get Active Buy X Get Y Offers
 * 
 * GET /api/offers/buy-x-get-y
 * Query: ?date=2024-01-15 (optional)
 */
async function getActiveBuyXGetYOffersEndpoint(req, res) {
  try {
    const date = req.query.date ? new Date(req.query.date) : new Date();

    const offers = await getActiveBuyXGetYOffers(date);

    res.json({
      count: offers.length,
      date: date.toISOString(),
      offers: offers.map(offer => ({
        id: offer.offer_id,
        title: offer.title,
        description: offer.description,
        image_url: offer.image_url,
        valid_from: offer.valid_from,
        valid_to: offer.valid_to,
        active: offer.active,
        rules: offer.rules.filter(r => r.rule_type === 'buy_x_get_y')
      }))
    });
  } catch (err) {
    console.error('Get offers error:', err.message);
    res.status(500).json({ error: 'Failed to fetch offers', details: err.message });
  }
}

/**
 * Example 3: Evaluate Buy X Get Y Discount for Cart
 * 
 * POST /api/booking/calculate-discount
 * Body: { 
 *   cart: [
 *     { type: 'combo', id: 5, quantity: 2, price: 800 },
 *     { type: 'attraction', id: 3, quantity: 1, price: 500 }
 *   ]
 * }
 */
async function calculateCartDiscount(req, res) {
  try {
    const { cart } = req.body;

    if (!Array.isArray(cart) || cart.length === 0) {
      return res.status(400).json({ error: 'Cart must be a non-empty array' });
    }

    // Get all active Buy X Get Y offers
    const offers = await getActiveBuyXGetYOffers();

    const results = [];
    let totalDiscount = 0;
    let maxOfferDiscount = 0;
    let selectedOffer = null;

    // Evaluate all offers, keep the one with highest discount
    for (const offer of offers) {
      const evaluation = await evaluateBuyXGetYOffer(cart, offer);

      if (evaluation.applies) {
        results.push({
          offerId: offer.offer_id,
          title: offer.title,
          discount: evaluation.discount,
          summary: evaluation.summary,
          priority: offer.rules[0]?.priority || 100
        });

        // Keep track of best offer
        if (evaluation.discount > maxOfferDiscount) {
          maxOfferDiscount = evaluation.discount;
          selectedOffer = {
            offerId: offer.offer_id,
            title: offer.title,
            discount: evaluation.discount,
            summary: evaluation.summary,
            discountedItems: evaluation.discountedItems
          };
        }
      }
    }

    res.json({
      cartApplicableOffers: results.length,
      selectedOffer: selectedOffer || { discount: 0, summary: 'No offers applicable' },
      totalDiscount: selectedOffer?.discount || 0,
      cartTotal: cart.reduce((sum, item) => sum + (item.price * item.quantity), 0),
      finalTotal: cart.reduce((sum, item) => sum + (item.price * item.quantity), 0) - (selectedOffer?.discount || 0)
    });
  } catch (err) {
    console.error('Calculate discount error:', err.message);
    res.status(500).json({ error: 'Failed to calculate discount', details: err.message });
  }
}

/**
 * Example 4: Update Buy X Get Y Offer
 * 
 * PUT /api/admin/offers/:offerId
 * Body: { title, description, rules: [...], valid_from, valid_to, active }
 */
async function updateBuyXGetYOffer(req, res) {
  try {
    const { offerId } = req.params;
    const { title, description, rules, valid_from, valid_to, active } = req.body;

    if (rules && rules.length > 0) {
      const validation = await validateBuyXGetYRule(rules[0]);
      if (!validation.valid) {
        return res.status(400).json({ 
          error: 'Invalid Buy X Get Y rule', 
          details: validation.errors 
        });
      }
    }

    // Update offer
    const updateResult = await pool.query(`
      UPDATE offers 
      SET title = $1, description = $2, valid_from = $3, valid_to = $4, active = $5, updated_at = NOW()
      WHERE offer_id = $6
      RETURNING *;
    `, [title, description, valid_from, valid_to, active !== false, offerId]);

    if (updateResult.rows.length === 0) {
      return res.status(404).json({ error: 'Offer not found' });
    }

    // Update rule if provided
    let savedRule = null;
    if (rules && rules.length > 0) {
      // Delete old rules
      await pool.query('DELETE FROM offer_rules WHERE offer_id = $1 AND rule_type = $2', [offerId, 'buy_x_get_y']);
      
      // Save new rule
      savedRule = await saveBuyXGetYRule(offerId, rules[0]);
    }

    res.json({
      message: 'Offer updated successfully',
      offer: updateResult.rows[0],
      rule: savedRule
    });
  } catch (err) {
    console.error('Update offer error:', err.message);
    res.status(500).json({ error: 'Failed to update offer', details: err.message });
  }
}

/**
 * Example 5: Delete Buy X Get Y Offer
 * 
 * DELETE /api/admin/offers/:offerId
 */
async function deleteBuyXGetYOffer(req, res) {
  try {
    const { offerId } = req.params;

    // Delete rules first (foreign key constraint)
    await pool.query('DELETE FROM offer_rules WHERE offer_id = $1', [offerId]);

    // Delete offer
    const result = await pool.query('DELETE FROM offers WHERE offer_id = $1 RETURNING *;', [offerId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Offer not found' });
    }

    res.json({ 
      message: 'Offer deleted successfully',
      deletedOffer: result.rows[0]
    });
  } catch (err) {
    console.error('Delete offer error:', err.message);
    res.status(500).json({ error: 'Failed to delete offer', details: err.message });
  }
}

/**
 * Example 6: Bulk Evaluate Offers for Multiple Carts
 * 
 * POST /api/admin/offers/evaluate-bulk
 * Body: {
 *   carts: [
 *     { id: 'user1', items: [...] },
 *     { id: 'user2', items: [...] }
 *   ]
 * }
 * Useful for batch operations or reporting
 */
async function bulkEvaluateOffers(req, res) {
  try {
    const { carts } = req.body;

    if (!Array.isArray(carts)) {
      return res.status(400).json({ error: 'carts must be an array' });
    }

    const offers = await getActiveBuyXGetYOffers();
    const results = [];

    for (const { id, items } of carts) {
      let bestOffer = null;
      let maxDiscount = 0;

      for (const offer of offers) {
        const evaluation = await evaluateBuyXGetYOffer(items, offer);
        if (evaluation.applies && evaluation.discount > maxDiscount) {
          maxDiscount = evaluation.discount;
          bestOffer = {
            offerId: offer.offer_id,
            title: offer.title,
            discount: evaluation.discount
          };
        }
      }

      results.push({
        cartId: id,
        applicableOffer: bestOffer,
        totalDiscount: bestOffer?.discount || 0
      });
    }

    res.json({
      evaluatedCarts: results.length,
      results
    });
  } catch (err) {
    console.error('Bulk evaluate error:', err.message);
    res.status(500).json({ error: 'Failed to evaluate offers', details: err.message });
  }
}

/**
 * Example: Route Setup
 * 
 * Add these to your Express app in routes/offers.js or similar
 */
const router = express.Router();

// Admin routes (protected with authentication middleware)
router.post('/admin/offers', createBuyXGetYOffer);
router.get('/admin/offers/buy-x-get-y', getActiveBuyXGetYOffersEndpoint);
router.put('/admin/offers/:offerId', updateBuyXGetYOffer);
router.delete('/admin/offers/:offerId', deleteBuyXGetYOffer);
router.post('/admin/offers/evaluate-bulk', bulkEvaluateOffers);

// Public routes
router.post('/booking/calculate-discount', calculateCartDiscount);
router.get('/offers/active', getActiveBuyXGetYOffersEndpoint);

module.exports = router;

/**
 * Usage in main app.js:
 * 
 * const offersRouter = require('./routes/offers');
 * app.use('/api', offersRouter);
 */
