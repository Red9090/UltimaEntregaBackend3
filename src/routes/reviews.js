const express = require('express');
const router = express.Router();

// Placeholder for review routes
router.route('/').get((req, res) => {
  res.status(200).json({ success: true, data: [] });
});

module.exports = router;