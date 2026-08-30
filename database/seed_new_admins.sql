-- ══════════════════════════════════════════════════════
--  LASAMBUS Seed Data — New Admin Accounts
--  Run this after schema.sql (and seed.sql, if not already run).
--
--  The password hash below is the same one used in seed.sql —
--  bcrypt of 'password123' (cost 12).
--  These users should change their password on first login via
--  the Change Password feature.
--
--  Unlike seed.sql's original admin row, these explicitly set
--  role='Admin' (not just is_admin=1), since requireRole('Admin', ...)
--  checks the role column.
-- ══════════════════════════════════════════════════════

USE lasambus_db;

INSERT IGNORE INTO users
  (username, email, password_hash, first_name, last_name, is_admin, role, status)
VALUES
  ('bettymankind',   'bettymankind@gmail.com',
   '$2a$12$EmeAGLbKzEQvQOnCabeRuOhkFQ0nbedYShDHN.WL/BawTVIoNNOCy',
   'Beatrice',           'Makinde',  1, 'Admin', 'Available'),
  ('rashmama06',     'rashmama06@gmail.com',
   '$2a$12$EmeAGLbKzEQvQOnCabeRuOhkFQ0nbedYShDHN.WL/BawTVIoNNOCy',
   'Rasheedat',          'Saka',     1, 'Admin', 'Available'),
  ('shollygirl004',  'shollygirl004@gmail.com',
   '$2a$12$EmeAGLbKzEQvQOnCabeRuOhkFQ0nbedYShDHN.WL/BawTVIoNNOCy',
   'Olusola',            'Ositade',  1, 'Admin', 'Available'),
  ('oluchiclara',    'oluchiclara@gmail.com',
   '$2a$12$EmeAGLbKzEQvQOnCabeRuOhkFQ0nbedYShDHN.WL/BawTVIoNNOCy',
   'Oluchi',             'Chiagozie',1, 'Admin', 'Available'),
  ('fatimahfakos',   'fatimahfakos@gmail.com',
   '$2a$12$EmeAGLbKzEQvQOnCabeRuOhkFQ0nbedYShDHN.WL/BawTVIoNNOCy',
   'Fatimah',            'Fakos',    1, 'Admin', 'Available'),
  ('laose2martins',  'Laose2martins@yahoo.com',
   '$2a$12$EmeAGLbKzEQvQOnCabeRuOhkFQ0nbedYShDHN.WL/BawTVIoNNOCy',
   'Martins',            'Lugboso',  1, 'Admin', 'Available'),
  ('sam06032006',    'sam06032006@gmail.com',
   '$2a$12$EmeAGLbKzEQvQOnCabeRuOhkFQ0nbedYShDHN.WL/BawTVIoNNOCy',
   'Mureedat Adebimpe',  'Rahmon',   1, 'Admin', 'Available'),
  ('admin.lasambus', 'admin.lasambus@lasambus.gov.ng',
   '$2a$12$EmeAGLbKzEQvQOnCabeRuOhkFQ0nbedYShDHN.WL/BawTVIoNNOCy',
   'Admin',              'LASAMBUS', 1, 'Admin', 'Available');
