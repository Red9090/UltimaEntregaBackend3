const asyncHandler = require('./async');

module.exports = (model, populate) => asyncHandler(async (req, res, next) => {
  let reqQuery = { ...req.query };
  // Remove fields that shouldn't be used in query
  const removeFields = ['select', 'sort', 'page', 'limit'];
  removeFields.forEach(param => delete reqQuery[param]);
  // Create query string
  let queryStr = JSON.stringify(reqQuery);
  // Create operators ($gt, $gte, etc)
  queryStr = queryStr.replace(/\b(gt|gte|lt|lte|in)\b/g, match => `$${match}`);
  // Find resources
  let query = JSON.parse(queryStr);
  // Executing query
  let queryObj = model.find(query);
  // Population
  if (populate) {
    queryObj = queryObj.populate(populate);
  }
  // Execute query
  const results = await queryObj;
  res.advancedResults = {
    success: true,
    count: results.length,
    data: results
  };
  next();
});