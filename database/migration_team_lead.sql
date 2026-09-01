-- Migration: add Ambulance Team Lead selection to cases
USE lasambus_db;

ALTER TABLE cases
  ADD COLUMN team_lead_id INT DEFAULT NULL AFTER treatment_centre,
  ADD FOREIGN KEY (team_lead_id) REFERENCES users(user_id) ON DELETE SET NULL;
