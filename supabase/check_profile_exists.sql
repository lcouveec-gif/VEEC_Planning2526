-- Vérifier que le profil existe vraiment
SELECT 
  id,
  user_id,
  email,
  role,
  nom,
  prenom,
  created_at
FROM veec_profiles
WHERE user_id = '44aeb5f7-8f6c-47bd-a7b9-89a5fb00ea75';

-- Vérifier RLS
SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'veec_profiles';

-- Réactiver RLS (au cas où)
ALTER TABLE veec_profiles ENABLE ROW LEVEL SECURITY;
