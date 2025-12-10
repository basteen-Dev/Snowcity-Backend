const attractionsModel = require('../../models/attractions.model');
const { buildScopeFilter } = require('../middleware/scopedAccess');

exports.listAttractions = async (req, res, next) => {
  try {
    const search = (req.query.search || '').toString().trim();
    const active = req.query.active === undefined ? null : String(req.query.active).toLowerCase() === 'true';
    const page = Math.max(parseInt(req.query.page || '1', 10), 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit || '20', 10), 1), 100);
    const offset = (page - 1) * limit;

    // Scope: only return attractions this admin can access
    const scopes = req.user.scopes || {};
    const attractionScope = scopes.attraction || [];
    const hasFullAccess = !attractionScope.length || attractionScope.includes('*');
    
    console.log('=== ATTRACTIONS LIST DEBUG ===');
    console.log('User scopes:', scopes);
    console.log('Attraction scope:', attractionScope);
    console.log('Has full access:', hasFullAccess);
    
    if (!hasFullAccess) {
      // If no full access, enforce list filter
      const scopedIds = attractionScope.length ? attractionScope : [null]; // null yields empty
      console.log('Using scoped IDs:', scopedIds);
      const data = await attractionsModel.listAttractions({ search, active, limit, offset, attractionIds: scopedIds });
      console.log('Scoped attractions data length:', data?.length || 0);
      return res.json({ data, meta: { page, limit, count: data.length } });
    }

    const data = await attractionsModel.listAttractions({ search, active, limit, offset });
    console.log('All attractions data length:', data?.length || 0);
    res.json({ data, meta: { page, limit, count: data.length } });
  } catch (err) {
    console.error('Error in listAttractions:', err);
    next(err);
  }
};

exports.getAttractionById = async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const scopes = req.user.scopes || {};
    const attractionScope = scopes.attraction || [];
    if (attractionScope.length && !attractionScope.includes('*') && !attractionScope.includes(id)) {
      return res.status(403).json({ error: 'Forbidden: attraction not in scope' });
    }
    const row = await attractionsModel.getAttractionById(id);
    if (!row) return res.status(404).json({ error: 'Attraction not found' });
    res.json(row);
  } catch (err) {
    next(err);
  }
};

exports.createAttraction = async (req, res, next) => {
  try {
    // Scope: only admins with full attraction module access can create
    const scopes = req.user.scopes || {};
    const attractionScope = scopes.attraction || [];
    if (!attractionScope.includes('*')) {
      return res.status(403).json({ error: 'Forbidden: requires full attraction module access' });
    }
    console.log('=== ATTRACTION CREATION START ===');
    console.log('Request body:', req.body);
    
    const row = await attractionsModel.createAttraction(req.body || {});
    console.log('Attraction created successfully:', row);
    res.status(201).json(row);
  } catch (err) {
    console.error('Error creating attraction:', err);
    next(err);
  }
};

exports.updateAttraction = async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const scopes = req.user.scopes || {};
    const attractionScope = scopes.attraction || [];
    if (attractionScope.length && !attractionScope.includes('*') && !attractionScope.includes(id)) {
      return res.status(403).json({ error: 'Forbidden: attraction not in scope' });
    }
    const row = await attractionsModel.updateAttraction(id, req.body || {});
    if (!row) return res.status(404).json({ error: 'Attraction not found' });
    res.json(row);
  } catch (err) {
    next(err);
  }
};

exports.deleteAttraction = async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const scopes = req.user.scopes || {};
    const attractionScope = scopes.attraction || [];
    if (attractionScope.length && !attractionScope.includes('*') && !attractionScope.includes(id)) {
      return res.status(403).json({ error: 'Forbidden: attraction not in scope' });
    }
    const ok = await attractionsModel.deleteAttraction(id);
    if (!ok) return res.status(404).json({ error: 'Attraction not found' });
    res.json({ deleted: true });
  } catch (err) {
    next(err);
  }
};