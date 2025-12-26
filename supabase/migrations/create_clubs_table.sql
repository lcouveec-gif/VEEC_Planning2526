-- ========================================
-- Table des clubs de volley avec leurs logos
-- ========================================

-- Créer la table des clubs
CREATE TABLE IF NOT EXISTS clubs (
  code_club TEXT PRIMARY KEY, -- Code à 7 positions (ex: 0775819)
  nom TEXT NOT NULL, -- Nom complet du club (sans numéro d'équipe)
  nom_court TEXT, -- Nom court/abréviation
  ville TEXT,
  logo_url TEXT, -- URL du logo dans Supabase Storage (ex: bucket/0775819.png)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Créer un index sur le nom pour la recherche
CREATE INDEX IF NOT EXISTS idx_clubs_nom ON clubs(nom);
CREATE INDEX IF NOT EXISTS idx_clubs_ville ON clubs(ville);
CREATE INDEX IF NOT EXISTS idx_clubs_code ON clubs(code_club);

-- Ajouter des commentaires
COMMENT ON TABLE clubs IS 'Liste des clubs de volley avec leurs logos';
COMMENT ON COLUMN clubs.code_club IS 'Code unique du club à 7 positions (ex: 0775819)';
COMMENT ON COLUMN clubs.nom IS 'Nom complet du club sans numéro d''équipe';
COMMENT ON COLUMN clubs.nom_court IS 'Nom court ou abréviation du club';
COMMENT ON COLUMN clubs.ville IS 'Ville du club';
COMMENT ON COLUMN clubs.logo_url IS 'URL du logo dans Supabase Storage (nom fichier: code_club.png)';

-- Créer le bucket de stockage pour les logos (si pas déjà créé)
-- Note: Cette opération doit être faite via l'interface Supabase ou l'API
-- INSERT INTO storage.buckets (id, name, public) VALUES ('club-logos', 'club-logos', true)
-- ON CONFLICT (id) DO NOTHING;

-- Politique RLS pour la table clubs
ALTER TABLE clubs ENABLE ROW LEVEL SECURITY;

-- Permettre la lecture à tous (y compris invités)
CREATE POLICY "Lecture publique des clubs"
  ON clubs
  FOR SELECT
  TO public
  USING (true);

-- Permettre l'insertion/modification/suppression aux admin et entraineurs
CREATE POLICY "Admin et entraineurs peuvent gérer les clubs"
  ON clubs
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM veec_profiles
      WHERE veec_profiles.id = auth.uid()
      AND veec_profiles.role IN ('admin', 'entraineur')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM veec_profiles
      WHERE veec_profiles.id = auth.uid()
      AND veec_profiles.role IN ('admin', 'entraineur')
    )
  );

-- Trigger pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_clubs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER clubs_updated_at
  BEFORE UPDATE ON clubs
  FOR EACH ROW
  EXECUTE FUNCTION update_clubs_updated_at();

-- Message de succès
DO $$
BEGIN
  RAISE NOTICE '✅ Table clubs créée avec succès';
  RAISE NOTICE 'ℹ️  N''oubliez pas de créer le bucket "club-logos" dans Supabase Storage';
END $$;
