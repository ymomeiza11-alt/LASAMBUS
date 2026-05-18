const router           = require('express').Router();
const ExcelJS          = require('exceljs');
const { pool }         = require('../config/db');
const { requireLogin } = require('../middleware/auth');

function buildQuery(range, from, to) {
  if (range === 'full') {
    return { sql: 'SELECT * FROM cases ORDER BY case_id DESC', values: [] };
  }
  if (range === 'custom') {
    const f = Math.max(1, parseInt(from) || 1);
    const t = Math.max(f, parseInt(to)   || f);
    return {
      sql:    'SELECT * FROM cases ORDER BY case_id DESC LIMIT ? OFFSET ?',
      values: [t - f + 1, f - 1],
    };
  }
  const limit = parseInt(range) || 50;
  return {
    sql:    'SELECT * FROM cases ORDER BY case_id DESC LIMIT ?',
    values: [limit],
  };
}

// GET /api/export?range=50&from=1&to=100&format=csv|excel
router.get('/', requireLogin, async (req, res) => {
  const { range = '50', from = '1', to, format = 'csv' } = req.query;
  const { sql, values } = buildQuery(range, from, to);

  try {
    const [rows] = await pool.query(sql, values);

    if (format === 'excel') {
      const wb    = new ExcelJS.Workbook();
      const ws    = wb.addWorksheet('Cases');
      const cols  = [
        'case_id','date_of_incident','time_of_incident','notified_by','lga_lcda',
        'incident_type','incident_severity','incident_location','incident_description',
        'dispatch_date','dispatch_time','arrival_date','arrival_time',
        'situation_on_arrival','response_time_mins','transit_time_mins','case_status',
      ];
      ws.columns = cols.map(k => ({ header: k, key: k, width: 22 }));
      ws.getRow(1).font = { bold: true };
      rows.forEach(r => ws.addRow(cols.reduce((o, k) => { o[k] = r[k] ?? ''; return o; }, {})));

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename="lasambus-cases.xlsx"');
      await wb.xlsx.write(res);
      res.end();
    } else {
      const headers = [
        'case_id','date_of_incident','time_of_incident','notified_by','lga_lcda',
        'incident_type','incident_severity','incident_location','incident_description',
        'dispatch_date','dispatch_time','arrival_date','arrival_time',
        'situation_on_arrival','response_time_mins','transit_time_mins','case_status',
      ];
      const escape = v => {
        if (v == null) return '';
        const s = String(v);
        return s.includes(',') || s.includes('"') || s.includes('\n')
          ? `"${s.replace(/"/g, '""')}"`
          : s;
      };
      const csv = [
        headers.join(','),
        ...rows.map(r => headers.map(h => escape(r[h])).join(',')),
      ].join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="lasambus-cases.csv"');
      res.send(csv);
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
