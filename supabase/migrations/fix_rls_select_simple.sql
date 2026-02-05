-- ========================================
-- FIX SIMPLE: Une seule politique SELECT
-- ========================================
-- Approche minimaliste pour éliminer la référence circulaire

-- 1. Supprimer TOUTES les politiques SELECT existantes
DROP POLICY IF EXISTS "Users can view own profile" ON veec_profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON veec_profiles;
DROP POLICY IF EXISTS "Allow profile access" ON veec_profiles;

-- 2. Créer UNE SEULE politique ultra-simple
-- Chaque utilisateur peut UNIQUEMENT voir son propre profil
-- (Les admins pourront voir les autres via une fonction ou une politique RLS différente plus tard)
CREATE POLICY "Users can read own profile"
  ON veec_profiles
  FOR SELECT
  USING (auth.uid() = user_id);

-- 3. Vérifier la politique
SELECT
  policyname,
  cmd,
  qual as using_clause
FROM pg_policies
WHERE tablename = 'veec_profiles'
ORDER BY cmd, policyname;

-- Message de succès
DO $$
BEGIN
  RAISE NOTICE '✅ Politique SELECT simplifiée créée !';
  RAISE NOTICE 'Chaque utilisateur peut maintenant voir son propre profil.';
  RAISE NOTICE '';
  RAISE NOTICE 'Rechargez l''application et testez.';
END $$;
