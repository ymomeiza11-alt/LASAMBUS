-- ══════════════════════════════════════════════════════
--  LASAMBUS Seed Data — Initial Admin User
--  Run this after schema.sql.
--
--  The password hash below is bcrypt of 'password123' (cost 12).
--  Change the password on first login via the Change Password feature.
-- ══════════════════════════════════════════════════════

USE lasambus_db;

INSERT IGNORE INTO users
  (username, email, password_hash, title, first_name, last_name, cadre, grade_level, is_admin, status)
VALUES
  (
    'admin',
    'admin@lasambus.gov.ng',
    '$2b$12$KIB/RQjUvpkCJAetKExI6.sQDPMDq4zEYy01lNH7aS8LKn5wQMwCi',
    'Mr',
    'Admin',
    'User',
    'Senior Paramedic',
    'GL-12',
    1,
    'Available'
  );
