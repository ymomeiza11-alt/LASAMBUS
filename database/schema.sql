-- ══════════════════════════════════════════════════════
--  LASAMBUS Database Schema
--  Lagos State Ambulance Service
-- ══════════════════════════════════════════════════════

CREATE DATABASE IF NOT EXISTS lasambus_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE lasambus_db;

-- ── Users (paramedics + admins) ──────────────────────
CREATE TABLE IF NOT EXISTS users (
  user_id       INT AUTO_INCREMENT PRIMARY KEY,
  username      VARCHAR(50)  NOT NULL UNIQUE,
  email         VARCHAR(100) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  title         ENUM('Mr','Miss','Mrs','Other'),
  first_name    VARCHAR(50)  NOT NULL,
  last_name     VARCHAR(50)  NOT NULL,
  cadre         VARCHAR(100),
  grade_level   VARCHAR(20),
  is_admin      TINYINT(1)   NOT NULL DEFAULT 0,
  status        ENUM('Available','Assigned','Unavailable') NOT NULL DEFAULT 'Available',
  unavailable_reason TEXT,
  created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ── Ambulances ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ambulances (
  ambulance_id   INT AUTO_INCREMENT PRIMARY KEY,
  vehicle_name   VARCHAR(100) NOT NULL,
  ambulance_code VARCHAR(20)  NOT NULL UNIQUE,
  plate_number   VARCHAR(30)  DEFAULT NULL,
  status         ENUM('Available','Assigned','Unavailable') NOT NULL DEFAULT 'Available',
  unavailable_reason TEXT,
  created_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ── Cases ─────────────────────────────────────────────
-- case_id is AUTO_INCREMENT so new records get IDs from 33147 upward.
-- Old migrated records are inserted with their explicit IDs (≤ 33146),
-- which MySQL accepts without conflict. After migration the script runs
-- ALTER TABLE cases AUTO_INCREMENT = 33147 to guarantee new IDs start
-- from there.
CREATE TABLE IF NOT EXISTS cases (
  case_id             INT          NOT NULL AUTO_INCREMENT PRIMARY KEY,
  date_of_incident    DATE,
  time_of_incident    TIME,
  notified_by         VARCHAR(255),
  lga_lcda            VARCHAR(50),
  incident_type       VARCHAR(100),
  incident_severity   VARCHAR(20),          -- NULL for migrated records
  incident_location   TEXT,
  incident_description TEXT,                -- NULL for migrated records
  dispatch_date       DATE,
  dispatch_time       TIME,                 -- NULL for migrated records
  ambulance_id        INT          DEFAULT NULL,
  treatment_centre    VARCHAR(150) DEFAULT NULL,
  arrival_date        DATE,
  arrival_time        TIME,
  situation_on_arrival VARCHAR(100),
  collapsed_buildings      SMALLINT UNSIGNED DEFAULT NULL,
  desc_collapsed_buildings TEXT              DEFAULT NULL,
  response_time_mins  SMALLINT UNSIGNED,    -- arrival − time_of_incident
  transit_time_mins   SMALLINT UNSIGNED,    -- arrival − dispatch
  case_status         ENUM('Active','Complete','Cancelled') NOT NULL DEFAULT 'Active',
  created_by          INT          DEFAULT NULL,
  created_at          TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (ambulance_id) REFERENCES ambulances(ambulance_id) ON DELETE SET NULL,
  FOREIGN KEY (created_by)   REFERENCES users(user_id)           ON DELETE SET NULL
);

-- ── Case–Paramedic assignments (many-to-many) ─────────
CREATE TABLE IF NOT EXISTS case_paramedics (
  id       INT AUTO_INCREMENT PRIMARY KEY,
  case_id  INT NOT NULL,
  user_id  INT NOT NULL,
  UNIQUE KEY uq_case_user (case_id, user_id),
  FOREIGN KEY (case_id) REFERENCES cases(case_id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- ── Patient Information (7-page form) ─────────────────
CREATE TABLE IF NOT EXISTS patient_info (
  patient_id   INT AUTO_INCREMENT PRIMARY KEY,
  case_id      INT NOT NULL,

  -- Page 1: Patient Information
  full_name    VARCHAR(150),
  age          TINYINT UNSIGNED,
  gender       ENUM('Male','Female'),
  home_address TEXT,
  state_of_origin VARCHAR(50),
  lga          VARCHAR(50),
  phone_number VARCHAR(20),
  occupation   VARCHAR(100),

  -- Page 2: General Assessment
  respiratory_rate    DECIMAL(5,1),
  temperature         DECIMAL(4,1),
  condition_on_arrival ENUM('Stable','Unstable'),
  spo2                VARCHAR(10),

  -- Page 3: Medical History
  gastrointestinal    TEXT,
  known_medical_history TEXT,
  cancer_diagnosis    TEXT,
  renal_urological    TEXT,

  -- Page 4: Primary Assessment
  level_of_consciousness TEXT,
  airway              TEXT,
  breathing           TEXT,
  circulation         TEXT,

  -- Page 5: Treatment and Interventions
  airway_management   TEXT,
  airway_additional   TEXT,
  breathing_assistance TEXT,
  breathing_additional TEXT,
  cardiac_care        TEXT,

  -- Page 6: Destination Hospital
  hospital_name            VARCHAR(150),
  transport_departure_time TIME,
  transport_arrival_time   TIME,
  outcome_at_hospital      TEXT,
  hospital_date            DATE,
  hospital_time            TIME,

  -- Page 7: Additional Information
  hcp_designation  VARCHAR(100),
  hcp_name         VARCHAR(150),
  law_enforcement  TEXT,
  patient_belongings TEXT,
  witnesses        TEXT,

  -- Metadata
  situation_on_arrival VARCHAR(100),
  submitted_by         INT DEFAULT NULL,
  created_at           TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (case_id)      REFERENCES cases(case_id)   ON DELETE CASCADE,
  FOREIGN KEY (submitted_by) REFERENCES users(user_id)   ON DELETE SET NULL
);
