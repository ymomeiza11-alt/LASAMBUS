const router              = require('express').Router();
const { pool }            = require('../config/db');
const { requireLogin }    = require('../middleware/auth');
const { notifyMany }      = require('../utils/notify');

// ── Helpers ───────────────────────────────────────────
function minutesBetween(date1, time1, date2, time2) {
  if (!date1 || !time1 || !date2 || !time2) return null;
  const d1 = new Date(`${date1}T${time1}`);
  const d2 = new Date(`${date2}T${time2}`);
  const diff = Math.round((d2 - d1) / 60000);
  return diff < 0 ? 0 : diff;
}

function buildWhere(params) {
  const conds  = ['1=1'];
  const values = [];

  if (params.search && /^\d+$/.test(params.search.trim())) {
    conds.push('c.case_id = ?');
    values.push(parseInt(params.search));
  }
  if (params.date) {
    conds.push('c.date_of_incident = ?');
    values.push(params.date);
  }
  if (params.status) {
    conds.push('c.case_status = ?');
    values.push(params.status);
  }
  if (params.lga) {
    const lgas = Array.isArray(params.lga) ? params.lga : [params.lga];
    if (lgas.length) {
      conds.push(`c.lga_lcda IN (${lgas.map(() => '?').join(',')})`);
      values.push(...lgas);
    }
  }

  return { where: conds.join(' AND '), values };
}

// ── Cases list ────────────────────────────────────────
// GET /api/cases
router.get('/', requireLogin, async (req, res) => {
  const page  = Math.max(1, parseInt(req.query.page)  || 1);
  const limit = Math.min(200, parseInt(req.query.limit) || 50);
  const offset = (page - 1) * limit;

  const { where, values } = buildWhere(req.query);

  try {
    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) AS total FROM cases c WHERE ${where}`,
      values
    );

    const [rows] = await pool.query(
      `SELECT c.case_id, c.date_of_incident, c.time_of_incident, c.incident_type,
              c.lga_lcda, c.incident_location, c.dispatch_date, c.dispatch_time, c.case_status
       FROM cases c WHERE ${where} ORDER BY c.case_id DESC LIMIT ? OFFSET ?`,
      [...values, limit, offset]
    );

    res.json({ cases: rows, total, page, limit });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── Create case ───────────────────────────────────────
// POST /api/cases
router.post('/', requireLogin, async (req, res) => {
  const {
    date_of_incident, time_of_incident,
    notified_by, lga_lcda, incident_type, incident_severity,
    incident_location, incident_description,
    dispatch_time, ambulance_id, treatment_centre, paramedic_ids,
  } = req.body;

  const today       = date_of_incident  || new Date().toISOString().slice(0, 10);
  const incidentTime = time_of_incident || new Date().toTimeString().slice(0, 8);
  const dispatchDate = dispatch_time ? today : null;

  const responseMins = dispatch_time
    ? minutesBetween(today, incidentTime, today, dispatch_time)
    : null;

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [result] = await conn.query(
      `INSERT INTO cases
         (date_of_incident, time_of_incident,
          notified_by, lga_lcda, incident_type, incident_severity,
          incident_location, incident_description,
          dispatch_date, dispatch_time, ambulance_id, treatment_centre,
          response_time_mins, case_status, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Active', ?)`,
      [
        today, incidentTime,
        notified_by || null, lga_lcda || null, incident_type || null, incident_severity || null,
        incident_location || null, incident_description || null,
        dispatchDate, dispatch_time || null, ambulance_id || null, treatment_centre || null,
        responseMins,
        req.session.userId,
      ]
    );

    const caseId = result.insertId;

    if (ambulance_id) {
      await conn.query(`UPDATE ambulances SET status = 'Assigned' WHERE ambulance_id = ?`, [ambulance_id]);
    }

    if (Array.isArray(paramedic_ids) && paramedic_ids.length) {
      await conn.query(
        `INSERT IGNORE INTO case_paramedics (case_id, user_id) VALUES ${paramedic_ids.map(() => '(?,?)').join(',')}`,
        paramedic_ids.flatMap(id => [caseId, id])
      );
      await conn.query(
        `UPDATE users SET status = 'Assigned' WHERE user_id IN (${paramedic_ids.map(() => '?').join(',')})`,
        paramedic_ids
      );
    }

    await conn.commit();

    if (Array.isArray(paramedic_ids) && paramedic_ids.length && dispatch_time) {
      try {
        await notifyMany(
          paramedic_ids.map(Number), 'dispatch',
          `Dispatched to Case #${caseId}`,
          `You have been dispatched to Case #${caseId}. Please check the case details and respond immediately.`,
          caseId
        );
      } catch { /* non-critical */ }
    }

    res.status(201).json({ case_id: caseId });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  } finally {
    conn.release();
  }
});

