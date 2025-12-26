-- ⚠️ TEMPORAIRE: Désactiver RLS pour tester
-- À RÉACTIVER après le test !

-- Désactiver RLS sur veec_profiles
ALTER TABLE veec_profiles DISABLE ROW LEVEL SECURITY;

-- Message d'avertissement
DO $$
BEGIN
  RAISE NOTICE '⚠️ RLS DÉSACTIVÉ sur veec_profiles';
  RAISE NOTICE '';
  RAISE NOTICE 'Ceci est TEMPORAIRE pour diagnostiquer le problème.';
  RAISE NOTICE 'Rechargez l''application et testez la connexion.';
  RAISE NOTICE '';
  RAISE NOTICE 'Si ça fonctionne, le problème vient des politiques RLS.';
  RAISE NOTICE 'Si ça ne fonctionne pas, le problème est ailleurs (réseau, etc).';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️ N''OUBLIEZ PAS DE RÉACTIVER RLS après le test !';
  RAISE NOTICE 'Utilisez: ALTER TABLE veec_profiles ENABLE ROW LEVEL SECURITY;';
END $$;
