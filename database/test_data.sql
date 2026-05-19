-- ============================================================
--  LASAMBUS Test Data
--  5 Paramedics | 30 Cases | 15 Patient Records
--
--  Assumes:
--    - schema.sql and seed.sql have been run
--    - Existing admin user -> user_id = 1
--    - New paramedics      -> user_id 2-6
--    - New cases           -> case_id 1-30
--    - Patient records reference case_ids 1-15
-- ============================================================

-- ------------------------------------------------------------
-- 5 PARAMEDICS (password for all: password123)
-- ------------------------------------------------------------
INSERT INTO users
  (username, email, password_hash, title, first_name, last_name,
   cadre, grade_level, is_admin, status)
VALUES
  ('amina.okonkwo',     'amina.okonkwo@lasambus.gov.ng',
   '$2a$12$EmeAGLbKzEQvQOnCabeRuOhkFQ0nbedYShDHN.WL/BawTVIoNNOCy',
   'Miss', 'Amina',     'Okonkwo',  'Emergency Medical Technician', 'GL-07', 0, 'Available'),
  ('babatunde.adeyemi', 'babatunde.adeyemi@lasambus.gov.ng',
   '$2a$12$EmeAGLbKzEQvQOnCabeRuOhkFQ0nbedYShDHN.WL/BawTVIoNNOCy',
   'Mr',   'Babatunde', 'Adeyemi',  'Paramedic',                   'GL-08', 0, 'Available'),
  ('chidinma.eze',      'chidinma.eze@lasambus.gov.ng',
   '$2a$12$EmeAGLbKzEQvQOnCabeRuOhkFQ0nbedYShDHN.WL/BawTVIoNNOCy',
   'Mrs',  'Chidinma',  'Eze',      'Basic Life Support',          'GL-06', 0, 'Available'),
  ('emeka.nwosu',       'emeka.nwosu@lasambus.gov.ng',
   '$2a$12$EmeAGLbKzEQvQOnCabeRuOhkFQ0nbedYShDHN.WL/BawTVIoNNOCy',
   'Mr',   'Emeka',     'Nwosu',    'Advanced Life Support',       'GL-09', 0, 'Available'),
  ('fatima.ibrahim',    'fatima.ibrahim@lasambus.gov.ng',
   '$2a$12$EmeAGLbKzEQvQOnCabeRuOhkFQ0nbedYShDHN.WL/BawTVIoNNOCy',
   'Miss', 'Fatima',    'Ibrahim',  'Senior Paramedic',            'GL-10', 0, 'Available');


-- ------------------------------------------------------------
-- 15 COMPLETE CASES (case_ids 1-15)
-- ------------------------------------------------------------
INSERT INTO cases
  (date_of_incident, time_of_incident, notified_by, lga_lcda,
   incident_type, incident_severity, incident_location, incident_description,
   dispatch_date, dispatch_time, ambulance_id,
   arrival_date, arrival_time, situation_on_arrival,
   response_time_mins, transit_time_mins, case_status, created_by)
