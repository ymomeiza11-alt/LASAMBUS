-- Migration: rename case_status value 'Cancelled' -> 'Closed'
USE lasambus_db;

-- Step 1: widen enum to include both values
ALTER TABLE cases
  MODIFY COLUMN case_status ENUM('Active','Complete','Cancelled','Closed') NOT NULL DEFAULT 'Active';

-- Step 2: migrate existing data
UPDATE cases SET case_status = 'Closed' WHERE case_status = 'Cancelled';

-- Step 3: narrow enum, dropping the old value
ALTER TABLE cases
  MODIFY COLUMN case_status ENUM('Active','Complete','Closed') NOT NULL DEFAULT 'Active';
