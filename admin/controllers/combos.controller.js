const combosModel = require('../../models/combos.model');

exports.listCombos = async (req, res, next) => {
  try {
    const active = req.query.active === undefined ? null : String(req.query.active).toLowerCase() === 'true';
    const data = await combosModel.listCombos({ active });
    res.json({ data, meta: { count: data.length } });
  } catch (err) {
    next(err);
  }
};

exports.getComboById = async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const row = await combosModel.getComboById(id);
    if (!row) return res.status(404).json({ error: 'Combo not found' });
    res.json(row);
  } catch (err) {
    next(err);
  }
};

exports.createCombo = async (req, res, next) => {
  try {
    console.log('=== COMBO CREATION START ===');
    console.log('Request body:', req.body);
    
    const {
      name,
      attraction_ids,
      attraction_prices,
      total_price,
      image_url,
      discount_percent = 0,
      active = true,
      create_slots = true
    } = req.body || {};
    
    console.log('Parsed data:', { name, attraction_ids, attraction_prices, total_price, image_url, discount_percent, active, create_slots });
    
    // Validate that we have the required new format or fall back to legacy
    if (name && attraction_ids && attraction_prices) {
      console.log('Using NEW format for combo creation');
      // New format - slots are generated automatically if create_slots is true
      const row = await combosModel.createCombo({
        name,
        attraction_ids,
        attraction_prices,
        total_price,
        image_url,
        discount_percent,
        active,
        create_slots
      });
      console.log('Combo created successfully:', row);
      res.status(201).json(row);
    } else {
      // Legacy format - convert to new format
      const { attraction_1_id, attraction_2_id, combo_price } = req.body || {};
      if (!attraction_1_id || !attraction_2_id) {
        return res.status(400).json({ error: 'Legacy format requires attraction_1_id and attraction_2_id' });
      }
      
      const legacyAttractionIds = [attraction_1_id, attraction_2_id];
      const legacyAttractionPrices = {
        [attraction_1_id]: combo_price / 2,
        [attraction_2_id]: combo_price / 2
      };
      
      const row = await combosModel.createCombo({
        name: `Combo #${Date.now()}`,
        attraction_ids: legacyAttractionIds,
        attraction_prices: legacyAttractionPrices,
        total_price: combo_price,
        discount_percent,
        active,
        create_slots,
        slots
      });
      res.status(201).json(row);
    }
  } catch (err) {
    next(err);
  }
};

exports.updateCombo = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body };
    
    // Handle legacy format updates
    if (updateData.attraction_1_id || updateData.attraction_2_id) {
      const { attraction_1_id, attraction_2_id, combo_price, ...otherFields } = updateData;
      
      // Convert legacy to new format
      if (attraction_1_id && attraction_2_id) {
        updateData.attraction_ids = [attraction_1_id, attraction_2_id];
        updateData.attraction_prices = {
          [attraction_1_id]: combo_price / 2,
          [attraction_2_id]: combo_price / 2
        };
        updateData.total_price = combo_price;
      }
      
      // Remove legacy fields
      delete updateData.attraction_1_id;
      delete updateData.attraction_2_id;
      delete updateData.combo_price;
    }
    
    const row = await combosModel.updateCombo(id, updateData);
    if (!row) return res.status(404).json({ error: 'Combo not found' });
    res.json(row);
  } catch (err) {
    next(err);
  }
};

exports.deleteCombo = async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const ok = await combosModel.deleteCombo(id);
    if (!ok) return res.status(404).json({ error: 'Combo not found' });
    res.json({ deleted: true });
  } catch (err) {
    next(err);
  }
};