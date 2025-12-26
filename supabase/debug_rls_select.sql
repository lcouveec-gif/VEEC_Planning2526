-- Script de diagnostic pour les politiques SELECT
-- À exécuter dans Supabase SQL Editor

-- 1. Vérifier toutes les politiques SELECT
SELECT
  policyname,
  cmd,
  qual as using_clause,
  with_check
FROM pg_policies
WHERE tablename = 'veec_profiles'
  AND cmd = 'SELECT'
ORDER BY policyname;

-- 2. Tester SELECT en tant qu'utilisateur authentifié
-- Remplacez 'VOTRE_USER_ID' par votre ID utilisateur
SELECT * FROM veec_profiles
WHERE user_id = '44aeb5f7-8f6c-47bd-a7b9-89a5fb00ea75';

-- 3. Vérifier que auth.uid() fonctionne
SELECT auth.uid() as current_user_id;
