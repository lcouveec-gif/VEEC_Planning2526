-- Script de réparation des politiques RLS pour veec_profiles
-- À exécuter si vous avez des problèmes d'insertion lors de l'inscription

-- 1. Supprimer l'ancienne politique d'insertion si elle existe
DROP POLICY IF EXISTS "Allow insert during signup" ON veec_profiles;

-- 2. Créer la nouvelle politique d'insertion correcte
-- L'utilisateur authentifié peut créer SON PROPRE profil
CREATE POLICY "Allow insert during signup"
  ON veec_profiles
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Vérifier que RLS est bien activé
ALTER TABLE veec_profiles ENABLE ROW LEVEL SECURITY;

-- Afficher toutes les politiques actuelles (pour vérification)
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'veec_profiles';
