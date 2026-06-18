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

  const MEDICAL_TYPES = [
    'Trauma',
    'Medical Emergencies',
    'Obstetric/Gynecological',
    'Pediatrics',
    'Behavioural Health',
    'Elderly Care',
  ];
  const medPlaceholders = MEDICAL_TYPES.map(() => '?').join(',');

  try {
    const [[stats]] = await pool.query(
      `SELECT
         COUNT(*)                                                   AS totalCases,
         SUM(case_status = 'Complete')                             AS completed,
         SUM(case_status = 'Cancelled')                           AS cancelled,
         AVG(CASE WHEN arrival_time IS NOT NULL
               THEN response_time_mins END)                        AS avgResponse,
         SUM(incident_type = 'Road Traffic Accident')             AS totalRTAs,
         SUM(incident_type IN (${medPlaceholders}))               AS totalMedical,
         SUM(incident_type = 'Fire Incident')                     AS totalFire
       FROM cases c WHERE 1=1 ${dateFilter}`,
      [...MEDICAL_TYPES, ...dateVals]
    );

    // Isolated query — safe to fail if migration hasn't been run yet
    let totalCollapsed = 0;
    try {
      const [[colRow]] = await pool.query(
        `SELECT COALESCE(SUM(collapsed_buildings), 0) AS totalCollapsed
         FROM cases c WHERE 1=1 ${dateFilter}`,
        dateVals
      );
      totalCollapsed = parseInt(colRow.totalCollapsed) || 0;
    } catch { /* column not yet migrated — default to 0 */ }

    const [[{ totalPatients }]] = await pool.query(
      `SELECT COUNT(*) AS totalPatients
       FROM patient_info p
       JOIN cases c ON c.case_id = p.case_id
       WHERE 1=1 ${dateFilter}`,
      dateVals
    );

    const [[{ monthCount }]] = await pool.query(
      `SELECT COUNT(DISTINCT DATE_FORMAT(date_of_incident, '%Y-%m')) AS monthCount
       FROM cases WHERE date_of_incident IS NOT NULL ${dateFilter.replace('c.', '')}`,
      dateVals
    );

    const [[ambulanceStats]] = await pool.query(
      `SELECT COUNT(*) AS total, SUM(status = 'Available') AS available FROM ambulances`
    );

    const totalCases  = parseInt(stats.totalCases)  || 0;
    const completed   = parseInt(stats.completed)   || 0;
    const cancelled   = parseInt(stats.cancelled)   || 0;
    const successRate = totalCases > 0 ? Math.round((completed / totalCases) * 100) : 0;
    const avgMonthly  = monthCount > 0 ? (totalCases / monthCount).toFixed(1) : '0';

    const avgResponseMins = stats.avgResponse != null ? Math.round(stats.avgResponse) : null;
    const formatMins = m => {
      if (m == null) return '—';
      const h = Math.floor(m / 60);
      const min = m % 60;
      return h > 0 ? `${h}h ${min}m` : `${min} min`;
    };

    const totalAmbs    = parseInt(ambulanceStats.total)     || 0;
    const availableAmbs = parseInt(ambulanceStats.available) || 0;
    const ambuAvailPct = totalAmbs > 0 ? Math.round((availableAmbs / totalAmbs) * 100) : 0;

    res.json({
      totalCases,
      completed,
      cancelled,
      successRate,
      avgMonthly,
      totalPatients,
      avgResponse: formatMins(avgResponseMins),
      totalRTAs:      parseInt(stats.totalRTAs)   || 0,
      totalMedical:   parseInt(stats.totalMedical) || 0,
      totalFire:      parseInt(stats.totalFire)   || 0,
      totalCollapsed,
      ambuAvail: `${availableAmbs}/${totalAmbs}`,
      ambuAvailPct,
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
