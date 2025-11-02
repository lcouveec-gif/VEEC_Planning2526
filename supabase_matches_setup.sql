-- Script de création des tables pour les matchs dans Supabase
-- À exécuter dans l'éditeur SQL de Supabase

-- ===================================
-- Table VEEC_Equipe_FFVB (Équipes)
-- ===================================

CREATE TABLE IF NOT EXISTS VEEC_Equipe_FFVB (
  idequipe BIGSERIAL PRIMARY KEY,
  nom_equipe TEXT NOT NULL,
  categorie TEXT,
  niveau TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Activer RLS sur VEEC_Equipe_FFVB
ALTER TABLE VEEC_Equipe_FFVB ENABLE ROW LEVEL SECURITY;

-- Politique pour permettre la lecture publique
DROP POLICY IF EXISTS "Allow public read access on teams" ON VEEC_Equipe_FFVB;
CREATE POLICY "Allow public read access on teams" ON VEEC_Equipe_FFVB
  FOR SELECT
  USING (true);

-- ===================================
-- Table matches
-- ===================================

CREATE TABLE IF NOT EXISTS matches (
  id BIGSERIAL PRIMARY KEY,
  idequipe BIGINT NOT NULL REFERENCES VEEC_Equipe_FFVB(idequipe) ON DELETE CASCADE,
  date_match DATE NOT NULL,
  heure_match TEXT NOT NULL,
  adversaire TEXT NOT NULL,
  domicile BOOLEAN NOT NULL DEFAULT true,
  salle TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_matches_date ON matches(date_match);
CREATE INDEX IF NOT EXISTS idx_matches_equipe ON matches(idequipe);

-- Activer RLS sur matches
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;

-- Politique pour permettre la lecture publique
DROP POLICY IF EXISTS "Allow public read access on matches" ON matches;
CREATE POLICY "Allow public read access on matches" ON matches
  FOR SELECT
  USING (true);

-- ===================================
-- Triggers pour updated_at
-- ===================================

-- Fonction pour mettre à jour automatiquement updated_at (si elle n'existe pas déjà)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc'::text, NOW());
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger pour VEEC_Equipe_FFVB
DROP TRIGGER IF EXISTS update_teams_updated_at ON VEEC_Equipe_FFVB;
CREATE TRIGGER update_teams_updated_at
  BEFORE UPDATE ON VEEC_Equipe_FFVB
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger pour matches
DROP TRIGGER IF EXISTS update_matches_updated_at ON matches;
CREATE TRIGGER update_matches_updated_at
  BEFORE UPDATE ON matches
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ===================================
-- Données d'exemple (optionnel)
-- ===================================

-- Insertion d'équipes d'exemple
INSERT INTO VEEC_Equipe_FFVB (nom_equipe, categorie, niveau) VALUES
  ('SM1', 'Seniors Masculins', 'Régionale 1'),
  ('SF1', 'Seniors Féminines', 'Régionale 1'),
  ('SM2', 'Seniors Masculins', 'Régionale 2'),
  ('SF2', 'Seniors Féminines', 'Régionale 2'),
  ('M18G1', 'Minimes 18 Garçons', 'Départemental'),
  ('M18F1', 'Minimes 18 Filles', 'Départemental')
ON CONFLICT (idequipe) DO NOTHING;

-- Insertion de matchs d'exemple
INSERT INTO matches (idequipe, date_match, heure_match, adversaire, domicile, salle) VALUES
  (1, '2025-11-15', '20:00', 'PARIS VB', true, 'Gymnase Coupvray'),
  (1, '2025-11-22', '15:00', 'MELUN VB', false, 'Gymnase Melun'),
  (2, '2025-11-16', '18:00', 'TORCY VB', true, 'Gymnase Chessy'),
  (2, '2025-11-23', '20:30', 'LAGNY VB', false, 'Gymnase Lagny'),
  (3, '2025-11-17', '19:00', 'CHELLES VB', true, 'Gymnase Coupvray')
ON CONFLICT (id) DO NOTHING;

-- Afficher un résumé
SELECT 'Tables créées avec succès!' as message;
SELECT COUNT(*) as nb_equipes FROM VEEC_Equipe_FFVB;
SELECT COUNT(*) as nb_matches FROM matches;