// ── Get one case ──────────────────────────────────────
// GET /api/cases/:id
router.get('/:id', requireLogin, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT c.*,
              u.username AS created_by_username,
              a.vehicle_name, a.ambulance_code
       FROM cases c
       LEFT JOIN users u ON u.user_id = c.created_by
       LEFT JOIN ambulances a ON a.ambulance_id = c.ambulance_id
       WHERE c.case_id = ?`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Case not found' });

    const [paramedics] = await pool.query(
      `SELECT u.user_id, u.username, u.first_name, u.last_name
       FROM case_paramedics cp JOIN users u ON u.user_id = cp.user_id
       WHERE cp.case_id = ?`,
      [req.params.id]
    );

    res.json({ ...rows[0], paramedics });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── Update case overview ──────────────────────────────
// PUT /api/cases/:id
router.put('/:id', requireLogin, async (req, res) => {
  const { incident_type, incident_severity, lga_lcda, incident_location, incident_description, case_status } = req.body;
  try {
    await pool.query(
      `UPDATE cases SET
         incident_type = COALESCE(?, incident_type),
         incident_severity = COALESCE(?, incident_severity),
         lga_lcda = COALESCE(?, lga_lcda),
         incident_location = COALESCE(?, incident_location),
         incident_description = COALESCE(?, incident_description),
         case_status = COALESCE(?, case_status)
       WHERE case_id = ?`,
      [incident_type, incident_severity, lga_lcda, incident_location, incident_description, case_status, req.params.id]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── Dispatch ──────────────────────────────────────────
// POST /api/cases/:id/dispatch
router.post('/:id/dispatch', requireLogin, async (req, res) => {
  const { dispatch_date, dispatch_time, ambulance_id, treatment_centre, paramedic_ids } = req.body;
  if (!dispatch_date || !dispatch_time) return res.status(400).json({ error: 'dispatch_date and dispatch_time required' });

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [[caseRow]] = await conn.query(
      'SELECT date_of_incident, time_of_incident FROM cases WHERE case_id = ?',
      [req.params.id]
    );
    if (!caseRow) { await conn.rollback(); return res.status(404).json({ error: 'Case not found' }); }

    const responseMins = minutesBetween(
      caseRow.date_of_incident, caseRow.time_of_incident,
      dispatch_date, dispatch_time
    );

    await conn.query(
      `UPDATE cases SET dispatch_date = ?, dispatch_time = ?, ambulance_id = ?,
                        treatment_centre = ?, response_time_mins = ? WHERE case_id = ?`,
      [dispatch_date, dispatch_time, ambulance_id || null, treatment_centre || null, responseMins, req.params.id]
    );

    if (ambulance_id) {
      await conn.query(`UPDATE ambulances SET status = 'Assigned' WHERE ambulance_id = ?`, [ambulance_id]);
    }

    // Clear existing paramedic assignments and reset their status
    const [[existingPmed]] = await conn.query(
      'SELECT GROUP_CONCAT(user_id) AS ids FROM case_paramedics WHERE case_id = ?',
      [req.params.id]
    );
    if (existingPmed.ids) {
      const oldIds = existingPmed.ids.split(',');
      await conn.query(
        `UPDATE users SET status = 'Available' WHERE user_id IN (${oldIds.map(() => '?').join(',')})`,
        oldIds
      );
    }
    await conn.query('DELETE FROM case_paramedics WHERE case_id = ?', [req.params.id]);

    if (Array.isArray(paramedic_ids) && paramedic_ids.length) {
      await conn.query(
        `INSERT IGNORE INTO case_paramedics (case_id, user_id) VALUES ${paramedic_ids.map(() => '(?,?)').join(',')}`,
        paramedic_ids.flatMap(id => [req.params.id, id])
      );
      await conn.query(
        `UPDATE users SET status = 'Assigned' WHERE user_id IN (${paramedic_ids.map(() => '?').join(',')})`,
        paramedic_ids
      );
    }

    await conn.commit();

    if (Array.isArray(paramedic_ids) && paramedic_ids.length) {
      const caseId = parseInt(req.params.id);
      try {
        await notifyMany(
          paramedic_ids.map(Number), 'dispatch',
          `Dispatched to Case #${caseId}`,
          `You have been dispatched to Case #${caseId}. Please check the case details and respond immediately.`,
          caseId
        );
      } catch { /* non-critical */ }
    }

    res.json({ ok: true, response_time_mins: responseMins });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  } finally {
    conn.release();
  }
});

