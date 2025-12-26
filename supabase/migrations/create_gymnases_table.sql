-- ========================================
-- Table des gymnases avec leurs adresses
-- ========================================

-- Créer la table des gymnases
CREATE TABLE IF NOT EXISTS gymnases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nom TEXT NOT NULL UNIQUE, -- Nom du gymnase (depuis le champ Salle)
  code_club TEXT, -- Code du club propriétaire (7 positions, ex: 0775819) - optionnel
  adresse TEXT, -- Adresse complète
  ville TEXT, -- Ville
  code_postal TEXT, -- Code postal
  latitude DECIMAL(10, 8), -- Latitude pour Google Maps
  longitude DECIMAL(11, 8), -- Longitude pour Google Maps
  notes TEXT, -- Notes supplémentaires
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  FOREIGN KEY (code_club) REFERENCES clubs(code_club) ON DELETE SET NULL
);

-- Créer des index pour la recherche
CREATE INDEX IF NOT EXISTS idx_gymnases_nom ON gymnases(nom);
CREATE INDEX IF NOT EXISTS idx_gymnases_ville ON gymnases(ville);
CREATE INDEX IF NOT EXISTS idx_gymnases_code_postal ON gymnases(code_postal);
CREATE INDEX IF NOT EXISTS idx_gymnases_code_club ON gymnases(code_club);

-- Ajouter des commentaires
COMMENT ON TABLE gymnases IS 'Liste des gymnases avec leurs adresses et coordonnées GPS';
COMMENT ON COLUMN gymnases.nom IS 'Nom du gymnase (extrait du champ Salle des matchs)';
COMMENT ON COLUMN gymnases.code_club IS 'Code du club propriétaire du gymnase (optionnel, extrait de EQA_no si horaire != 00:00)';
COMMENT ON COLUMN gymnases.adresse IS 'Adresse complète du gymnase';
COMMENT ON COLUMN gymnases.latitude IS 'Latitude GPS pour affichage sur Google Maps';
COMMENT ON COLUMN gymnases.longitude IS 'Longitude GPS pour affichage sur Google Maps';

-- Politique RLS pour la table gymnases
ALTER TABLE gymnases ENABLE ROW LEVEL SECURITY;

-- Permettre la lecture à tous (y compris invités)
CREATE POLICY "Lecture publique des gymnases"
  ON gymnases
  FOR SELECT
  TO public
  USING (true);

-- Permettre l'insertion aux admin et entraineurs
CREATE POLICY "Admin et entraineurs peuvent créer des gymnases"
  ON gymnases
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM veec_profiles
      WHERE veec_profiles.user_id = auth.uid()
      AND veec_profiles.role IN ('admin', 'entraineur')
    )
  );

-- Permettre la modification aux admin et entraineurs
CREATE POLICY "Admin et entraineurs peuvent modifier des gymnases"
  ON gymnases
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM veec_profiles
      WHERE veec_profiles.user_id = auth.uid()
      AND veec_profiles.role IN ('admin', 'entraineur')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM veec_profiles
      WHERE veec_profiles.user_id = auth.uid()
      AND veec_profiles.role IN ('admin', 'entraineur')
    )
  );

-- Permettre la suppression aux admin et entraineurs
CREATE POLICY "Admin et entraineurs peuvent supprimer des gymnases"
  ON gymnases
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM veec_profiles
      WHERE veec_profiles.user_id = auth.uid()
      AND veec_profiles.role IN ('admin', 'entraineur')
    )
  );

-- Trigger pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_gymnases_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER gymnases_updated_at
  BEFORE UPDATE ON gymnases
  FOR EACH ROW
  EXECUTE FUNCTION update_gymnases_updated_at();

-- Message de succès
DO $$
BEGIN
  RAISE NOTICE '✅ Table gymnases créée avec succès';
END $$;
