-- Script d'insertion des données d'entraînements dans Supabase
-- À exécuter dans l'éditeur SQL de Supabase

-- Créer la table si elle n'existe pas
CREATE TABLE IF NOT EXISTS training_sessions (
  id BIGSERIAL PRIMARY KEY,
  team TEXT NOT NULL,
  coach TEXT NOT NULL,
  day TEXT NOT NULL,
  gym TEXT NOT NULL,
  courts TEXT[] NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Activer RLS (Row Level Security)
ALTER TABLE training_sessions ENABLE ROW LEVEL SECURITY;

-- Supprimer la politique si elle existe déjà
DROP POLICY IF EXISTS "Allow public read access" ON training_sessions;

-- Politique pour permettre la lecture publique
CREATE POLICY "Allow public read access" ON training_sessions
  FOR SELECT
  USING (true);

-- Fonction pour mettre à jour automatiquement updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc'::text, NOW());
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Supprimer le trigger s'il existe déjà
DROP TRIGGER IF EXISTS update_training_sessions_updated_at ON training_sessions;

-- Trigger pour mettre à jour automatiquement updated_at
CREATE TRIGGER update_training_sessions_updated_at
  BEFORE UPDATE ON training_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Supprimer les données existantes (optionnel)
-- TRUNCATE training_sessions RESTART IDENTITY;

-- Insertion de toutes les données
INSERT INTO training_sessions (id, team, coach, day, gym, courts, start_time, end_time) VALUES
  (1, 'ELITE VB assis', 'Laurent Cl', 'mercredi', 'Coupvray', ARRAY['T3'], '20:30', '22:30'),
  (2, 'ELITE VB assis', 'Laurent Cl', 'samedi', 'Coupvray', ARRAY['T1'], '09:00', '10:30'),
  (3, 'SM1', 'Jurgen', 'lundi', 'Coupvray', ARRAY['T1'], '20:30', '22:30'),
  (4, 'SM1', 'Jurgen', 'mercredi', 'Coupvray', ARRAY['T1'], '20:30', '22:30'),
  (5, 'SM1', 'Jurgen', 'vendredi', 'Coupvray', ARRAY['T1', 'T2', 'T3'], '20:30', '22:30'),
  (6, 'SF1', 'Vincent', 'mardi', 'Coupvray', ARRAY['T1'], '20:00', '22:00'),
  (7, 'SF1', 'Vincent', 'jeudi', 'Chessy', ARRAY['T1'], '20:15', '22:15'),
  (8, 'SM3', 'Cyril', 'lundi', 'Coupvray', ARRAY['T2'], '20:30', '22:30'),
  (9, 'SM3', 'Cyril', 'mercredi', 'Magny', ARRAY['T1'], '20:30', '22:30'),
  (10, 'SF2', 'Bryan', 'mardi', 'Coupvray', ARRAY['T2'], '20:00', '22:00'),
  (11, 'SF2', 'Bryan', 'jeudi', 'Chessy', ARRAY['T2'], '20:00', '22:30'),
  (12, 'SM4', 'Laurent Co', 'lundi', 'Coupvray', ARRAY['T3'], '20:30', '22:30'),
  (13, 'SM4', 'Laurent Co', 'mercredi', 'Magny', ARRAY['T2'], '20:30', '22:30'),
  (14, 'SF3', 'Aurélie', 'mardi', 'Coupvray', ARRAY['T3'], '20:00', '22:00'),
  (15, 'SF3', 'Aurélie', 'jeudi', 'Chessy', ARRAY['T3'], '20:00', '22:30'),
  (16, 'Loisirs Compétition', 'Karine / Laurent L', 'jeudi', 'Coupvray', ARRAY['T1', 'T2', 'T3'], '20:30', '22:30'),
  (17, 'Loisirs Compétition', 'Karine / Laurent L', 'vendredi', 'Magny', ARRAY['T1'], '20:30', '22:30'),
  (18, 'Loisirs Confirmés', 'Karine / Laurent L', 'vendredi', 'Magny', ARRAY['T2', 'T3'], '20:30', '22:30'),
  (19, 'Loisirs Confirmés', 'Karine / Laurent L', 'dimanche', 'Coupvray', ARRAY['T1'], '10:00', '12:00'),
  (20, 'Loisirs Débutants', 'Laurent Co', 'jeudi', 'Esbly', ARRAY['T1', 'T2', 'T3'], '20:00', '22:00'),
  (21, 'Loisirs Débutants', 'Laurent Co', 'dimanche', 'Coupvray', ARRAY['T2', 'T3'], '10:00', '12:00'),
  (22, 'Loisirs Expérimenté', 'Fabrizio', 'mercredi', 'Magny', ARRAY['T3'], '20:30', '22:30'),
  (24, 'M18F1', 'Karine P', 'mercredi', 'Coupvray', ARRAY['T1'], '18:30', '20:30'),
  (25, 'M18F1', 'Karine P', 'vendredi', 'Magny', ARRAY['T1'], '18:30', '20:30'),
  (26, 'M18G1', 'Jurgen', 'mercredi', 'Coupvray', ARRAY['T2'], '18:30', '20:30'),
  (27, 'M18G1', 'Jurgen', 'vendredi', 'Coupvray', ARRAY['T1'], '18:30', '20:30'),
  (28, 'M18F2', 'Guilhem', 'jeudi', 'Coupvray', ARRAY['T1'], '18:30', '20:30'),
  (29, 'M18F2', 'Guilhem', 'vendredi', 'Magny', ARRAY['T2'], '18:30', '20:30'),
  (30, 'M18G2', 'Gianni', 'jeudi', 'Coupvray', ARRAY['T2'], '18:30', '20:30'),
  (31, 'M18G2', 'Gianni', 'vendredi', 'Coupvray', ARRAY['T2'], '18:30', '20:30'),
  (32, 'M15F1', 'Emmy', 'lundi', 'Coupvray', ARRAY['T1'], '18:30', '20:30'),
  (33, 'M15G1', 'Damien', 'lundi', 'Coupvray', ARRAY['T3'], '18:30', '20:30'),
  (34, 'M15F2', 'Lucie', 'lundi', 'Coupvray', ARRAY['T2'], '18:30', '20:30'),
  (35, 'M15F2', 'Lucie', 'jeudi', 'Esbly', ARRAY['T2'], '18:00', '20:00'),
  (36, 'M15G2', 'Mathis', 'lundi', 'Coupvray', ARRAY['T2'], '18:30', '20:30'),
  (37, 'M13F', 'Eléa', 'mercredi', 'Coupvray', ARRAY['T1'], '17:00', '18:30'),
  (38, 'M13F', 'Eléa', 'jeudi', 'Esbly', ARRAY['T3'], '18:00', '20:00'),
  (39, 'M13G', 'Laurent Cl', 'mercredi', 'Coupvray', ARRAY['T3'], '18:30', '20:30'),
  (40, 'M13G', 'Laurent Cl', 'vendredi', 'Coupvray', ARRAY['T3'], '18:30', '20:30'),
  (41, 'M11 mixte', 'Vincent M / Mathis / William', 'mercredi', 'Coupvray', ARRAY['T2'], '17:00', '18:30'),
  (42, 'Baby-volley M7-M9', 'Vincent M / Mathis / William', 'mercredi', 'Coupvray', ARRAY['T3'], '17:00', '18:30'),
  (43, 'Baby-volley M7-M9', 'Vincent M / Mathis / William', 'samedi', 'Coupvray', ARRAY['T1', 'T2', 'T3'], '10:30', '12:00'),
  (44, 'Soft volley', 'Vincent V', 'jeudi', 'Coupvray', ARRAY['T1'], '14:00', '16:00'),
  (45, 'M15G2', 'Mathis', 'jeudi', 'Esbly', ARRAY['T1'], '18:00', '20:00'),
  (46, 'M15G1', 'Damien', 'jeudi', 'Coupvray', ARRAY['T3'], '18:30', '20:30'),
  (47, 'M15F1', 'Emmy', 'vendredi', 'Magny', ARRAY['T3'], '18:30', '20:30'),
  (48, 'SM2', 'Jurgen', 'lundi', 'Coupvray', ARRAY['T1'], '20:30', '22:30'),
  (49, 'SM2', 'Jurgen', 'mercredi', 'Coupvray', ARRAY['T2'], '20:30', '22:30')
ON CONFLICT (id) DO NOTHING;

-- Mettre à jour la séquence pour les futurs IDs auto-générés
SELECT setval('training_sessions_id_seq', (SELECT MAX(id) FROM training_sessions));
