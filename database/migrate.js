/**
 * LASAMBUS — Legacy Data Migration
 * Reads find-cases.csv and imports all records into the lasambus_db database.
 * Run once after schema.sql has been executed.
 *
 * Usage:
 *   node database/migrate.js
 */

const fs      = require('fs');
const path    = require('path');
const { parse } = require('csv-parse');
const mysql   = require('mysql2/promise');
require('dotenv').config({ path: path.join(__dirname, '.env') });

// ── Normalisation maps ────────────────────────────────────────────────────────

const LGA_MAP = {
  'Oshodi/Isolo':    'Oshodi-Isolo',
  'Ifako/Ijaiye':    'Ifako-Ijaiye',
  'Ajeromi Ifelodun':'Ajeromi-Ifelodun',
  'Shomolu':         'Somolu',
};

const SITUATION_MAP = {
  'live victim/treat&disch':  'Live Victim/Treat and Discharge',
  'live victim/treat & disch':'Live Victim/Treat and Discharge',
  'nothing sighted':          'Nothing Sighted',
  'no victim':                'No Victim',
  'not attended':             'Not Attended',
  'corpse':                   'Corpse',
  'evacuation':               'Evacuation',
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function normaliseLGA(raw) {
  if (!raw) return null;
  const trimmed = raw.trim();
  return LGA_MAP[trimmed] || trimmed || null;
}

function normaliseSituation(raw) {
  if (!raw) return null;
  // Strip non-breaking spaces and collapse whitespace
  const clean = raw.replace(/\xa0/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
  return SITUATION_MAP[clean] || raw.trim() || null;
}

// Convert DD-MM-YYYY → YYYY-MM-DD; pass through YYYY-MM-DD unchanged
function parseDate(raw) {
  if (!raw || !raw.trim()) return null;
  const s = raw.trim();
  const ddmm = s.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (ddmm) return `${ddmm[3]}-${ddmm[2]}-${ddmm[1]}`;
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  return null;
}

// Convert decimal-minute string to integer minutes (round half-up)
function parseMins(raw) {
  if (raw === '' || raw == null) return null;
  const n = parseFloat(raw);
  if (isNaN(n)) return null;
  return Math.round(n);
}

// Empty string → null
function val(raw) {
  if (raw === undefined || raw === null) return null;
  const s = String(raw).trim();
  return s === '' ? null : s;
}

// Normalise gender: accept Male/Female/male/female, anything else → null
function normaliseGender(raw) {
  if (!raw) return null;
  const s = raw.trim().toLowerCase();
  if (s === 'male') return 'Male';
  if (s === 'female') return 'Female';
  return null;
}

// Normalise age: must be a non-negative integer ≤ 120, else null
function normaliseAge(raw) {
  if (!raw) return null;
  const n = parseFloat(raw);
  if (isNaN(n) || n < 0 || n > 120) return null;
  return Math.round(n);
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function run() {
  const conn = await mysql.createConnection({
    host:     process.env.DB_HOST     || 'localhost',
    port:     process.env.DB_PORT     || 3306,
    user:     process.env.DB_USER     || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME     || 'lasambus_db',
  });

  console.log('✓ Connected to database.\n');

  // Read and parse CSV
  const csvPath = path.resolve(__dirname, '../find-cases.csv');
  if (!fs.existsSync(csvPath)) {
    // Fallback: look in Downloads
    const fallback = path.join(
      process.env.HOME || '/Users/yahayamuhammedad-dahuk',
      'Downloads/find-cases.csv'
    );
    if (!fs.existsSync(fallback)) {
      console.error('CSV file not found. Place find-cases.csv in the project root or Downloads folder.');
      process.exit(1);
    }
    csvPath = fallback;
  }

  const records = await new Promise((resolve, reject) => {
    const rows = [];
    fs.createReadStream(csvPath)
      .pipe(parse({ columns: true, skip_empty_lines: true, trim: true, bom: true }))
      .on('data', row => rows.push(row))
      .on('end', () => resolve(rows))
      .on('error', reject);
  });

  console.log(`Parsed ${records.length} records from CSV.\n`);

  let caseCount    = 0;
  let patientCount = 0;
  let skipped      = 0;
  const insertedPatients = new Set(); // prevent duplicate patient rows from duplicate case IDs in CSV

  for (const row of records) {
    const caseId = parseInt(row['Case ID']);
    // Skip missing, non-numeric, or corrupted IDs (valid old IDs are ≤ 33146)
    if (!caseId || isNaN(caseId) || caseId > 33146) { skipped++; continue; }

    const dateOfIncident   = parseDate(val(row['Date of Incident']));
    const timeOfIncident   = val(row['Time of Incident']);
    const notifiedBy       = val(row['Call']);
    const lgaLcda          = normaliseLGA(val(row['LGA/LCDA']));
    const incidentType     = val(row['Incident Type']);
    const incidentLocation = val(row['Location']);
    const dispatchDate     = parseDate(val(row['Dispatch Date']));
    const arrivalDate      = parseDate(val(row['Arrival Date']));
    const arrivalTime      = val(row['Arrival Time']);
    const situationOnArr   = normaliseSituation(val(row['Situation on Arrival']));
    const responseTimeMins = parseMins(val(row['Response Time']));
    const transitTimeMins  = parseMins(val(row['Transit Time']));

    try {
      await conn.execute(
        `INSERT IGNORE INTO cases
           (case_id,
            date_of_incident, time_of_incident,
            notified_by, lga_lcda, incident_type,
            incident_severity, incident_location, incident_description,
            dispatch_date, dispatch_time, ambulance_id,
            arrival_date, arrival_time, situation_on_arrival,
            response_time_mins, transit_time_mins,
            case_status, created_by)
         VALUES
           (?, ?, ?, ?, ?, ?, NULL, ?, NULL, ?, NULL, NULL, ?, ?, ?, ?, ?, 'Complete', NULL)`,
        [
          caseId,
          dateOfIncident, timeOfIncident,
          notifiedBy, lgaLcda, incidentType,
          incidentLocation,
          dispatchDate,
          arrivalDate, arrivalTime, situationOnArr,
          responseTimeMins, transitTimeMins,
        ]
      );
      caseCount++;

      // Insert patient record if any patient fields are populated
      const patientName   = val(row['Patient Full Name']);
      const patientAge    = normaliseAge(val(row['Patient Age']));
      const patientGender = normaliseGender(val(row['Patient Gender']));
      const patientLGA    = val(row['Patient LGA']);
      const patientState  = val(row['Patient State of Origin']);

      if ((patientName || patientAge !== null) && !insertedPatients.has(caseId)) {
        insertedPatients.add(caseId);
        await conn.execute(
          `INSERT IGNORE INTO patient_info
             (case_id, full_name, age, gender, lga, state_of_origin, situation_on_arrival)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            caseId,
            patientName,
            patientAge,
            patientGender,
            patientLGA,
            patientState,
            situationOnArr,
          ]
        );
        patientCount++;
      }

    } catch (err) {
      console.error(`  ✗ Error on case_id ${caseId}: ${err.message}`);
      skipped++;
    }

    if (caseCount > 0 && caseCount % 1000 === 0) {
      process.stdout.write(`  Inserted ${caseCount} cases...\n`);
    }
  }

  // Guarantee new cases auto-increment from 33147
  await conn.execute('ALTER TABLE cases AUTO_INCREMENT = 33147');

  await conn.end();

  console.log('\n══════════════════════════════');
  console.log('  Migration complete');
  console.log(`  Cases inserted:   ${caseCount}`);
  console.log(`  Patient records:  ${patientCount}`);
  console.log(`  Skipped/errors:   ${skipped}`);
  console.log('══════════════════════════════\n');
}

run().catch(err => {
  console.error('\nFatal error:', err.message);
  process.exit(1);
});