// ── Arrival ───────────────────────────────────────────
// POST /api/cases/:id/arrival
router.post('/:id/arrival', requireLogin, async (req, res) => {
  const {
    arrival_date, arrival_time, situation_on_arrival,
    collapsed_buildings, desc_collapsed_buildings,
  } = req.body;
  if (!arrival_date || !arrival_time) return res.status(400).json({ error: 'arrival_date and arrival_time required' });

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [[caseRow]] = await conn.query(
      'SELECT date_of_incident, time_of_incident, dispatch_date, dispatch_time, ambulance_id FROM cases WHERE case_id = ?',
      [req.params.id]
    );
    if (!caseRow) { await conn.rollback(); return res.status(404).json({ error: 'Case not found' }); }

    const transitMins = minutesBetween(
      caseRow.dispatch_date, caseRow.dispatch_time,
      arrival_date, arrival_time
    );

    const responseMins = minutesBetween(
      caseRow.date_of_incident, caseRow.time_of_incident,
      arrival_date, arrival_time
    );

    const collapsedVal = (collapsed_buildings !== undefined && collapsed_buildings !== '' && collapsed_buildings !== null)
      ? parseInt(collapsed_buildings) : null;

    await conn.query(
      `UPDATE cases SET arrival_date = ?, arrival_time = ?, situation_on_arrival = ?,
                        collapsed_buildings = ?, desc_collapsed_buildings = ?,
                        response_time_mins = ?, transit_time_mins = ?,
                        case_status = 'Complete' WHERE case_id = ?`,
      [
        arrival_date, arrival_time, situation_on_arrival || null,
        collapsedVal, desc_collapsed_buildings || null,
        responseMins, transitMins, req.params.id,
      ]
    );

    // Revert ambulance to Available
    if (caseRow.ambulance_id) {
      await conn.query(
        `UPDATE ambulances SET status = 'Available' WHERE ambulance_id = ?`,
        [caseRow.ambulance_id]
      );
    }

    // Revert paramedics to Available
    const [pmeds] = await conn.query(
      'SELECT user_id FROM case_paramedics WHERE case_id = ?',
      [req.params.id]
    );
    if (pmeds.length) {
      const ids = pmeds.map(r => r.user_id);
      await conn.query(
        `UPDATE users SET status = 'Available' WHERE user_id IN (${ids.map(() => '?').join(',')})`,
        ids
      );
    }

    await conn.commit();

    if (pmeds.length) {
      const caseId = parseInt(req.params.id);
      const pmedIds = pmeds.map(r => r.user_id);
      try {
        await notifyMany(
          pmedIds, 'case_complete',
          `Case #${caseId} Completed`,
          `Case #${caseId} has been marked as complete.`,
          caseId
        );
      } catch { /* non-critical */ }
    }

    res.json({ ok: true, transit_time_mins: transitMins });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  } finally {
    conn.release();
  }
});

