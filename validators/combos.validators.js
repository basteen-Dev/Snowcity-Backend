const { body, param } = require('express-validator');

const createComboValidator = [
  body('name').trim().notEmpty().withMessage('Combo name is required'),
  body('attraction_ids').isArray({ min: 2 }).withMessage('At least 2 attractions are required'),
  body('attraction_ids.*').isInt({ min: 1 }).toInt().withMessage('Each attraction ID must be a positive integer'),
  body('attraction_prices').isObject().withMessage('Attraction prices object is required'),
  body('attraction_prices.*').isFloat({ min: 0 }).toFloat().withMessage('All attraction prices must be non-negative'),
  body('total_price').isFloat({ min: 0 }).toFloat().withMessage('Total price must be non-negative'),
  // image_url is optional and not validated
  body('discount_percent').optional().isFloat({ min: 0, max: 100 }).toFloat().withMessage('Discount must be between 0 and 100'),
  body('active').optional().isBoolean().toBoolean(),
  body('create_slots').optional().isBoolean().toBoolean(),
  body('slots').optional().isArray().withMessage('Slots must be an array'),
  // Validate slots if provided
  body('slots.*.start_date').isISO8601().toDate().withMessage('Slot start date must be valid'),
  body('slots.*.start_time').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Start time must be in HH:MM format'),
  body('slots.*.end_time').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('End time must be in HH:MM format'),
  body('slots.*.capacity').optional().isInt({ min: 1 }).toInt().withMessage('Capacity must be at least 1'),
  body('slots.*.price').optional().isFloat({ min: 0 }).toFloat().withMessage('Slot price must be non-negative'),
  body('slots.*.available').optional().isBoolean().toBoolean(),
];

const updateComboValidator = [
  param('id').isInt({ min: 1 }).toInt(),
  body('name').optional().trim().notEmpty().withMessage('Combo name cannot be empty'),
  body('attraction_ids').optional().isArray({ min: 2 }).withMessage('At least 2 attractions are required'),
  body('attraction_ids.*').optional().isInt({ min: 1 }).toInt().withMessage('Each attraction ID must be a positive integer'),
  body('attraction_prices').optional().isObject().withMessage('Attraction prices must be an object'),
  body('attraction_prices.*').optional().isFloat({ min: 0 }).toFloat().withMessage('All attraction prices must be non-negative'),
  body('total_price').optional().isFloat({ min: 0 }).toFloat().withMessage('Total price must be non-negative'),
  // image_url is optional and not validated
  body('discount_percent').optional().isFloat({ min: 0, max: 100 }).toFloat().withMessage('Discount must be between 0 and 100'),
  body('active').optional().isBoolean().toBoolean(),
  body('create_slots').optional().isBoolean().toBoolean(),
];

// Legacy validators for backward compatibility
const createComboLegacyValidator = [
  body('attraction_1_id').isInt({ min: 1 }).toInt(),
  body('attraction_2_id').isInt({ min: 1 }).toInt().custom((v, { req }) => {
    if (Number(v) === Number(req.body.attraction_1_id)) throw new Error('attraction_2_id must differ from attraction_1_id');
    return true;
  }),
  body('combo_price').isFloat({ min: 0 }).toFloat(),
  body('discount_percent').optional().isFloat({ min: 0, max: 100 }).toFloat(),
  body('active').optional().isBoolean().toBoolean(),
];

const updateComboLegacyValidator = [
  param('id').isInt({ min: 1 }).toInt(),
  body('attraction_1_id').optional().isInt({ min: 1 }).toInt(),
  body('attraction_2_id')
    .optional()
    .isInt({ min: 1 })
    .toInt()
    .custom((v, { req }) => {
      const a1 = req.body.attraction_1_id;
      if (a1 != null && Number(v) === Number(a1)) throw new Error('attraction_2_id must differ from attraction_1_id');
      return true;
    }),
  body('combo_price').optional().isFloat({ min: 0 }).toFloat(),
  body('discount_percent').optional().isFloat({ min: 0, max: 100 }).toFloat(),
  body('active').optional().isBoolean().toBoolean(),
];

module.exports = {
  createComboValidator,
  updateComboValidator,
  createComboLegacyValidator,
  updateComboLegacyValidator,
};