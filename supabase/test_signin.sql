-- Script de test pour vérifier la connexion
-- À exécuter dans Supabase SQL Editor

-- 1. Vérifier que l'utilisateur existe
SELECT
  id,
  email,
  email_confirmed_at,
  confirmed_at,
  created_at
FROM auth.users
WHERE email = 'VOTRE_EMAIL_ICI';  -- Remplacez par votre email

-- 2. Vérifier que le profil existe
SELECT * FROM veec_profiles
WHERE email = 'VOTRE_EMAIL_ICI';  -- Remplacez par votre email

-- 3. Vérifier les politiques RLS
SELECT
  policyname,
  cmd,
  qual as using_clause,
  with_check
FROM pg_policies
WHERE tablename = 'veec_profiles'
ORDER BY cmd, policyname;