VALUES
  ('2026-01-05','08:30:00','LASEMA Control','Ikeja',
   'Road Traffic Accident','High','Ikorodu Road near Ojota Bus Stop',
   'Three-vehicle collision, multiple casualties reported',
   '2026-01-05','08:48:00',NULL,
   '2026-01-05','09:22:00','Two patients conscious, one unresponsive',
   18,34,'Complete',1),

  ('2026-01-12','14:15:00','112 Emergency','Eti-Osa',
   'Medical Emergency','Medium','Lekki Phase 1, Close 10',
   'Middle-aged man collapsed at construction site',
   '2026-01-12','14:28:00',NULL,
   '2026-01-12','14:58:00','Patient conscious but confused',
   13,30,'Complete',2),

  ('2026-01-18','21:45:00','Lagos Police Command','Lagos Island',
   'Cardiac Arrest','Critical','Broad Street, Lagos Island',
   'Security guard found unresponsive at bank premises',
   '2026-01-18','22:00:00',NULL,
   '2026-01-18','22:35:00','No pulse on arrival, CPR in progress',
   15,35,'Complete',1),

  ('2026-01-24','07:20:00','Family Member','Apapa',
   'Drowning','Critical','Apapa Wharf, near Gate 5',
   'Dock worker fell into water, rescued by colleagues',
   '2026-01-24','07:32:00',NULL,
   '2026-01-24','08:05:00','Patient unconscious, significant water inhalation',
   12,33,'Complete',3),

  ('2026-02-02','11:00:00','LASEMA Control','Surulere',
   'Stroke','High','Bode Thomas Street, off Adelabu',
   'Elderly woman unable to move right side of body',
   '2026-02-02','11:15:00',NULL,
   '2026-02-02','11:50:00','Patient alert, slurred speech, right-sided weakness',
   15,35,'Complete',2),

  ('2026-02-08','16:30:00','Fire Service Lagos','Alimosho',
   'Fire Incident','High','Ipaja Road near Akowonjo Roundabout',
   'Building fire with trapped occupants, 2 rescued',
   '2026-02-08','16:45:00',NULL,
   '2026-02-08','17:15:00','Patient with burns to arms and face, distressed',
   15,30,'Complete',1),

  ('2026-02-14','09:10:00','Hospital Referral','Mushin',
   'Obstetric Emergency','Critical','Mushin General Hospital, Ward 5',
   'Pregnant woman in labour, severe complications',
   '2026-02-14','09:22:00',NULL,
   '2026-02-14','09:55:00','Patient in active labour, foetal distress noted',
   12,33,'Complete',4),

  ('2026-02-20','13:40:00','Bystander','Kosofe',
   'Violence/Assault','Medium','Ketu Bridge, Kosofe',
   'Man assaulted with blunt object near bridge',
   '2026-02-20','13:55:00',NULL,
   '2026-02-20','14:25:00','Patient conscious, head wound, disoriented',
   15,30,'Complete',5),

  ('2026-02-26','22:15:00','FRSC','Ikorodu',
   'Road Traffic Accident','Critical','Lagos-Ikorodu Expressway, Km 12',
   'Truck-motorcyclist collision, motorcyclist ejected',
   '2026-02-26','22:30:00',NULL,
   '2026-02-26','23:10:00','Patient with suspected spinal injury, semi-conscious',
   15,40,'Complete',3),

  ('2026-03-04','10:00:00','112 Emergency','Ojo',
   'Medical Emergency','Medium','Badagry Expressway, near Mile 2 Flyover',
   'Bus passenger suddenly unconscious during journey',
   '2026-03-04','10:12:00',NULL,
   '2026-03-04','10:45:00','Patient responsive, low blood sugar suspected',
   12,33,'Complete',1),

  ('2026-03-10','15:20:00','LASEMA Control','Ikeja',
   'Cardiac Arrest','Critical','Allen Avenue, Ikeja',
   'Man collapsed in supermarket, bystander performing CPR',
   '2026-03-10','15:35:00',NULL,
   '2026-03-10','16:05:00','Pulse restored, patient unconscious post-CPR',
   15,30,'Complete',2),

  ('2026-03-16','08:45:00','Family Member','Lagos Island',
   'Drowning','High','Bar Beach, Victoria Island',
   'Teenager swept off rocks by wave',
   '2026-03-16','09:00:00',NULL,
   '2026-03-16','09:28:00','Patient breathing, pale, hypothermic',
   15,28,'Complete',4),

  ('2026-03-22','19:30:00','Lagos Police Command','Eti-Osa',
   'Stroke','High','Ozumba Mbadiwe Avenue, Victoria Island',
   'Executive found unresponsive in office, facial droop observed',
   '2026-03-22','19:45:00',NULL,
   '2026-03-22','20:20:00','GCS 10, blood pressure critically elevated',
   15,35,'Complete',1),

  ('2026-03-28','12:00:00','LASEMA Control','Badagry',
   'Fire Incident','Medium','Badagry Town Centre Market',
   'Market stall fire, vendor with smoke inhalation',
   '2026-03-28','12:18:00',NULL,
   '2026-03-28','12:55:00','Patient coughing, mild respiratory distress',
   18,37,'Complete',5),

  ('2026-04-03','06:15:00','Bystander','Surulere',
   'Road Traffic Accident','High','Western Avenue, Surulere',
   'Motorcycle vs car collision, rider thrown 5 metres',
   '2026-04-03','06:30:00',NULL,
   '2026-04-03','07:10:00','Patient alert, suspected fractured leg, in pain',
   15,40,'Complete',3);


-- ------------------------------------------------------------
-- 10 ACTIVE CASES (case_ids 16-25)
-- ------------------------------------------------------------
INSERT INTO cases
  (date_of_incident, time_of_incident, notified_by, lga_lcda,
   incident_type, incident_severity, incident_location, incident_description,
   dispatch_date, dispatch_time, ambulance_id,
   arrival_date, arrival_time, situation_on_arrival,
   response_time_mins, transit_time_mins, case_status, created_by)
