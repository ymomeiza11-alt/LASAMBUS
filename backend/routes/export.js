const router           = require('express').Router();
const ExcelJS          = require('exceljs');
const { pool }         = require('../config/db');
const { requireLogin } = require('../middleware/auth');

const TABLE_CONFIG = {
  cases: {
    sql:     'SELECT * FROM cases',
    columns: [
      'case_id','date_of_incident','time_of_incident','notified_by','lga_lcda',
      'incident_type','incident_severity','incident_location','incident_description',
      'dispatch_date','dispatch_time','arrival_date','arrival_time',
      'situation_on_arrival','response_time_mins','transit_time_mins','case_status',
    ],
    filename: 'lasambus-cases',
  },
  paramedics: {
    sql:     'SELECT user_id, username, title, first_name, last_name, cadre, grade_level, email, is_admin, status FROM users',
    columns: ['user_id','username','title','first_name','last_name','cadre','grade_level','email','is_admin','status'],
    filename: 'lasambus-paramedics',
  },
  patient_info: {
    sql:     'SELECT * FROM patient_info',
    columns: [
      'patient_id','case_id','full_name','age','gender','home_address','state_of_origin',
      'lga','phone_number','occupation','respiratory_rate','temperature',
      'condition_on_arrival','spo2','gastrointestinal','known_medical_history',
      'cancer_diagnosis','renal_urological','level_of_consciousness','airway',
      'breathing','circulation','airway_management','airway_additional',
      'breathing_assistance','breathing_additional','cardiac_care','hospital_name',
      'transport_departure_time','transport_arrival_time','outcome_at_hospital',
      'hospital_date','hospital_time','hcp_designation','hcp_name',
      'law_enforcement','patient_belongings','witnesses','situation_on_arrival',
    ],
    filename: 'lasambus-patients',
  },
};

function buildQuery(baseSql, range, from, to) {
  if (range === 'full') {
    return { sql: `${baseSql} ORDER BY 1 DESC`, values: [] };
  }
  if (range === 'custom') {
    const f = Math.max(1, parseInt(from) || 1);
    const t = Math.max(f, parseInt(to) || f);
    return { sql: `${baseSql} ORDER BY 1 DESC LIMIT ? OFFSET ?`, values: [t - f + 1, f - 1] };
  }
  const limit = parseInt(range) || 50;
  return { sql: `${baseSql} ORDER BY 1 DESC LIMIT ?`, values: [limit] };
}

// GET /api/export?table=cases&range=50&from=1&to=100&format=csv|excel
router.get('/', requireLogin, async (req, res) => {
  const { table = 'cases', range = '50', from = '1', to, format = 'csv' } = req.query;

  const config = TABLE_CONFIG[table];
  if (!config) return res.status(400).json({ error: 'Invalid table' });

  const { sql, values } = buildQuery(config.sql, range, from, to);

  try {
    const [rows] = await pool.query(sql, values);
    const cols   = config.columns;

    if (format === 'excel') {
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet(table);
      ws.columns = cols.map(k => ({ header: k, key: k, width: 22 }));
      ws.getRow(1).font = { bold: true };
      rows.forEach(r => ws.addRow(cols.reduce((o, k) => { o[k] = r[k] ?? ''; return o; }, {})));

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${config.filename}.xlsx"`);
      await wb.xlsx.write(res);
      res.end();
    } else {
      const escape = v => {
        if (v == null) return '';
        const s = String(v);
        return s.includes(',') || s.includes('"') || s.includes('\n')
          ? `"${s.replace(/"/g, '""')}"` : s;
      };
      const csv = [
        cols.join(','),
        ...rows.map(r => cols.map(h => escape(r[h])).join(',')),
      ].join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${config.filename}.csv"`);
      res.send(csv);
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
