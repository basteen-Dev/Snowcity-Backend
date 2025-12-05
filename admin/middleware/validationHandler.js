/**
 * Validation Error Handler Middleware
 * Handles validation errors from express-validator
 */

const handleValidationErrors = (req, res, next) => {
  // Import validationResult dynamically to avoid circular dependencies
  const { validationResult } = require('express-validator');
  
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(error => ({
      field: error.path || error.param,
      message: error.msg,
      value: error.value,
      location: error.location
    }));
    
    // Log detailed errors for debugging
    console.error('Validation Errors:', JSON.stringify(errorMessages, null, 2));
    
    return res.status(400).json({
      error: 'Validation failed',
      message: 'Invalid input data',
      details: errorMessages,
      summary: `${errorMessages.length} validation error(s) found`
    });
  }
  
  next();
};

module.exports = {
  handleValidationErrors
};
