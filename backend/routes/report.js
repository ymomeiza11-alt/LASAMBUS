const router           = require('express').Router();
const { pool }         = require('../config/db');
const { requireLogin } = require('../middleware/auth');

// GET /api/report?start=YYYY-MM-DD&end=YYYY-MM-DD
router.get('/', requireLogin, async (req, res) => {
  const { start, end } = req.query;
  const dateFilter = start && end
    ? 'AND c.date_of_incident BETWEEN ? AND ?'
    : '';
  const dateVals = start && end ? [start, end] : [];

  try {
    const [[stats]] = await pool.query(
      `SELECT
         COUNT(*) AS totalCases,
         SUM(case_status = 'Complete')  AS completed,
         SUM(case_status = 'Cancelled') AS cancelled,
         AVG(transit_time_mins)         AS avgTransit
       FROM cases c WHERE 1=1 ${dateFilter}`,
      dateVals
    );

    const [[{ totalPatients }]] = await pool.query(
      `SELECT COUNT(*) AS totalPatients
       FROM patient_info p
       JOIN cases c ON c.case_id = p.case_id
       WHERE 1=1 ${dateFilter}`,
      dateVals
    );

    // Avg monthly = total / number of distinct months in range
    const [[{ monthCount }]] = await pool.query(
      `SELECT COUNT(DISTINCT DATE_FORMAT(date_of_incident, '%Y-%m')) AS monthCount
       FROM cases WHERE date_of_incident IS NOT NULL ${dateFilter.replace('c.', '')}`,
      dateVals
    );

    const totalCases  = parseInt(stats.totalCases)  || 0;
    const completed   = parseInt(stats.completed)   || 0;
    const cancelled   = parseInt(stats.cancelled)   || 0;
    const successRate = totalCases > 0 ? Math.round((completed / totalCases) * 100) : 0;
    const avgMonthly  = monthCount > 0 ? (totalCases / monthCount).toFixed(1) : '0';
    const avgTransitMins = stats.avgTransit != null ? Math.round(stats.avgTransit) : null;

    // Format as MM:SS
    const formatMins = m => {
      if (m == null) return '—';
      const h = Math.floor(m / 60);
      const min = m % 60;
      return h > 0 ? `${h}h ${min}m` : `${min} min`;
    };

    res.json({
      totalCases, completed, cancelled, successRate,
      avgMonthly, totalPatients,
      avgTransit: formatMins(avgTransitMins),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/report/top5?by=incident_type|lga|severity&start=&end=
router.get('/top5', requireLogin, async (req, res) => {
  const by    = req.query.by || 'incident_type';
  const { start, end } = req.query;
  const dateFilter = start && end ? 'AND date_of_incident BETWEEN ? AND ?' : '';
  const dateVals   = start && end ? [start, end] : [];

  const colMap = {
    incident_type: 'incident_type',
    lga:           'lga_lcda',
    severity:      'incident_severity',
  };
  const col = colMap[by] || 'incident_type';

  try {
    const [rows] = await pool.query(
      `SELECT ${col} AS label, COUNT(*) AS count
       FROM cases WHERE ${col} IS NOT NULL ${dateFilter}
       GROUP BY ${col} ORDER BY count DESC LIMIT 5`,
      dateVals
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