// ── Patient list ──────────────────────────────────────
// GET /api/cases/:id/patients
router.get('/:id/patients', requireLogin, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT p.patient_id, p.full_name, p.gender, p.home_address,
              p.situation_on_arrival, u.username AS submitted_by_username
       FROM patient_info p
       LEFT JOIN users u ON u.user_id = p.submitted_by
       WHERE p.case_id = ?
       ORDER BY p.patient_id`,
      [req.params.id]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/cases/:id/patients
router.post('/:id/patients', requireLogin, async (req, res) => {
  const {
    full_name, age, gender, home_address, state_of_origin, lga, phone_number, occupation,
    respiratory_rate, temperature, condition_on_arrival, spo2,
    gastrointestinal, known_medical_history, cancer_diagnosis, renal_urological,
    level_of_consciousness, airway, breathing, circulation,
    airway_management, airway_additional, breathing_assistance, breathing_additional, cardiac_care,
    hospital_name, transport_departure_time, transport_arrival_time, outcome_at_hospital, hospital_date, hospital_time,
    hcp_designation, hcp_name, law_enforcement, patient_belongings, witnesses,
    situation_on_arrival,
  } = req.body;

  try {
    const n = v => (v === '' || v === undefined ? null : v);
    const [result] = await pool.query(
      `INSERT INTO patient_info
         (case_id, full_name, age, gender, home_address, state_of_origin, lga, phone_number, occupation,
          respiratory_rate, temperature, condition_on_arrival, spo2,
          gastrointestinal, known_medical_history, cancer_diagnosis, renal_urological,
          level_of_consciousness, airway, breathing, circulation,
          airway_management, airway_additional, breathing_assistance, breathing_additional, cardiac_care,
          hospital_name, transport_departure_time, transport_arrival_time, outcome_at_hospital, hospital_date, hospital_time,
          hcp_designation, hcp_name, law_enforcement, patient_belongings, witnesses,
          situation_on_arrival, submitted_by)
       VALUES (${Array(39).fill('?').join(',')})`,
      [
        req.params.id, n(full_name), n(age), n(gender), n(home_address), n(state_of_origin), n(lga), n(phone_number), n(occupation),
        n(respiratory_rate), n(temperature), n(condition_on_arrival), n(spo2),
        n(gastrointestinal), n(known_medical_history), n(cancer_diagnosis), n(renal_urological),
        n(level_of_consciousness), n(airway), n(breathing), n(circulation),
        n(airway_management), n(airway_additional), n(breathing_assistance), n(breathing_additional), n(cardiac_care),
        n(hospital_name), n(transport_departure_time), n(transport_arrival_time), n(outcome_at_hospital), n(hospital_date), n(hospital_time),
        n(hcp_designation), n(hcp_name), n(law_enforcement), n(patient_belongings), n(witnesses),
        n(situation_on_arrival), req.session.userId,
      ]
    );
    res.status(201).json({ patient_id: result.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/cases/:id/patients/:pid
router.get('/:id/patients/:pid', requireLogin, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT p.*, u.username AS submitted_by_username
       FROM patient_info p
       LEFT JOIN users u ON u.user_id = p.submitted_by
       WHERE p.patient_id = ? AND p.case_id = ?`,
      [req.params.pid, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Patient not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/cases/:id/patients/:pid
router.put('/:id/patients/:pid', requireLogin, async (req, res) => {
  const {
    full_name, age, gender, home_address, state_of_origin, lga, phone_number, occupation,
    respiratory_rate, temperature, condition_on_arrival, spo2,
    gastrointestinal, known_medical_history, cancer_diagnosis, renal_urological,
    level_of_consciousness, airway, breathing, circulation,
    airway_management, airway_additional, breathing_assistance, breathing_additional, cardiac_care,
    hospital_name, transport_departure_time, transport_arrival_time, outcome_at_hospital, hospital_date, hospital_time,
    hcp_designation, hcp_name, law_enforcement, patient_belongings, witnesses,
    situation_on_arrival,
  } = req.body;

  try {
    const n = v => (v === '' || v === undefined ? null : v);
    const [result] = await pool.query(
      `UPDATE patient_info SET
         full_name = ?, age = ?, gender = ?, home_address = ?, state_of_origin = ?, lga = ?,
         phone_number = ?, occupation = ?,
         respiratory_rate = ?, temperature = ?, condition_on_arrival = ?, spo2 = ?,
         gastrointestinal = ?, known_medical_history = ?, cancer_diagnosis = ?, renal_urological = ?,
         level_of_consciousness = ?, airway = ?, breathing = ?, circulation = ?,
         airway_management = ?, airway_additional = ?, breathing_assistance = ?, breathing_additional = ?,
         cardiac_care = ?,
         hospital_name = ?, transport_departure_time = ?, transport_arrival_time = ?,
         outcome_at_hospital = ?, hospital_date = ?, hospital_time = ?,
         hcp_designation = ?, hcp_name = ?, law_enforcement = ?, patient_belongings = ?, witnesses = ?,
         situation_on_arrival = ?
       WHERE patient_id = ? AND case_id = ?`,
      [
        n(full_name), n(age), n(gender), n(home_address), n(state_of_origin), n(lga),
        n(phone_number), n(occupation),
        n(respiratory_rate), n(temperature), n(condition_on_arrival), n(spo2),
        n(gastrointestinal), n(known_medical_history), n(cancer_diagnosis), n(renal_urological),
        n(level_of_consciousness), n(airway), n(breathing), n(circulation),
        n(airway_management), n(airway_additional), n(breathing_assistance), n(breathing_additional),
        n(cardiac_care),
        n(hospital_name), n(transport_departure_time), n(transport_arrival_time),
        n(outcome_at_hospital), n(hospital_date), n(hospital_time),
        n(hcp_designation), n(hcp_name), n(law_enforcement), n(patient_belongings), n(witnesses),
        n(situation_on_arrival),
        req.params.pid, req.params.id,
      ]
    );
    if (!result.affectedRows) return res.status(404).json({ error: 'Patient not found' });
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
