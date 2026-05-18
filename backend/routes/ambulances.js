const router           = require('express').Router();
const { pool }         = require('../config/db');
const { requireLogin } = require('../middleware/auth');

// GET /api/ambulances — list all ambulances (read-only for now)
router.get('/', requireLogin, async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT ambulance_id, vehicle_name, ambulance_code, status FROM ambulances ORDER BY ambulance_code'
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/ambulances/available — only Available ambulances (for dispatch dropdown)
router.get('/available', requireLogin, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT ambulance_id, vehicle_name, ambulance_code
       FROM ambulances WHERE status = 'Available' ORDER BY ambulance_code`
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
