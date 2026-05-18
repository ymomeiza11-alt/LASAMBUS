const router           = require('express').Router();
const { pool }         = require('../config/db');
const { requireLogin } = require('../middleware/auth');

// GET /api/dashboard
router.get('/', requireLogin, async (req, res) => {
  try {
    const [[{ casesMonth }]] = await pool.query(`
      SELECT COUNT(*) AS casesMonth FROM cases
      WHERE MONTH(date_of_incident) = MONTH(CURDATE())
        AND YEAR(date_of_incident)  = YEAR(CURDATE())
    `);

    const [[{ completed }]] = await pool.query(`
      SELECT COUNT(*) AS completed FROM cases
      WHERE case_status = 'Complete'
        AND MONTH(date_of_incident) = MONTH(CURDATE())
        AND YEAR(date_of_incident)  = YEAR(CURDATE())
    `);

    const successRate = casesMonth > 0
      ? Math.round((completed / casesMonth) * 100)
      : 0;

    const [recentCases] = await pool.query(`
      SELECT case_id, date_of_incident, incident_description, incident_location,
             situation_on_arrival, case_status
      FROM cases
      ORDER BY case_id DESC
      LIMIT 15
    `);

    res.json({ casesMonth, completed, successRate, recentCases });
  } catch (err) {
    console.error('Dashboard error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
