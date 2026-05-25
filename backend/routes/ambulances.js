const router           = require('express').Router();
const { pool }         = require('../config/db');
const { requireLogin } = require('../middleware/auth');

// GET /api/ambulances
router.get('/', requireLogin, async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT ambulance_id, vehicle_name, ambulance_code, plate_number, status, unavailable_reason FROM ambulances ORDER BY ambulance_code'
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/ambulances/available
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

// POST /api/ambulances
router.post('/', requireLogin, async (req, res) => {
  const { vehicle_name, ambulance_code, plate_number } = req.body || {};
  if (!vehicle_name?.trim() || !ambulance_code?.trim())
    return res.status(400).json({ error: 'Vehicle name and ambulance code are required' });

  try {
    const [result] = await pool.query(
      `INSERT INTO ambulances (vehicle_name, ambulance_code, plate_number, status) VALUES (?, ?, ?, 'Available')`,
      [vehicle_name.trim(), ambulance_code.trim(), plate_number?.trim() || null]
    );
    res.status(201).json({ ambulance_id: result.insertId });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY')
      return res.status(409).json({ error: 'Ambulance code already exists' });
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/ambulances/:id
router.put('/:id', requireLogin, async (req, res) => {
  const id = parseInt(req.params.id);
  const { vehicle_name, ambulance_code, plate_number, status, unavailable_reason } = req.body || {};
  if (!vehicle_name?.trim() || !ambulance_code?.trim())
    return res.status(400).json({ error: 'Vehicle name and ambulance code are required' });

  try {
    const [result] = await pool.query(
      `UPDATE ambulances
       SET vehicle_name = ?, ambulance_code = ?, plate_number = ?, status = ?, unavailable_reason = ?
       WHERE ambulance_id = ?`,
      [
        vehicle_name.trim(),
        ambulance_code.trim(),
        plate_number?.trim() || null,
        status || 'Available',
        status === 'Unavailable' ? (unavailable_reason?.trim() || null) : null,
        id,
      ]
    );
    if (!result.affectedRows) return res.status(404).json({ error: 'Ambulance not found' });
    res.json({ ok: true });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY')
      return res.status(409).json({ error: 'Ambulance code already exists' });
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/ambulances/:id
router.delete('/:id', requireLogin, async (req, res) => {
  const id = parseInt(req.params.id);
  try {
    const [result] = await pool.query(
      'DELETE FROM ambulances WHERE ambulance_id = ?', [id]
    );
    if (!result.affectedRows) return res.status(404).json({ error: 'Ambulance not found' });
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