VALUES
  ('2026-04-09','09:30:00','112 Emergency','Alimosho',
   'Medical Emergency','Medium','Ikotun Road, Alimosho',
   'Elderly man with difficulty breathing, family called',
   '2026-04-09','09:45:00',NULL,
   NULL,NULL,NULL,15,NULL,'Active',2),

  ('2026-04-15','14:00:00','LASEMA Control','Mushin',
   'Cardiac Arrest','Critical','Mushin Market, near Railway Line',
   'Man clutching chest collapsed in market',
   '2026-04-15','14:20:00',NULL,
   NULL,NULL,NULL,20,NULL,'Active',1),

  ('2026-04-21','20:30:00','Bystander','Kosofe',
   'Drowning','High','Alapere Canal, Kosofe',
   'Child fell into drainage canal, bystanders watching',
   '2026-04-21','20:45:00',NULL,
   NULL,NULL,NULL,15,NULL,'Active',4),

  ('2026-04-27','11:15:00','FRSC','Apapa',
   'Road Traffic Accident','High','Apapa-Oshodi Expressway, Km 4',
   'Container truck overturned, driver trapped in cab',
   '2026-04-27','11:30:00',NULL,
   NULL,NULL,NULL,15,NULL,'Active',3),

  ('2026-05-03','08:00:00','Family Member','Ikorodu',
   'Stroke','Medium','Ikorodu Town, off Lagos Road',
   'Elderly woman unable to speak clearly, arm weak',
   '2026-05-03','08:12:00',NULL,
   NULL,NULL,NULL,12,NULL,'Active',5),

  ('2026-05-09','16:45:00','Lagos Police Command','Ikeja',
   'Fire Incident','High','Oba Akran Avenue, Ikeja Industrial Estate',
   'Factory fire, three workers with burns',
   NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'Active',1),

  ('2026-05-12','10:20:00','112 Emergency','Lagos Island',
   'Violence/Assault','Medium','Carter Bridge, Lagos Island',
   'Two men injured in street fight, one stabbed',
   NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'Active',2),

  ('2026-05-14','13:00:00','Bystander','Eti-Osa',
   'Fall from Height','High','Lekki Phase 2 Construction Site',
   'Construction worker fell from third floor scaffolding',
   NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'Active',3),

  ('2026-05-15','19:00:00','LASEMA Control','Surulere',
   'Medical Emergency','Medium','Aguda, Surulere',
   'Woman collapsed at bus stop, not responsive to voice',
   NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'Active',4),

  ('2026-05-16','07:30:00','Family Member','Ojo',
   'Poisoning/Overdose','High','Ilemba Hausa, Ojo',
   'Teenager found unconscious, suspected drug overdose',
   NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'Active',1);


-- ------------------------------------------------------------
-- 5 CANCELLED CASES (case_ids 26-30)
-- ------------------------------------------------------------
INSERT INTO cases
  (date_of_incident, time_of_incident, notified_by, lga_lcda,
   incident_type, incident_severity, incident_location, incident_description,
   dispatch_date, dispatch_time, ambulance_id,
   arrival_date, arrival_time, situation_on_arrival,
   response_time_mins, transit_time_mins, case_status, created_by)
VALUES
  ('2026-03-05','10:00:00','LASEMA Control','Kosofe',
   'Road Traffic Accident','Low','Alapere Road, Kosofe',
   'Minor fender-bender, caller reported injuries but none found on scene',
   '2026-03-05','10:15:00',NULL,
   NULL,NULL,NULL,15,NULL,'Cancelled',5),

  ('2026-03-15','15:30:00','Bystander','Mushin',
   'Medical Emergency','Low','Mushin Roundabout',
   'Report of man feeling faint, patient left scene before crew arrived',
   NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'Cancelled',1),

  ('2026-04-01','08:45:00','112 Emergency','Alimosho',
   'Cardiac Arrest','Critical','Command Estate, Ipaja',
   'Second call confirmed patient self-revived and refused transfer',
   NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'Cancelled',3),

  ('2026-04-18','20:15:00','Lagos Police Command','Apapa',
   'Drowning','Medium','Tin Can Island Port',
   'Alert cancelled - incident was a drill exercise by port authority',
   NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'Cancelled',2),

  ('2026-05-07','11:00:00','Family Member','Ikorodu',
   'Stroke','Medium','Igbogbo, Ikorodu',
   'Family member called in panic, patient already transported by private car',
   NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'Cancelled',4);


