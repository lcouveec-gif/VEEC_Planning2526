-- ========================================
-- INSTALLATION COMPLÈTE - VEEC PLANNING AUTH
-- ========================================
-- Ce script combine TOUT ce dont vous avez besoin
-- Exécutez-le dans Supabase > SQL Editor

-- ========================================
-- ÉTAPE 1 : CRÉER LA TABLE
-- ========================================

CREATE TABLE IF NOT EXISTS veec_profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'entraineur', 'user')),
  nom TEXT,
  prenom TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Contraintes
  UNIQUE(user_id),
  UNIQUE(email)
);

-- ========================================
-- ÉTAPE 2 : CRÉER LES INDEX
-- ========================================

CREATE INDEX IF NOT EXISTS idx_veec_profiles_user_id ON veec_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_veec_profiles_email ON veec_profiles(email);
CREATE INDEX IF NOT EXISTS idx_veec_profiles_role ON veec_profiles(role);

-- ========================================
-- ÉTAPE 3 : ACTIVER RLS
-- ========================================

ALTER TABLE veec_profiles ENABLE ROW LEVEL SECURITY;

-- ========================================
-- ÉTAPE 4 : SUPPRIMER LES ANCIENNES POLITIQUES (si elles existent)
-- ========================================

DROP POLICY IF EXISTS "Users can view own profile" ON veec_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON veec_profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON veec_profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON veec_profiles;
DROP POLICY IF EXISTS "Allow insert during signup" ON veec_profiles;

-- ========================================
-- ÉTAPE 5 : CRÉER LES POLITIQUES RLS CORRECTES
-- ========================================

-- Politique SELECT : Voir son propre profil
CREATE POLICY "Users can view own profile"
  ON veec_profiles
  FOR SELECT
  USING (auth.uid() = user_id);

-- Politique UPDATE : Modifier son profil (sauf rôle)
CREATE POLICY "Users can update own profile"
  ON veec_profiles
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND role = (SELECT role FROM veec_profiles WHERE user_id = auth.uid())
  );

-- Politique SELECT : Admins voient tout
CREATE POLICY "Admins can view all profiles"
  ON veec_profiles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM veec_profiles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Politique UPDATE : Admins modifient tout
CREATE POLICY "Admins can update all profiles"
  ON veec_profiles
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM veec_profiles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Politique INSERT : Créer son propre profil (CORRIGÉ)
-- ⚠️ IMPORTANT : auth.uid() = user_id (PAS "true")
CREATE POLICY "Allow insert during signup"
  ON veec_profiles
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ========================================
-- ÉTAPE 6 : CRÉER LA FONCTION UPDATED_AT
-- ========================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- ÉTAPE 7 : CRÉER LE TRIGGER
-- ========================================

DROP TRIGGER IF EXISTS update_veec_profiles_updated_at ON veec_profiles;

CREATE TRIGGER update_veec_profiles_updated_at
  BEFORE UPDATE ON veec_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- ÉTAPE 8 : AJOUTER LES COMMENTAIRES
-- ========================================

COMMENT ON TABLE veec_profiles IS 'Profils utilisateurs VEEC avec gestion des rôles';
COMMENT ON COLUMN veec_profiles.role IS 'Rôle : admin (tout), entraineur (tout sauf autorisations), user (lecture seule)';

-- ========================================
-- ÉTAPE 9 : VÉRIFICATION
-- ========================================

-- Afficher les politiques créées
SELECT
  policyname,
  cmd,
  CASE
    WHEN qual IS NOT NULL THEN 'USING: ' || qual
    ELSE ''
  END as using_clause,
  CASE
    WHEN with_check IS NOT NULL THEN 'WITH CHECK: ' || with_check
    ELSE ''
  END as with_check_clause
FROM pg_policies
WHERE tablename = 'veec_profiles'
ORDER BY cmd, policyname;

-- Message de succès
DO $$
BEGIN
  RAISE NOTICE '✅ Installation complète terminée !';
  RAISE NOTICE '';
  RAISE NOTICE 'Prochaines étapes :';
  RAISE NOTICE '1. Créez un compte via /login';
  RAISE NOTICE '2. Modifiez le rôle en "admin" dans cette table';
  RAISE NOTICE '3. Testez l''accès aux différentes sections';
END $$;
