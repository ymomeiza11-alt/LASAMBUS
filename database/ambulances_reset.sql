-- ══════════════════════════════════════════════════════
--  LASAMBUS Ambulances Reset
--  Drops and recreates the ambulances table with all
--  official vehicle data. Run against lasambus_db.
-- ══════════════════════════════════════════════════════

USE lasambus_db;

SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS ambulances;
SET FOREIGN_KEY_CHECKS = 1;

CREATE TABLE ambulances (
  ambulance_id       INT AUTO_INCREMENT PRIMARY KEY,
  ambulance_code     VARCHAR(20)  NOT NULL UNIQUE,
  plate_number       VARCHAR(30)  DEFAULT NULL,
  vehicle_name       VARCHAR(100) NOT NULL,
  status             ENUM('Available','Assigned','Unavailable') NOT NULL DEFAULT 'Available',
  unavailable_reason TEXT,
  created_at         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO ambulances (ambulance_code, plate_number, vehicle_name) VALUES
('001', 'SMK 528 YE', 'IVECO'),
('002', 'SMK 529 YE', 'IVECO'),
('003', 'SMK 530 YE', 'IVECO'),
('004', 'SMK 531 YE', 'IVECO'),
('005', 'SMK 963 YE', 'IVECO'),
('006', 'SMK 964 YE', 'IVECO'),
('007', 'SMK 695 YE', 'IVECO'),
('008', 'SMK 696 YE', 'IVECO'),
('009', '14A 123 LA', 'TOYOTA HIACE HIGH ROOF'),
('010', '14A 124 LA', 'TOYOTA HIACE HIGH ROOF'),
('011', '14A 125 LA', 'TOYOTA HIACE HIGH ROOF'),
('012', '14A 126 LA', 'TOYOTA HIACE HIGH ROOF'),
('013', '14A 127 LA', 'TOYOTA HIACE HIGH ROOF'),
('014', '14A 128 LA', 'TOYOTA HIACE HIGH ROOF'),
('015', '14A 129 LA', 'TOYOTA HIACE HIGH ROOF'),
('016', '14A 130 LA', 'TOYOTA HIACE HIGH ROOF'),
('017', '14A 131 LA', 'TOYOTA HIACE HIGH ROOF'),
('018', '14A 132 LA', 'TOYOTA HIACE HIGH ROOF'),
('019', '14A 114 LA', 'JOYLONG'),
('020', '14A 113 LA', 'TOYOTA HIACE'),
('021', '14A 115 LA', 'TOYOTA HIACE'),
('022', '14A 117 LA', 'TOYOTA HIACE'),
('023', '14A 118 LA', 'TOYOTA HIACE'),
('024', '14A 20 LA',  'NISSAN'),
('025', '14A 32 LA',  'TOYOTA HIACE'),
('026', '14A 133 LA', 'TOYOTA HIACE'),
('027', '14A 134 LA', 'TOYOTA HIACE'),
('028', '14A 135 LA', 'TOYOTA HIACE'),
('029', '14A 136 LA', 'TOYOTA HIACE'),
('030', '14A 137 LA', 'TOYOTA HIACE'),
('031', '14A 75 LA',  'BENZ SPRINTER (MOBILE CLINIC)'),
('032', '14A 76 LA',  'BENZ SPRINTER (MOBILE CLINIC)'),
('033', 'BDG 20 BA',  'TATA (MOBILE CLINIC)');
