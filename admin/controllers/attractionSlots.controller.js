const attractionSlotsModel = require('../../models/attractionSlots.model');

exports.listAttractionSlots = async (req, res, next) => {
  try {
    const { attraction_id, start_date, end_date } = req.query;
    
    if (!attraction_id) {
      return res.status(400).json({ error: 'attraction_id is required' });
    }
    
    // Get attraction details to include in response
    const attractionsModel = require('../../models/attractions.model');
    const attraction = await attractionsModel.getAttractionById(attraction_id);
    if (!attraction) {
      return res.status(404).json({ error: 'Attraction not found' });
    }
    
    // Generate dynamic slots for the requested date range
    const startDate = start_date ? new Date(start_date) : new Date();
    const endDate = end_date ? new Date(end_date) : new Date(startDate.getTime() + 365 * 24 * 60 * 60 * 1000); // Default 1 year
    
    const slots = attractionSlotsModel.generateDynamicSlotsForDateRange(
      attraction_id, 
      startDate, 
      endDate,
      1 // 1-hour duration for attractions
    );
    
    // Include attraction details in the response
    const slotsWithAttractionDetails = slots.map(slot => ({
      ...slot,
      attraction_name: attraction.name,
      attraction_details: {
        name: attraction.name,
        description: attraction.description,
        price: attraction.price
      }
    }));
    
    res.json({ 
      data: slotsWithAttractionDetails, 
      meta: { 
        count: slots.length,
        attraction: {
          id: attraction.attraction_id,
          name: attraction.name,
          description: attraction.description,
          price: attraction.price
        }
      } 
    });
  } catch (err) {
    next(err);
  }
};

exports.getAttractionSlotById = async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const row = await attractionSlotsModel.getSlotById(id);
    if (!row) return res.status(404).json({ error: 'Attraction slot not found' });
    res.json(row);
  } catch (err) {
    next(err);
  }
};

exports.createAttractionSlot = async (req, res, next) => {
  try {
    // For dynamic slots, we don't create in database
    res.status(400).json({ error: 'Dynamic slots cannot be created in database' });
  } catch (err) {
    next(err);
  }
};

exports.updateAttractionSlot = async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const row = await attractionSlotsModel.updateSlot(id, req.body || {});
    if (!row) return res.status(404).json({ error: 'Attraction slot not found' });
    res.json(row);
  } catch (err) {
    next(err);
  }
};

exports.deleteAttractionSlot = async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const ok = await attractionSlotsModel.deleteSlot(id);
    if (!ok) return res.status(404).json({ error: 'Attraction slot not found' });
    res.json({ deleted: true });
  } catch (err) {
    next(err);
  }
};
