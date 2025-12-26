-- ========================================
-- RÉACTIVER RLS sur veec_profiles
-- ========================================

-- Réactiver RLS
ALTER TABLE veec_profiles ENABLE ROW LEVEL SECURITY;

-- Vérifier que RLS est activé
SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'veec_profiles';

-- Vérifier les politiques actives
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
  RAISE NOTICE '✅ RLS RÉACTIVÉ sur veec_profiles';
  RAISE NOTICE '';
  RAISE NOTICE 'Votre base de données est maintenant sécurisée.';
  RAISE NOTICE 'Testez la connexion pour vous assurer que tout fonctionne.';
END $$;
