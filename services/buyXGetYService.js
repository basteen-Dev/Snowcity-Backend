/**
 * Buy X Get Y Offer Validation and Processing
 * 
 * This module handles validation, persistence, and evaluation of Buy X Get Y offers.
 * Integrates with the offer_rules table and pricing engine.
 */

const pool = require('../db');

/**
 * Validate Buy X Get Y offer rule data before saving
 * 
 * @param {Object} rule - The rule data from frontend
 * @returns {Object} { valid: boolean, errors: string[] }
 */
async function validateBuyXGetYRule(rule) {
  const errors = [];

  // Validate buy quantity
  if (!rule.buy_qty || rule.buy_qty < 1) {
    errors.push('buy_qty must be >= 1');
  }

  // Validate get quantity  
  if (!rule.get_qty || rule.get_qty < 1) {
    errors.push('get_qty must be >= 1');
  }

  // Validate get target type
  if (!['attraction', 'combo'].includes(rule.get_target_type)) {
    errors.push('get_target_type must be "attraction" or "combo"');
  }

  // Validate get target exists
  if (rule.get_target_id) {
    try {
      const table = rule.get_target_type === 'attraction' ? 'attractions' : 'combos';
      const idCol = rule.get_target_type === 'attraction' ? 'attraction_id' : 'combo_id';
      
      const check = await pool.query(
        `SELECT ${idCol} FROM ${table} WHERE ${idCol} = $1`,
        [rule.get_target_id]
      );

      if (check.rows.length === 0) {
        errors.push(`${rule.get_target_type} #${rule.get_target_id} does not exist`);
      }
    } catch (err) {
      errors.push(`Failed to validate ${rule.get_target_type}: ${err.message}`);
    }
  }

  // Validate discount type
  if (rule.get_discount_type && !['percent', 'amount'].includes(rule.get_discount_type)) {
    errors.push('get_discount_type must be "percent", "amount", or empty (for free)');
  }

  // Validate discount value
  if (rule.get_discount_type && rule.get_discount_value === undefined) {
    errors.push('get_discount_value required when get_discount_type is set');
  }

  if (rule.get_discount_value !== undefined && rule.get_discount_value < 0) {
    errors.push('get_discount_value must be >= 0');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Save Buy X Get Y rule to database
 * 
 * @param {number} offerId - The offer ID
 * @param {Object} rule - The rule data
 * @returns {Promise<Object>} Saved rule with rule_id
 */
async function saveBuyXGetYRule(offerId, rule) {
  const validation = await validateBuyXGetYRule(rule);
  if (!validation.valid) {
    throw new Error(`Invalid Buy X Get Y rule: ${validation.errors.join(', ')}`);
  }

  const result = await pool.query(`
    INSERT INTO offer_rules (
      offer_id,
      rule_type,
      buy_qty,
      get_qty,
      get_target_type,
      get_target_id,
      get_discount_type,
      get_discount_value,
      applies_to_all,
      target_type,
      target_id,
      priority,
      created_at,
      updated_at
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())
    RETURNING *;
  `, [
    offerId,
    'buy_x_get_y',
    rule.buy_qty || 1,
    rule.get_qty || 1,
    rule.get_target_type || 'attraction',
    rule.get_target_id || null,
    rule.get_discount_type || null,
    rule.get_discount_value || null,
    !rule.get_target_id,  // applies_to_all if no specific target
    rule.get_target_type || 'attraction',  // target_type for compatibility
    rule.get_target_id || null,  // target_id for compatibility
    rule.priority || 100
  ]);

  return result.rows[0];
}

/**
 * Evaluate if a cart qualifies for Buy X Get Y discount
 * 
 * @param {Array} cartItems - Items in cart [{ type: 'attraction'|'combo', id: number, quantity: number, price: number }]
 * @param {Object} offer - The offer object with rules
 * @returns {Object} { applies: boolean, discount: number, summary: string, appliedRule: Object }
 */
async function evaluateBuyXGetYOffer(cartItems, offer) {
  if (!offer || offer.rule_type !== 'buy_x_get_y' || !offer.rules || offer.rules.length === 0) {
    return { applies: false, discount: 0, summary: 'Not a Buy X Get Y offer' };
  }

  const rule = offer.rules[0]; // Use first rule
  const now = new Date();

  // Check if offer is active
  if (offer.valid_from && new Date(offer.valid_from) > now) {
    return { applies: false, discount: 0, summary: 'Offer not yet valid' };
  }

  if (offer.valid_to && new Date(offer.valid_to) < now) {
    return { applies: false, discount: 0, summary: 'Offer expired' };
  }

  if (!offer.active) {
    return { applies: false, discount: 0, summary: 'Offer inactive' };
  }

  // Get buy-eligible items (all items or specific type)
  const buyEligible = cartItems.filter(item => {
    // If applies_to_all is true, all items of buy target_type qualify
    // If applies_to_all is false, only specific target_id qualifies
    if (rule.applies_to_all) {
      return item.type === (rule.target_type || 'attraction');
    }
    return item.type === (rule.target_type || 'attraction') && item.id === rule.target_id;
  });

  // Count eligible buy items
  const buyQuantity = buyEligible.reduce((sum, item) => sum + item.quantity, 0);

  if (buyQuantity < rule.buy_qty) {
    return {
      applies: false,
      discount: 0,
      summary: `Need to buy ${rule.buy_qty} items, cart has ${buyQuantity}`
    };
  }

  // Get get-eligible items
  const getEligible = cartItems.filter(item => {
    if (rule.applies_to_all && !rule.get_target_id) {
      return item.type === rule.get_target_type;
    }
    return item.type === rule.get_target_type && item.id === rule.get_target_id;
  });

  const getQuantity = Math.min(
    rule.get_qty * Math.floor(buyQuantity / rule.buy_qty),
    getEligible.reduce((sum, item) => sum + item.quantity, 0)
  );

  if (getQuantity === 0) {
    return {
      applies: false,
      discount: 0,
      summary: `No eligible items to get discount on`
    };
  }

  // Calculate discount
  let discountAmount = 0;
  const discountedItems = [];

  if (!rule.get_discount_type) {
    // Free items
    const itemsToDiscount = getEligible.sort((a, b) => b.price - a.price).slice(0, getQuantity);
    discountAmount = itemsToDiscount.reduce((sum, item) => sum + item.price, 0);
    discountedItems.push(...itemsToDiscount.map(item => ({ ...item, discount: item.price, type: 'free' })));
  } else if (rule.get_discount_type === 'percent') {
    // Percentage discount
    const itemsToDiscount = getEligible.sort((a, b) => b.price - a.price).slice(0, getQuantity);
    itemsToDiscount.forEach(item => {
      const discount = (item.price * rule.get_discount_value) / 100;
      discountAmount += discount;
      discountedItems.push({ ...item, discount, type: 'percent', rate: rule.get_discount_value });
    });
  } else if (rule.get_discount_type === 'amount') {
    // Flat amount discount
    const itemsToDiscount = getEligible.slice(0, getQuantity);
    itemsToDiscount.forEach(item => {
      const discount = Math.min(rule.get_discount_value, item.price);
      discountAmount += discount;
      discountedItems.push({ ...item, discount, type: 'amount' });
    });
  }

  // Respect max_discount if set
  if (offer.max_discount && discountAmount > offer.max_discount) {
    discountAmount = offer.max_discount;
  }

  const targetName = rule.get_target_id 
    ? `${rule.get_target_type} #${rule.get_target_id}`
    : `${rule.get_target_type}s`;

  let summary = `Buy ${rule.buy_qty} get ${rule.get_qty} ${targetName}`;
  if (rule.get_discount_type === 'percent') {
    summary += ` (${rule.get_discount_value}% off)`;
  } else if (rule.get_discount_type === 'amount') {
    summary += ` (₹${rule.get_discount_value} off)`;
  } else {
    summary += ` (Free)`;
  }

  return {
    applies: true,
    discount: Math.round(discountAmount * 100) / 100,
    summary,
    appliedRule: rule,
    discountedItems,
    details: {
      buyQuantity,
      getQuantity,
      discountType: rule.get_discount_type || 'free',
      discountValue: rule.get_discount_value
    }
  };
}

/**
 * Get all Buy X Get Y offers active for a given period
 * 
 * @param {Date} date - The date to check (default: now)
 * @returns {Promise<Array>} Array of active Buy X Get Y offers
 */
async function getActiveBuyXGetYOffers(date = new Date()) {
  const result = await pool.query(`
    SELECT 
      o.offer_id,
      o.title,
      o.description,
      o.image_url,
      o.rule_type,
      o.discount_type,
      o.discount_value,
      o.max_discount,
      o.valid_from,
      o.valid_to,
      o.active,
      json_agg(
        json_build_object(
          'rule_id', r.rule_id,
          'rule_type', r.rule_type,
          'buy_qty', r.buy_qty,
          'get_qty', r.get_qty,
          'get_target_type', r.get_target_type,
          'get_target_id', r.get_target_id,
          'get_discount_type', r.get_discount_type,
          'get_discount_value', r.get_discount_value,
          'applies_to_all', r.applies_to_all,
          'target_type', r.target_type,
          'target_id', r.target_id,
          'priority', r.priority
        )
      ) as rules
    FROM offers o
    LEFT JOIN offer_rules r ON o.offer_id = r.offer_id
    WHERE o.active = true
      AND o.rule_type = 'buy_x_get_y'
      AND (o.valid_from IS NULL OR o.valid_from <= $1)
      AND (o.valid_to IS NULL OR o.valid_to >= $1)
    GROUP BY o.offer_id
    ORDER BY o.offer_id;
  `, [date]);

  return result.rows;
}

module.exports = {
  validateBuyXGetYRule,
  saveBuyXGetYRule,
  evaluateBuyXGetYOffer,
  getActiveBuyXGetYOffers
};
