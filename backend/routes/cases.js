const router              = require('express').Router();
const path                = require('path');
const { pool }            = require('../config/db');
const { requireLogin, requireRole } = require('../middleware/auth');
const { notifyMany }      = require('../utils/notify');
const { makeUploader, UPLOADS_ROOT } = require('../utils/upload');
const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, BorderStyle } = require('docx');

const photoUpload = makeUploader(req => path.join(UPLOADS_ROOT, 'cases', req.params.id));

// ── Helpers ───────────────────────────────────────────
function minutesBetween(date1, time1, date2, time2) {
  if (!date1 || !time1 || !date2 || !time2) return null;
  const d1 = new Date(`${date1}T${time1}`);
  const d2 = new Date(`${date2}T${time2}`);
  const diff = Math.round((d2 - d1) / 60000);
  return diff < 0 ? 0 : diff;
}

// Frees every ambulance/paramedic assigned to a case (used when a case
// ends, whichever way it ends). Returns the freed paramedic ids so callers
// can notify them.
async function freeCaseResources(conn, caseId) {
  const [ambs] = await conn.query(
    'SELECT ambulance_id FROM case_ambulances WHERE case_id = ?', [caseId]
  );
  if (ambs.length) {
    const ids = ambs.map(r => r.ambulance_id);
    await conn.query(
      `UPDATE ambulances SET status = 'Available' WHERE ambulance_id IN (${ids.map(() => '?').join(',')})`,
      ids
    );
  }

  const [pmeds] = await conn.query('SELECT user_id FROM case_paramedics WHERE case_id = ?', [caseId]);
  if (pmeds.length) {
    const ids = pmeds.map(r => r.user_id);
    await conn.query(
      `UPDATE users SET status = 'Available' WHERE user_id IN (${ids.map(() => '?').join(',')})`,
      ids
    );
  }
  return pmeds;
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

// ── Create case (Admin or Dispatcher only) ────────────
// POST /api/cases
router.post('/', requireLogin, requireRole('Admin', 'Dispatcher'), async (req, res) => {
  const {
    date_of_incident, time_of_incident,
    notified_by, lga_lcda, incident_type, incident_severity,
    incident_location, incident_description, dispatcher_notes,
    dispatch_time, ambulance_ids, treatment_centre, team_lead_id, paramedic_ids,
  } = req.body;

  const padTime = (t) => {
    if (!t) return null;
    const s = t.trim();
    return s.length === 5 ? s + ':00' : s;
  };

  const today          = date_of_incident  || new Date().toISOString().slice(0, 10);
  const incidentTime   = padTime(time_of_incident) || new Date().toTimeString().slice(0, 8);
  const dispatchDate   = dispatch_time ? today : null;
  const paddedDispatch = padTime(dispatch_time);

  const responseMins = paddedDispatch
    ? minutesBetween(today, incidentTime, today, paddedDispatch)
    : null;

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [result] = await conn.query(
      `INSERT INTO cases
         (date_of_incident, time_of_incident,
          notified_by, lga_lcda, incident_type, incident_severity,
          incident_location, incident_description, dispatcher_notes,
          dispatch_date, dispatch_time, treatment_centre, team_lead_id,
          response_time_mins, case_status, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Active', ?)`,
      [
        today, incidentTime,
        notified_by || null, lga_lcda || null, incident_type || null, incident_severity || null,
        incident_location || null, incident_description || null, dispatcher_notes || null,
        dispatchDate, paddedDispatch, treatment_centre || null, team_lead_id || null,
        responseMins,
        req.session.userId || null,
      ]
    );

    const caseId = result.insertId;

    if (Array.isArray(ambulance_ids) && ambulance_ids.length) {
      await conn.query(
        `INSERT IGNORE INTO case_ambulances (case_id, ambulance_id) VALUES ${ambulance_ids.map(() => '(?,?)').join(',')}`,
        ambulance_ids.flatMap(id => [caseId, id])
      );
      await conn.query(
        `UPDATE ambulances SET status = 'Assigned' WHERE ambulance_id IN (${ambulance_ids.map(() => '?').join(',')})`,
        ambulance_ids
      );
    }

    if (Array.isArray(paramedic_ids) && paramedic_ids.length) {
      const placeholders = paramedic_ids.map(() => '(?,?)').join(',');
      await conn.query(
        `INSERT IGNORE INTO case_paramedics (case_id, user_id) VALUES ${placeholders}`,
        paramedic_ids.flatMap(id => [caseId, id])
      );
      await conn.query(
        `UPDATE users SET status = 'Assigned' WHERE user_id IN (${paramedic_ids.map(() => '?').join(',')})`,
        paramedic_ids
      );
    }

    await conn.commit();

    if (Array.isArray(paramedic_ids) && paramedic_ids.length && paddedDispatch) {
      try {
        await notifyMany(
          paramedic_ids.map(Number), 'dispatch',
          `Dispatched to Case #${caseId}`,
          `You have been dispatched to Case #${caseId}. Please check the case details and respond immediately.`,
          caseId
        );
      } catch (notifErr) {
        console.warn('Notification failed (non-critical):', notifErr.message);
      }
    }

    res.status(201).json({ case_id: caseId });

  } catch (err) {
    await conn.rollback();
    console.error('Case creation error:', err.message);
    res.status(500).json({ error: err.message });
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
              t.username AS team_lead_username, t.first_name AS team_lead_first_name, t.last_name AS team_lead_last_name
       FROM cases c
       LEFT JOIN users u ON u.user_id = c.created_by
       LEFT JOIN users t ON t.user_id = c.team_lead_id
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

    const [ambulances] = await pool.query(
      `SELECT a.ambulance_id, a.vehicle_name, a.ambulance_code
       FROM case_ambulances ca JOIN ambulances a ON a.ambulance_id = ca.ambulance_id
       WHERE ca.case_id = ?`,
      [req.params.id]
    );

    res.json({ ...rows[0], paramedics, ambulances });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── Update case overview (Admin only) ─────────────────
// PUT /api/cases/:id
router.put('/:id', requireLogin, requireRole('Admin'), async (req, res) => {
  const { incident_type, incident_severity, lga_lcda, incident_location, incident_description, case_status } = req.body;
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    await conn.query(
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

    if (case_status === 'Closed') {
      await freeCaseResources(conn, req.params.id);
    }

    await conn.commit();
    res.json({ ok: true });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  } finally {
    conn.release();
  }
});

// ── Dispatch (Admin or Dispatcher) ────────────────────
// POST /api/cases/:id/dispatch
router.post('/:id/dispatch', requireLogin, requireRole('Admin', 'Dispatcher'), async (req, res) => {
  const { dispatch_date, dispatch_time, ambulance_ids, treatment_centre, team_lead_id, paramedic_ids } = req.body;
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
      `UPDATE cases SET dispatch_date = ?, dispatch_time = ?,
                        treatment_centre = ?, team_lead_id = ?, response_time_mins = ? WHERE case_id = ?`,
      [dispatch_date, dispatch_time, treatment_centre || null, team_lead_id || null, responseMins, req.params.id]
    );

    const [[existingAmb]] = await conn.query(
      'SELECT GROUP_CONCAT(ambulance_id) AS ids FROM case_ambulances WHERE case_id = ?',
      [req.params.id]
    );
    if (existingAmb.ids) {
      const oldIds = existingAmb.ids.split(',');
      await conn.query(
        `UPDATE ambulances SET status = 'Available' WHERE ambulance_id IN (${oldIds.map(() => '?').join(',')})`,
        oldIds
      );
    }
    await conn.query('DELETE FROM case_ambulances WHERE case_id = ?', [req.params.id]);

    if (Array.isArray(ambulance_ids) && ambulance_ids.length) {
      await conn.query(
        `INSERT IGNORE INTO case_ambulances (case_id, ambulance_id) VALUES ${ambulance_ids.map(() => '(?,?)').join(',')}`,
        ambulance_ids.flatMap(id => [req.params.id, id])
      );
      await conn.query(
        `UPDATE ambulances SET status = 'Assigned' WHERE ambulance_id IN (${ambulance_ids.map(() => '?').join(',')})`,
        ambulance_ids
      );
    }

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

// ── Arrival (Admin or Ambulance Personnel) ────────────
// POST /api/cases/:id/arrival
router.post('/:id/arrival', requireLogin, requireRole('Admin', 'Ambulance Personnel'), async (req, res) => {
  const {
    arrival_date, arrival_time, situation_on_arrival,
    collapsed_buildings, desc_collapsed_buildings, no_of_patients,
  } = req.body;
  if (!arrival_date || !arrival_time) return res.status(400).json({ error: 'arrival_date and arrival_time required' });

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [[caseRow]] = await conn.query(
      'SELECT date_of_incident, time_of_incident, dispatch_date, dispatch_time FROM cases WHERE case_id = ?',
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

    const numPatients = (no_of_patients !== undefined && no_of_patients !== '' && no_of_patients !== null)
      ? parseInt(no_of_patients) : null;

    await conn.query(
      `UPDATE cases SET arrival_date = ?, arrival_time = ?, situation_on_arrival = ?,
                        collapsed_buildings = ?, desc_collapsed_buildings = ?,
                        no_of_patients = ?,
                        response_time_mins = ?, transit_time_mins = ?
                        WHERE case_id = ?`,
      [
        arrival_date, arrival_time, situation_on_arrival || null,
        collapsedVal, desc_collapsed_buildings || null,
        numPatients,
        responseMins, transitMins, req.params.id,
      ]
    );

    await conn.commit();
    res.json({ ok: true, transit_time_mins: transitMins });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  } finally {
    conn.release();
  }
});

// ── Mark Complete (Admin or Ambulance Personnel) ──────
// POST /api/cases/:id/complete
router.post('/:id/complete', requireLogin, requireRole('Admin', 'Ambulance Personnel'), async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [[caseRow]] = await conn.query(
      'SELECT case_status FROM cases WHERE case_id = ?',
      [req.params.id]
    );
    if (!caseRow) { await conn.rollback(); return res.status(404).json({ error: 'Case not found' }); }
    if (caseRow.case_status === 'Complete') { await conn.rollback(); return res.json({ ok: true }); }

    const [[{ cnt }]] = await conn.query(
      'SELECT COUNT(*) AS cnt FROM patient_info WHERE case_id = ?', [req.params.id]
    );
    if (!cnt) {
      await conn.rollback();
      return res.status(400).json({ error: 'Add at least one patient record before marking this case complete.' });
    }

    await conn.query('UPDATE cases SET case_status = ? WHERE case_id = ?', ['Complete', req.params.id]);

    const pmeds = await freeCaseResources(conn, req.params.id);

    await conn.commit();

    if (pmeds.length) {
      const caseId = parseInt(req.params.id);
      try {
        await notifyMany(
          pmeds.map(r => r.user_id), 'case_complete',
          `Case #${caseId} Completed`,
          `Case #${caseId} has been marked as complete.`,
          caseId
        );
      } catch { /* non-critical */ }
    }

    res.json({ ok: true });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  } finally {
    conn.release();
  }
});

// ── Close Case (Admin or Ambulance Personnel) ─────────
// Shortcut for cases with no victim, skipping the patient-details requirement.
// POST /api/cases/:id/close
router.post('/:id/close', requireLogin, requireRole('Admin', 'Ambulance Personnel'), async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [[caseRow]] = await conn.query(
      'SELECT case_status, situation_on_arrival FROM cases WHERE case_id = ?',
      [req.params.id]
    );
    if (!caseRow) { await conn.rollback(); return res.status(404).json({ error: 'Case not found' }); }
    if (caseRow.case_status === 'Closed') { await conn.rollback(); return res.json({ ok: true }); }
    if (!['Nothing Sighted', 'No Victim'].includes(caseRow.situation_on_arrival)) {
      await conn.rollback();
      return res.status(400).json({ error: 'Only cases with situation "Nothing Sighted" or "No Victim" can be closed without patient details.' });
    }

    await conn.query('UPDATE cases SET case_status = ? WHERE case_id = ?', ['Closed', req.params.id]);

    const pmeds = await freeCaseResources(conn, req.params.id);

    await conn.commit();

    if (pmeds.length) {
      const caseId = parseInt(req.params.id);
      try {
        await notifyMany(
          pmeds.map(r => r.user_id), 'case_complete',
          `Case #${caseId} Closed`,
          `Case #${caseId} has been closed.`,
          caseId
        );
      } catch { /* non-critical */ }
    }

    res.json({ ok: true });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  } finally {
    conn.release();
  }
});

