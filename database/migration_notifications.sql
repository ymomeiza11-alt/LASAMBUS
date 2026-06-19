-- Migration: Add notifications table
USE lasambus_db;

CREATE TABLE IF NOT EXISTS notifications (
  notification_id INT AUTO_INCREMENT PRIMARY KEY,
  user_id         INT NOT NULL,
  type            ENUM('dispatch','case_complete','info_change','admin_granted','password_change') NOT NULL,
  title           VARCHAR(255) NOT NULL,
  message         TEXT NOT NULL,
  case_id         INT DEFAULT NULL,
  is_read         TINYINT(1) NOT NULL DEFAULT 0,
  created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  FOREIGN KEY (case_id) REFERENCES cases(case_id) ON DELETE SET NULL
);
