-- Tabla: settings
-- Exportada desde Firestore colección: settings
-- Total de registros: 2

CREATE TABLE IF NOT EXISTS settings (
  id TEXT PRIMARY KEY,
  lunch JSONB,
  academyPrices JSONB,
  updatedAt TIMESTAMPTZ,
  admins JSONB
);

-- Datos
BEGIN;

INSERT INTO settings (id, lunch, academyPrices, updatedAt) VALUES ('pricing', '{"single":4,"semester":40}'::jsonb, '{"Soccer":40,"Stretch and Strengthen":40,"Kids":40,"Senior":40,"Korean Cooking":150,"Pickleball":40,"Korean Language":40,"DIY":80,"Art":80,"Piano":80}'::jsonb, '2025-08-11T19:14:11.344Z') ON CONFLICT (id) DO UPDATE SET lunch = EXCLUDED.lunch, academyPrices = EXCLUDED.academyPrices, updatedAt = EXCLUDED.updatedAt;
INSERT INTO settings (id, admins) VALUES ('roles', '["zOE4dCG10dNt2rbdhhUfCXbUWHp1"]'::jsonb) ON CONFLICT (id) DO UPDATE SET admins = EXCLUDED.admins;

COMMIT;

