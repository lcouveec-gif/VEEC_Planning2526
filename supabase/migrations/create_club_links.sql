-- ========================================
-- TABLE CLUB_LINKS - Gestion des liens du club
-- ========================================

-- Créer la table
CREATE TABLE IF NOT EXISTS club_links (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  category TEXT NOT NULL CHECK (category IN ('site_web', 'reseaux_sociaux', 'documents', 'autres')),
  title TEXT NOT NULL,
  description TEXT,
  url TEXT NOT NULL,
  icon TEXT, -- Emoji ou nom d'icône
  display_order INTEGER DEFAULT 0,
  is_visible BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour optimiser les requêtes
CREATE INDEX IF NOT EXISTS idx_club_links_category ON club_links(category);
CREATE INDEX IF NOT EXISTS idx_club_links_visible ON club_links(is_visible);
CREATE INDEX IF NOT EXISTS idx_club_links_order ON club_links(display_order);

-- Activer RLS
ALTER TABLE club_links ENABLE ROW LEVEL SECURITY;

-- Politique SELECT : Tout le monde peut voir les liens visibles
CREATE POLICY "Anyone can view visible links"
  ON club_links
  FOR SELECT
  USING (is_visible = true OR auth.uid() IS NOT NULL);

-- Politique INSERT : Seuls admin et entraineur peuvent ajouter des liens
CREATE POLICY "Admins and trainers can insert links"
  ON club_links
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM veec_profiles
      WHERE user_id = auth.uid() AND role IN ('admin', 'entraineur')
    )
  );

-- Politique UPDATE : Seuls admin et entraineur peuvent modifier des liens
CREATE POLICY "Admins and trainers can update links"
  ON club_links
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM veec_profiles
      WHERE user_id = auth.uid() AND role IN ('admin', 'entraineur')
    )
  );

-- Politique DELETE : Seuls admin et entraineur peuvent supprimer des liens
CREATE POLICY "Admins and trainers can delete links"
  ON club_links
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM veec_profiles
      WHERE user_id = auth.uid() AND role IN ('admin', 'entraineur')
    )
  );

-- Trigger pour updated_at
CREATE TRIGGER update_club_links_updated_at
  BEFORE UPDATE ON club_links
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insérer les liens initiaux basés sur https://valdeurope-volley.fr/
INSERT INTO club_links (category, title, description, url, icon, display_order, is_visible) VALUES
  -- Site web
  ('site_web', 'Site officiel', 'Site internet du club FSVECV', 'https://valdeurope-volley.fr/', '🏐', 1, true),

  -- Réseaux sociaux
  ('reseaux_sociaux', 'Facebook', 'Suivez-nous sur Facebook', 'https://www.facebook.com/fsvecv', '📘', 2, true),
  ('reseaux_sociaux', 'Instagram', 'Suivez-nous sur Instagram', 'https://www.instagram.com/fsvecv/', '📷', 3, true),
  ('reseaux_sociaux', 'YouTube', 'Notre chaîne YouTube', 'https://www.youtube.com/@fsvecv', '🎥', 4, true),

  -- Documents
  ('documents', 'Newsletter', 'Newsletter du club', 'https://valdeurope-volley.fr/newsletter', '📰', 5, true),
  ('documents', 'Contact', 'Nous contacter', 'https://valdeurope-volley.fr/contact', '✉️', 6, true)
ON CONFLICT DO NOTHING;

-- Message de succès
DO $$
BEGIN
  RAISE NOTICE '✅ Table club_links créée avec succès !';
  RAISE NOTICE 'Liens initiaux insérés depuis valdeurope-volley.fr';
END $$;
