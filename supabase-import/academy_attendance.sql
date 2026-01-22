-- Tabla: academy_attendance
-- Exportada desde Firestore colección: academy_attendance
-- Total de registros: 3

CREATE TABLE IF NOT EXISTS academy_attendance (
  id TEXT PRIMARY KEY,
  reason TEXT,
  period BIGINT,
  updatedAt TIMESTAMPTZ,
  present BOOLEAN,
  date TEXT,
  level TEXT,
  studentName TEXT,
  registrationId TEXT,
  createdAt TIMESTAMPTZ,
  academy TEXT,
  teacherName TEXT,
  teacherNote TEXT
);

-- Datos
BEGIN;

INSERT INTO academy_attendance (id, reason, period, updatedAt, present, date, level, studentName, registrationId, createdAt, academy, teacherName, teacherNote) VALUES ('1lUP4DKHtcBFbyiMJrPM', '', 1, '2025-08-11T21:49:43.350Z', TRUE, '2025-08-11', '', 'Noah Louis Morales', 'm9BzmhATRzC2Vs4ErB2e', '2025-08-11T21:49:43.350Z', 'Soccer', 'Jod Louis', '') ON CONFLICT (id) DO UPDATE SET reason = EXCLUDED.reason, period = EXCLUDED.period, updatedAt = EXCLUDED.updatedAt, present = EXCLUDED.present, date = EXCLUDED.date, level = EXCLUDED.level, studentName = EXCLUDED.studentName, registrationId = EXCLUDED.registrationId, createdAt = EXCLUDED.createdAt, academy = EXCLUDED.academy, teacherName = EXCLUDED.teacherName, teacherNote = EXCLUDED.teacherNote;
INSERT INTO academy_attendance (id, registrationId, present, teacherNote, period, academy, level, date, reason, createdAt, teacherName, studentName, updatedAt) VALUES ('9Y2xf8mXySZpsUZGjHfh', '4iPNRM5LGjJfVZm8G5MB', TRUE, '', 1, 'Soccer', '', '2025-08-11', '', '2025-08-11T21:49:43.295Z', 'Jod Louis', 'Krish Gowda', '2025-08-11T21:49:43.295Z') ON CONFLICT (id) DO UPDATE SET registrationId = EXCLUDED.registrationId, present = EXCLUDED.present, teacherNote = EXCLUDED.teacherNote, period = EXCLUDED.period, academy = EXCLUDED.academy, level = EXCLUDED.level, date = EXCLUDED.date, reason = EXCLUDED.reason, createdAt = EXCLUDED.createdAt, teacherName = EXCLUDED.teacherName, studentName = EXCLUDED.studentName, updatedAt = EXCLUDED.updatedAt;
INSERT INTO academy_attendance (id, present, level, teacherName, updatedAt, teacherNote, academy, createdAt, period, studentName, date, reason, registrationId) VALUES ('vJT7JCKPJYgwNI0cHYyM', TRUE, '', 'Jod Louis', '2025-08-11T21:49:43.244Z', '', 'Soccer', '2025-08-11T21:49:43.244Z', 1, 'Cristian  Ruiz', '2025-08-11', '', 'kdpSshJwO4oCynB9ySOl') ON CONFLICT (id) DO UPDATE SET present = EXCLUDED.present, level = EXCLUDED.level, teacherName = EXCLUDED.teacherName, updatedAt = EXCLUDED.updatedAt, teacherNote = EXCLUDED.teacherNote, academy = EXCLUDED.academy, createdAt = EXCLUDED.createdAt, period = EXCLUDED.period, studentName = EXCLUDED.studentName, date = EXCLUDED.date, reason = EXCLUDED.reason, registrationId = EXCLUDED.registrationId;

COMMIT;

