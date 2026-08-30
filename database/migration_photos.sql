-- Migration: add case photos + admin archives
USE lasambus_db;

CREATE TABLE IF NOT EXISTS case_photos (
  photo_id   INT AUTO_INCREMENT PRIMARY KEY,
  case_id    INT NOT NULL,
  file_path  VARCHAR(255) NOT NULL,
  original_filename VARCHAR(255),
  uploaded_by INT DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (case_id) REFERENCES cases(case_id) ON DELETE CASCADE,
  FOREIGN KEY (uploaded_by) REFERENCES users(user_id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS archives (
  archive_id INT AUTO_INCREMENT PRIMARY KEY,
  title      VARCHAR(255),
  file_path  VARCHAR(255) NOT NULL,
  original_filename VARCHAR(255),
  uploaded_by INT DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (uploaded_by) REFERENCES users(user_id) ON DELETE SET NULL
);
