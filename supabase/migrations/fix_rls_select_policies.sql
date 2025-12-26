-- ========================================
-- FIX: Politiques SELECT pour veec_profiles
-- ========================================
-- Ce script corrige les politiques SELECT qui bloquent le chargement du profil

-- 1. Supprimer les anciennes politiques SELECT
DROP POLICY IF EXISTS "Users can view own profile" ON veec_profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON veec_profiles;

-- 2. Créer une politique SELECT simple et efficace
-- Permet à TOUS les utilisateurs authentifiés de voir leur propre profil
CREATE POLICY "Users can view own profile"
  ON veec_profiles
  FOR SELECT
  USING (auth.uid() = user_id);

-- 3. Créer une politique SELECT pour les admins
-- Les admins peuvent voir tous les profils
CREATE POLICY "Admins can view all profiles"
  ON veec_profiles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM veec_profiles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- 4. Vérifier les politiques créées
SELECT
  policyname,
  cmd,
  qual as using_clause
FROM pg_policies
WHERE tablename = 'veec_profiles'
  AND cmd = 'SELECT'
ORDER BY policyname;

-- Message de succès
DO $$
BEGIN
  RAISE NOTICE '✅ Politiques SELECT corrigées !';
  RAISE NOTICE '';
  RAISE NOTICE 'Testez maintenant la connexion dans votre application.';
END $$;
