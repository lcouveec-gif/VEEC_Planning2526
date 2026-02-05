-- Test de SELECT en tant qu'utilisateur authentifié
-- Pour tester, utilisez la fonction set_config pour simuler une session

-- 1. Vérifier que le profil existe
SELECT * FROM veec_profiles
WHERE user_id = '44aeb5f7-8f6c-47bd-a7b9-89a5fb00ea75';

-- 2. Simuler une session utilisateur et tester RLS
-- IMPORTANT: Remplacez le JWT ci-dessous par votre vrai access_token
-- Vous pouvez le trouver dans le localStorage de votre navigateur
-- ou dans la réponse Network que vous m'avez envoyée

-- Pour le moment, testons sans RLS pour voir si le profil existe
SET LOCAL "request.jwt.claims" TO '{"sub":"44aeb5f7-8f6c-47bd-a7b9-89a5fb00ea75"}';
SET LOCAL ROLE authenticated;

SELECT * FROM veec_profiles
WHERE user_id = '44aeb5f7-8f6c-47bd-a7b9-89a5fb00ea75';

-- 3. Réinitialiser
RESET ROLE;
