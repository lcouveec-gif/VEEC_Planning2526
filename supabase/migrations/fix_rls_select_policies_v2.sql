-- ========================================
-- FIX V2: Politiques SELECT pour veec_profiles
-- ========================================
-- Supprime la référence circulaire en fusionnant les politiques

-- 1. Supprimer TOUTES les anciennes politiques SELECT
DROP POLICY IF EXISTS "Users can view own profile" ON veec_profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON veec_profiles;

-- 2. Créer UNE SEULE politique SELECT combinée
-- Permet aux utilisateurs de voir leur propre profil
-- ET permet aux admins de voir tous les profils
CREATE POLICY "Allow profile access"
  ON veec_profiles
  FOR SELECT
  USING (
    -- L'utilisateur peut voir son propre profil
    auth.uid() = user_id
    OR
    -- OU l'utilisateur est admin (vérifie dans sa propre ligne)
    (
      user_id = auth.uid() AND role = 'admin'
    )
    OR
    -- OU il existe une ligne où cet utilisateur est admin
    EXISTS (
      SELECT 1 FROM veec_profiles AS admin_check
      WHERE admin_check.user_id = auth.uid()
        AND admin_check.role = 'admin'
        AND veec_profiles.user_id != auth.uid()
    )
  );

-- 3. Vérifier la politique créée
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
  RAISE NOTICE '✅ Politique SELECT fusionnée créée !';
  RAISE NOTICE '';
  RAISE NOTICE 'Rechargez l''application et testez la connexion.';
END $$;
