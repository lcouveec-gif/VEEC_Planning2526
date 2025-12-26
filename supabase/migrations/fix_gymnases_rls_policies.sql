-- ========================================
-- Corriger les politiques RLS pour les gymnases
-- ========================================

-- Supprimer l'ancienne politique
DROP POLICY IF EXISTS "Admin et entraineurs peuvent gérer les gymnases" ON gymnases;

-- Créer les nouvelles politiques séparées

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

-- Message de succès
DO $$
BEGIN
  RAISE NOTICE '✅ Politiques RLS corrigées pour la table gymnases';
END $$;