// ── Case export — Word document (Admin only) ──────────
// GET /api/cases/:id/export
router.get('/:id/export', requireLogin, requireRole('Admin'), async (req, res) => {
  try {
    const caseId = req.params.id;

    const [[c]] = await pool.query(
      `SELECT c.*,
              u.username AS created_by_username, u.first_name AS cb_first, u.last_name AS cb_last,
              t.username AS team_lead_username, t.first_name AS team_lead_first, t.last_name AS team_lead_last
       FROM cases c
       LEFT JOIN users u ON u.user_id = c.created_by
       LEFT JOIN users t ON t.user_id = c.team_lead_id
       WHERE c.case_id = ?`,
      [caseId]
    );
    if (!c) return res.status(404).json({ error: 'Case not found' });

    const [paramedics] = await pool.query(
      `SELECT u.username, u.first_name, u.last_name
       FROM case_paramedics cp JOIN users u ON u.user_id = cp.user_id
       WHERE cp.case_id = ?`,
      [caseId]
    );

    const [ambulances] = await pool.query(
      `SELECT a.vehicle_name, a.ambulance_code
       FROM case_ambulances ca JOIN ambulances a ON a.ambulance_id = ca.ambulance_id
       WHERE ca.case_id = ?`,
      [caseId]
    );

    const [patients] = await pool.query(
      `SELECT p.*, u.username AS submitted_by_username
       FROM patient_info p
       LEFT JOIN users u ON u.user_id = p.submitted_by
       WHERE p.case_id = ? ORDER BY p.patient_id`,
      [caseId]
    );

    // ── Helpers ──────────────────────────────────────
    const fmt = v => (v === null || v === undefined || v === '') ? 'Not recorded' : String(v);
    const fmtDate = d => {
      if (!d) return 'Not recorded';
      const s = typeof d === 'string' ? d : d.toISOString().slice(0, 10);
      const [y, m, day] = s.split('-');
      return `${day}/${m}/${y}`;
    };

    const field = (label, value) => new Paragraph({
      children: [
        new TextRun({ text: `${label}:  `, bold: true, size: 22 }),
        new TextRun({ text: fmt(value), size: 22 }),
      ],
      spacing: { after: 120 },
    });

    const section = title => new Paragraph({
      text: title,
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 480, after: 160 },
    });

    const subsection = title => new Paragraph({
      text: title,
      heading: HeadingLevel.HEADING_3,
      spacing: { before: 300, after: 120 },
    });

    const hr = () => new Paragraph({
      border: { bottom: { color: 'CCCCCC', space: 1, style: BorderStyle.SINGLE, size: 4 } },
      spacing: { after: 160 },
      text: '',
    });

    const italic = text => new Paragraph({
      children: [new TextRun({ text, italics: true, color: '888888', size: 22 })],
      spacing: { after: 120 },
    });

    // ── Build content ────────────────────────────────
    const ambulanceStr = ambulances.length
      ? ambulances.map(a => `${a.ambulance_code} — ${a.vehicle_name}`).join(', ') : null;
    const createdByStr = c.created_by_username
      ? `${c.created_by_username} (${c.cb_first} ${c.cb_last})` : null;
    const teamLeadStr = c.team_lead_username
      ? `${c.team_lead_username} (${c.team_lead_first} ${c.team_lead_last})` : null;
    const paramedicsStr = paramedics.length
      ? paramedics.map(p => `${p.username} (${p.first_name} ${p.last_name})`).join(', ') : null;

    const children = [
      // Title block
      new Paragraph({
        children: [new TextRun({ text: 'LASAMBUS — Case Report', bold: true, size: 40 })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 120 },
      }),
      new Paragraph({
        children: [new TextRun({ text: `Case #${c.case_id}`, bold: true, size: 32 })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 120 },
      }),
      new Paragraph({
        children: [new TextRun({
          text: `Generated: ${new Date().toLocaleString('en-GB', { dateStyle: 'long', timeStyle: 'short' })}`,
          size: 20, color: '666666',
        })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 480 },
      }),

      // Case Overview
      section('Case Overview'), hr(),
      field('Case ID', c.case_id),
      field('Date of Incident', fmtDate(c.date_of_incident)),
      field('Time of Incident', c.time_of_incident),
      field('Notified By', c.notified_by),
      field('LGA/LCDA', c.lga_lcda),
      field('Incident Type', c.incident_type),
      field('Incident Severity', c.incident_severity),
      field('Incident Location', c.incident_location),
      field('Incident Description', c.incident_description),
      field('Case Status', c.case_status),
      field('Created By', createdByStr),

      // Dispatch Information
      section('Dispatch Information'), hr(),
      field('Dispatch Date', fmtDate(c.dispatch_date)),
      field('Dispatch Time', c.dispatch_time),
      field('Ambulance', ambulanceStr),
      field('Treatment Centre', c.treatment_centre),
      field('Ambulance Team Lead', teamLeadStr),
      field('Response Time', c.response_time_mins != null ? `${c.response_time_mins} minutes` : null),
      field('Paramedics', paramedicsStr),
      field("Dispatcher's Notes", c.dispatcher_notes),

      // Arrival Information
      section('Arrival Information'), hr(),
      field('Arrival Date', fmtDate(c.arrival_date)),
      field('Arrival Time', c.arrival_time),
      field('Situation on Arrival', c.situation_on_arrival),
      field('Transit Time', c.transit_time_mins != null ? `${c.transit_time_mins} minutes` : null),
      field('No. of Patients', c.no_of_patients),
      field('Description of Situation', c.desc_collapsed_buildings),
    ];

    // Patients
    if (!patients.length) {
      children.push(section('Patient Information'), hr(), italic('No patients recorded for this case.'));
    } else {
      patients.forEach((p, i) => {
        children.push(
          section(`Patient ${i + 1}${p.full_name ? ' — ' + p.full_name : ''}`), hr(),

          subsection('Patient Information'),
          field('Full Name', p.full_name),
          field('Age', p.age),
          field('Gender', p.gender),
          field('Home Address', p.home_address),
          field('State of Origin', p.state_of_origin),
          field('LGA', p.lga),
          field('Phone Number', p.phone_number),
          field('Occupation', p.occupation),
          field('Situation on Arrival', p.situation_on_arrival),
          field('Submitted By', p.submitted_by_username),

          subsection('General Assessment'),
          field('Respiratory Rate', p.respiratory_rate),
          field('Temperature (°C)', p.temperature),
          field('Condition on Arrival', p.condition_on_arrival),
          field('SpO2', p.spo2),

          subsection('Patient Vitals'),
          field('B/P (Blood Pressure)', p.blood_pressure),
          field('FBS (Fasting Blood Sugar)', p.fbs),
          field('RBS (Random Blood Sugar)', p.rbs),
          field('GCS (Glasgow Coma Scale)', p.gcs),
          field('Medications', p.medications),

          subsection('Primary Assessment'),
          field('Level of Consciousness', p.level_of_consciousness),
          field('Airway', p.airway),
          field('Breathing', p.breathing),
          field('Circulation', p.circulation),

          subsection('Treatment and Interventions'),
          field('Airway Management', p.airway_management),
          field('Additional Information (Airway)', p.airway_additional),
          field('Breathing Assistance', p.breathing_assistance),
          field('Additional Information (Breathing)', p.breathing_additional),
          field('Cardiac Care', p.cardiac_care),

          subsection('Destination Hospital'),
          field('Hospital Name', p.hospital_name),
          field('Transport Departure Time', p.transport_departure_time),
          field('Transport Arrival Time', p.transport_arrival_time),
          field('Outcome at Destination Hospital', p.outcome_at_hospital),
          field('Hospital Date', fmtDate(p.hospital_date)),
          field('Hospital Time', p.hospital_time),

          subsection('Additional Information'),
          field('Designation of Health Care Provider', p.hcp_designation),
          field('Name of Health Care Provider', p.hcp_name),
          field('Law Enforcement Involved', p.law_enforcement),
          field("Patient's Belongings", p.patient_belongings),
          field('Witnesses', p.witnesses),
        );
      });
    }

    const doc = new Document({ sections: [{ children }] });
    const buffer = await Packer.toBuffer(doc);

    res.setHeader('Content-Disposition', `attachment; filename="Case-${caseId}-Report.docx"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.send(buffer);

  } catch (err) {
    console.error('Export error:', err);
    res.status(500).json({ error: 'Export failed' });
  }
});

// ── Case Photos (Admin or Ambulance Personnel) ────────
// POST /api/cases/:id/photos
router.post('/:id/photos', requireLogin, requireRole('Admin', 'Ambulance Personnel'), (req, res, next) => {
  photoUpload.array('photos', 10)(req, res, err => {
    if (err) return res.status(400).json({ error: err.message });
    next();
  });
}, async (req, res) => {
  try {
    const files = req.files || [];
    if (!files.length) return res.status(400).json({ error: 'No files uploaded' });

    const values = files.map(f => [
      req.params.id, `cases/${req.params.id}/${f.filename}`, f.originalname, req.session.userId || null,
    ]);
    await pool.query(
      `INSERT INTO case_photos (case_id, file_path, original_filename, uploaded_by) VALUES ${values.map(() => '(?,?,?,?)').join(',')}`,
      values.flat()
    );
    res.status(201).json({ ok: true, count: files.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/cases/:id/photos
router.get('/:id/photos', requireLogin, requireRole('Admin', 'Ambulance Personnel'), async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT p.photo_id, p.original_filename, p.created_at, u.username AS uploaded_by_username
       FROM case_photos p LEFT JOIN users u ON u.user_id = p.uploaded_by
       WHERE p.case_id = ? ORDER BY p.photo_id DESC`,
      [req.params.id]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/cases/:id/photos/:photoId/file
router.get('/:id/photos/:photoId/file', requireLogin, requireRole('Admin', 'Ambulance Personnel'), async (req, res) => {
  try {
    const [[row]] = await pool.query(
      'SELECT file_path FROM case_photos WHERE photo_id = ? AND case_id = ?',
      [req.params.photoId, req.params.id]
    );
    if (!row) return res.status(404).json({ error: 'Photo not found' });
    res.sendFile(path.join(UPLOADS_ROOT, row.file_path));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
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

// POST /api/cases/:id/patients (Admin or Ambulance Personnel)
router.post('/:id/patients', requireLogin, requireRole('Admin', 'Ambulance Personnel'), async (req, res) => {
  const {
    full_name, age, gender, home_address, state_of_origin, lga, phone_number, occupation,
    respiratory_rate, temperature, condition_on_arrival, spo2,
    blood_pressure, fbs, rbs, gcs, medications,
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
          blood_pressure, fbs, rbs, gcs, medications,
          level_of_consciousness, airway, breathing, circulation,
          airway_management, airway_additional, breathing_assistance, breathing_additional, cardiac_care,
          hospital_name, transport_departure_time, transport_arrival_time, outcome_at_hospital, hospital_date, hospital_time,
          hcp_designation, hcp_name, law_enforcement, patient_belongings, witnesses,
          situation_on_arrival, submitted_by)
       VALUES (${Array(40).fill('?').join(',')})`,
      [
        req.params.id, n(full_name), n(age), n(gender), n(home_address), n(state_of_origin), n(lga), n(phone_number), n(occupation),
        n(respiratory_rate), n(temperature), n(condition_on_arrival), n(spo2),
        n(blood_pressure), n(fbs), n(rbs), n(gcs), n(medications),
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

// PUT /api/cases/:id/patients/:pid (Admin or Ambulance Personnel)
router.put('/:id/patients/:pid', requireLogin, requireRole('Admin', 'Ambulance Personnel'), async (req, res) => {
  const {
    full_name, age, gender, home_address, state_of_origin, lga, phone_number, occupation,
    respiratory_rate, temperature, condition_on_arrival, spo2,
    blood_pressure, fbs, rbs, gcs, medications,
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
         blood_pressure = ?, fbs = ?, rbs = ?, gcs = ?, medications = ?,
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
        n(blood_pressure), n(fbs), n(rbs), n(gcs), n(medications),
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