-- ------------------------------------------------------------
-- 15 PATIENT RECORDS (one per case, case_ids 2-16)
-- ------------------------------------------------------------
INSERT INTO patient_info (
  case_id,
  full_name, age, gender, home_address, state_of_origin, lga, phone_number, occupation,
  respiratory_rate, temperature, condition_on_arrival, spo2,
  gastrointestinal, known_medical_history, cancer_diagnosis, renal_urological,
  level_of_consciousness, airway, breathing, circulation,
  airway_management, airway_additional, breathing_assistance, breathing_additional, cardiac_care,
  hospital_name, transport_departure_time, transport_arrival_time,
  outcome_at_hospital, hospital_date, hospital_time,
  hcp_designation, hcp_name, law_enforcement, patient_belongings, witnesses,
  situation_on_arrival, submitted_by
)
VALUES
  (2,
   'Chukwuemeka Obi',28,'Male','14 Adeniyi Jones, Ikeja','Anambra','Ikeja','08023456789','Mechanic',
   22,36.8,'Stable','97%',
   NULL,NULL,NULL,NULL,
   'Alert and oriented','Clear','Adequate','Pulse 95bpm, BP 130/85',
   'Cervical collar applied',NULL,'Supplemental oxygen via mask',NULL,NULL,
   'Lagos State University Teaching Hospital (LASUTH)','09:25:00','09:55:00',
   'Admitted - X-ray ordered for suspected rib fracture','2026-01-05','09:55:00',
   'Nurse','Blessing Akintola','RRS officers on scene','Mobile phone, wallet','Two bystanders, names not taken',
   'Conscious, complaining of chest pain',1),

  (3,
   'David Nwachukwu',52,'Male','7 Ligali Ayorinde, Victoria Island','Imo','Eti-Osa','08034567890','Engineer',
   18,37.2,'Stable','95%',
   NULL,'Hypertension, Diabetes Type 2',NULL,NULL,
   'Alert but confused','Clear','Adequate','Pulse 88bpm, BP 165/100',
   NULL,NULL,'Oxygen via nasal cannula',NULL,NULL,
   'Eko Hospital, Victoria Island','14:35:00','14:55:00',
   'Admitted for observation, BP management','2026-01-12','14:55:00',
   'Doctor','Dr. Funmilayo Adeola',NULL,'Briefcase, laptop, ID card',NULL,
   'Conscious, disoriented, sweating profusely',2),

  (4,
   'Musa Garba',61,'Male','3 Nnamdi Azikiwe Street, Lagos Island','Kano','Lagos Island','07056789012','Security Guard',
   0,36.1,'Unstable','72%',
   NULL,'Known cardiac patient',NULL,NULL,
   'Unresponsive (GCS 3)','Obstructed - suction applied','Absent - BVM ventilation initiated','No pulse, CPR in progress',
   'Oropharyngeal airway inserted',NULL,'BVM ventilation at 12/min',NULL,'CPR commenced, AED deployed - non-shockable',
   'Lagos Island General Hospital','22:40:00','22:55:00',
   'DOA - pronounced deceased by attending physician','2026-01-18','22:55:00',
   'Doctor','Dr. Adebisi Fashola','Police present (deceased patient)','Torch, keys, work ID','Colleague from bank',
   'No pulse, no respiration on arrival',1),

  (5,
   'Tunde Afolabi',35,'Male','Dock Workers Quarters, Apapa','Oyo','Apapa','08067890123','Dock Worker',
   28,35.9,'Unstable','80%',
   NULL,NULL,NULL,NULL,
   'Semi-conscious (GCS 8)','Secretions cleared','Laboured - supplemental O2 applied','Pulse 110bpm, BP 100/60',
   'Airway suctioned',NULL,'High-flow O2 via non-rebreather mask',NULL,NULL,
   'General Hospital Apapa','08:10:00','08:35:00',
   'Admitted to ICU - severe aspiration pneumonia risk','2026-01-24','08:35:00',
   'Nurse','Emmanuel Dada',NULL,'Work ID, boots (left at scene)','Three dock colleagues',
   'Unconscious, bluish lips, water cleared from airway',3),

  (6,
   'Grace Adekoya',68,'Female','22 Bode Thomas Street, Surulere','Ekiti','Surulere','08078901234','Retired',
   16,37.5,'Unstable','93%',
   'Constipation reported','Hypertension, previous TIA',NULL,NULL,
   'Alert, slurred speech','Clear','Adequate but shallow','Pulse 78bpm, BP 185/115',
   NULL,NULL,'Oxygen via mask',NULL,NULL,
   'General Hospital Surulere','11:55:00','12:25:00',
   'Admitted - CT scan ordered, neurologist consulted','2026-02-02','12:25:00',
   'Doctor','Dr. Kemi Olusanya',NULL,'Handbag, walking stick','Adult daughter (next of kin)',
   'Alert but unable to move right side, facial droop present',2),

  (7,
   'Rasheed Bello',42,'Male','10 Akowonjo Road, Alimosho','Lagos','Alimosho','08089012345','Landlord',
   24,37.8,'Unstable','91%',
   NULL,'Asthma',NULL,NULL,
   'Alert, agitated','Soot around nostrils - patent','Wheezing present','Pulse 102bpm, BP 140/90',
   'Humidified oxygen applied',NULL,'Nebuliser administered',NULL,NULL,
   'Isolo General Hospital','17:20:00','17:55:00',
   'Admitted - burns (10% BSA) and smoke inhalation treated','2026-02-08','17:55:00',
   'Nurse','Ngozi Obiechina','Fire Service on scene','None recovered','Neighbour: Mrs. Saheed',
   'Burns to forearms and face, respiratory distress',1),

  (8,
   'Nkechi Okoye',27,'Female','5 Itire Road, Mushin','Imo','Mushin','08090123456','Trader',
   20,37.6,'Unstable','94%',
   NULL,'Gestational hypertension',NULL,NULL,
   'Alert, very distressed','Clear','Adequate','Pulse 120bpm, BP 160/105',
   NULL,NULL,'Oxygen via mask',NULL,NULL,
   'Lagos State University Teaching Hospital (LASUTH)','10:00:00','10:30:00',
   'Emergency C-section performed - mother and baby stable','2026-02-14','10:30:00',
   'Midwife','Mrs. Jumoke Aina',NULL,'Delivery bag, phone','Sister accompanied patient',
   'Active labour, severe hypertension, foetal heart rate dropping',4),

  (9,
   'Ibrahim Sule',24,'Male','18 Ketu Alapere Road, Kosofe','Adamawa','Kosofe','07061234567','Student',
   18,36.9,'Stable','98%',
   NULL,NULL,NULL,NULL,
   'Alert, confused about events','Clear','Normal','Pulse 90bpm, BP 125/80',
   NULL,NULL,NULL,NULL,NULL,
   'Gbagada General Hospital','14:30:00','15:05:00',
   'Treated for 4cm scalp laceration - discharged after observation','2026-02-20','15:05:00',
   'Nurse','Taiwo Adeyemi','Police escorted to hospital','Mobile phone, bag','Three witnesses at scene',
   'Alert, significant scalp bleeding, walking unaided',5),

  (10,
   'Yusuf Abdullahi',31,'Male','Ikorodu Expressway Workers Barracks','Katsina','Ikorodu','08012378901','Dispatch Rider',
   20,36.7,'Unstable','88%',
   NULL,NULL,NULL,NULL,
   'Semi-conscious (GCS 9)','Airway maintained with jaw thrust','Laboured - assisted','Pulse 55bpm, BP 90/60',
   'Jaw thrust maintained',NULL,'BVM then O2 mask',NULL,'IV access established, fluids initiated',
   'Ikorodu General Hospital','23:15:00','23:45:00',
   'Admitted - surgery for suspected internal bleeding','2026-02-26','23:45:00',
   'Doctor','Dr. Akin Olubode','FRSC officers at scene','Helmet (broken), delivery bag','Truck driver detained at scene',
   'Semi-conscious, suspected internal injuries, hypotensive',3),

  (11,
   'Adaeze Chukwu',45,'Female','7 Badagry Expressway, Ojo','Anambra','Ojo','08023491023','Nurse',
   16,36.5,'Stable','96%',
   NULL,'Diabetes Type 1',NULL,NULL,
   'Alert, mildly confused on arrival','Clear','Normal','Pulse 84bpm, BP 110/70',
   NULL,NULL,'Oxygen via nasal cannula',NULL,NULL,
   'General Hospital Ojo','10:50:00','11:20:00',
   'Blood glucose corrected (was 2.1 mmol/L) - discharged after 2 hours','2026-03-04','11:20:00',
   'Doctor','Dr. Oluwaseun Bakare',NULL,'Handbag, nurse ID','Bus driver and other passengers',
   'Conscious, pale, diaphoretic - blood sugar critically low',1),

  (12,
   'Olawale Ogunleye',58,'Male','4 Allen Avenue, Ikeja','Ogun','Ikeja','08034512345','Business Owner',
   0,36.2,'Unstable','70%',
   NULL,'Hypertension, Diabetes - previous MI 3 years ago',NULL,NULL,
   'Unconscious (GCS 3)','BVM assisted','Absent on arrival','No pulse - CPR ongoing by bystander',
   'OPA inserted',NULL,'BVM ventilation 12/min',NULL,'CPR continued - AED applied, 2 shocks delivered, shockable rhythm',
   'Lagos State University Teaching Hospital (LASUTH)','16:10:00','16:40:00',
   'Admitted to cardiac ICU - ROSC achieved en route','2026-03-10','16:40:00',
   'Doctor','Dr. Tunde Babalola',NULL,'Wallet, car keys, phone','Supermarket manager on scene',
   'Unresponsive, bystander CPR in progress on arrival',2),

  (13,
   'Precious Eze',17,'Female','CMS Grammar School Area, Lagos Island','Lagos','Lagos Island',NULL,'Student',
   22,35.7,'Stable','94%',
   NULL,NULL,NULL,NULL,
   'Alert, shivering','Clear','Adequate','Pulse 105bpm, BP 100/65',
   NULL,NULL,'High-flow O2 via mask',NULL,NULL,
   'Lagos Island General Hospital','09:35:00','10:00:00',
   'Admitted for observation - hypothermia managed, discharged next day','2026-03-16','10:00:00',
   'Nurse','Clara Okafor',NULL,'School bag (waterlogged)','Friends present at scene',
   'Breathing, pale, wet, shivering',4),

  (14,
   'Samuel Adeleke',55,'Male','30 Ozumba Mbadiwe, Victoria Island','Osun','Eti-Osa','08056789012','Executive',
   14,37.4,'Unstable','90%',
   NULL,'Hypertension, high cholesterol',NULL,NULL,
   'GCS 10 - eyes open to voice','Clear with head-tilt','Shallow but present','Pulse 60bpm, BP 210/130',
   'Head-tilt maintained',NULL,'Supplemental O2 via mask',NULL,NULL,
   'Eko Hospital, Victoria Island','20:25:00','20:55:00',
   'Admitted to stroke unit - thrombolytics considered','2026-03-22','20:55:00',
   'Doctor','Dr. Chidi Nwogu',NULL,'Phone, glasses, briefcase','Office colleague who called 112',
   'Reduced consciousness, severe hypertension, unable to speak',1),

  (15,
   'Aminat Balogun',38,'Female','Badagry Town Centre','Lagos','Badagry','08089012678','Market Trader',
   20,37.1,'Stable','95%',
   NULL,'Asthma',NULL,NULL,
   'Alert, anxious','Clear - mild soot present','Mild wheeze','Pulse 95bpm, BP 120/80',
   NULL,NULL,'O2 via mask and bronchodilator inhaler',NULL,NULL,
   'Badagry General Hospital','13:00:00','13:35:00',
   'Treated for smoke inhalation - discharged after 4 hours','2026-03-28','13:35:00',
   'Nurse','Kolade Balogun','Fire Service coordinated response','Market goods left at scene','Fellow traders',
   'Coughing, mild distress, no visible burns',5),

  (16,
   'Seun Oladipo',22,'Male','Western Avenue, Surulere','Lagos','Surulere','08078923456','Delivery Rider',
   22,36.8,'Stable','97%',
   NULL,NULL,NULL,NULL,
   'Alert and oriented','Clear','Normal','Pulse 100bpm, BP 125/80',
   NULL,NULL,'O2 via mask briefly',NULL,NULL,
   'General Hospital Surulere','07:15:00','07:50:00',
   'Admitted - X-ray confirmed fractured tibia, splinting done','2026-04-03','07:50:00',
   'Doctor','Dr. Abiola Owoeye','Police took statement at hospital','Helmet, delivery bag, phone','Motorist who caused accident',
   'Conscious, right leg deformed, significant pain',3);
