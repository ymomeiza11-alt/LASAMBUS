-- Migration: support multiple ambulances per case
USE lasambus_db;

CREATE TABLE IF NOT EXISTS case_ambulances (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  case_id      INT NOT NULL,
  ambulance_id INT NOT NULL,
  UNIQUE KEY uq_case_ambulance (case_id, ambulance_id),
  FOREIGN KEY (case_id) REFERENCES cases(case_id) ON DELETE CASCADE,
  FOREIGN KEY (ambulance_id) REFERENCES ambulances(ambulance_id) ON DELETE CASCADE
);

-- Backfill from the existing single ambulance_id column.
-- cases.ambulance_id is left in place afterwards (not dropped) but the
-- application stops writing to it — case_ambulances is the source of truth.
INSERT IGNORE INTO case_ambulances (case_id, ambulance_id)
SELECT case_id, ambulance_id FROM cases WHERE ambulance_id IS NOT NULL;
