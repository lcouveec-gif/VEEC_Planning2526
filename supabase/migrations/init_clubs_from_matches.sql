-- ========================================
-- Initialiser les clubs depuis la table des matchs
-- ========================================

-- Fonction pour nettoyer le nom du club (retirer les numéros d'équipe)
-- Exemple: "VOLLEY CLUB PARIS 1" -> "VOLLEY CLUB PARIS"
--          "ASV NANTERRE 2" -> "ASV NANTERRE"
CREATE OR REPLACE FUNCTION clean_club_name(full_name TEXT)
RETURNS TEXT AS $$
BEGIN
  -- Retirer les nombres à la fin du nom (ex: " 1", " 2", " 3", etc.)
  RETURN TRIM(REGEXP_REPLACE(full_name, '\s+\d+$', '', 'g'));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Fonction pour extraire le code club depuis le numéro complet
-- Exemple: "07758191" (8 positions) -> "0775819" (7 premières positions)
--          "0775819" (7 positions) -> "0775819"
CREATE OR REPLACE FUNCTION extract_club_code(numero TEXT)
RETURNS TEXT AS $$
BEGIN
  -- Si NULL ou vide, retourner NULL
  IF numero IS NULL OR numero = '' THEN
    RETURN NULL;
  END IF;

  -- Prendre les 7 premiers caractères
  RETURN SUBSTRING(numero, 1, 7);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Créer une vue temporaire avec tous les clubs uniques (EQA + EQB)
WITH all_clubs_raw AS (
  -- Clubs depuis les équipes A
  SELECT DISTINCT
    extract_club_code("EQA_no") as code_club,
    clean_club_name("EQA_nom") as nom
  FROM "matches"
  WHERE "EQA_no" IS NOT NULL
    AND "EQA_no" != ''
    AND extract_club_code("EQA_no") IS NOT NULL

  UNION

  -- Clubs depuis les équipes B
  SELECT DISTINCT
    extract_club_code("EQB_no") as code_club,
    clean_club_name("EQB_nom") as nom
  FROM "matches"
  WHERE "EQB_no" IS NOT NULL
    AND "EQB_no" != ''
    AND extract_club_code("EQB_no") IS NOT NULL
),
-- Regrouper par code_club pour éviter les doublons (prendre le premier nom)
all_clubs AS (
  SELECT
    code_club,
    MIN(nom) as nom
  FROM all_clubs_raw
  GROUP BY code_club
)
-- Insérer tous les clubs uniques en une seule fois
INSERT INTO clubs (code_club, nom, logo_url)
SELECT
  code_club,
  nom,
  'https://placeholder.supabase.co/storage/v1/object/public/club-logos/' || code_club || '.png' as logo_url
FROM all_clubs
ON CONFLICT (code_club)
DO UPDATE SET
  nom = EXCLUDED.nom,
  updated_at = NOW();

-- Mettre à jour les URL des logos avec la vraie URL Supabase
-- IMPORTANT: Remplacer 'placeholder.supabase.co' par votre vraie URL de projet Supabase
-- Exemple: https://abcdefghijk.supabase.co
UPDATE clubs
SET logo_url = REPLACE(logo_url, 'placeholder.supabase.co', '[VOTRE-PROJET].supabase.co')
WHERE logo_url LIKE '%placeholder.supabase.co%';

-- Afficher le résultat
DO $$
DECLARE
  club_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO club_count FROM clubs;
  RAISE NOTICE '✅ Initialisation terminée : % clubs importés depuis les matchs', club_count;
  RAISE NOTICE 'ℹ️  N''oubliez pas de remplacer [VOTRE-PROJET] par votre URL Supabase dans le script';
  RAISE NOTICE 'ℹ️  Les logos seront disponibles une fois que vous aurez uploadé les fichiers PNG avec le format: code_club.png';
END $$;

-- Afficher quelques exemples de clubs créés
SELECT
  code_club,
  nom,
  logo_url
FROM clubs
ORDER BY code_club
LIMIT 10;
