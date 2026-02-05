-- ========================================
-- Initialiser les gymnases depuis la table des matchs
-- ========================================

-- Fonction pour extraire le code club (réutilise celle des clubs)
CREATE OR REPLACE FUNCTION extract_club_code(numero TEXT)
RETURNS TEXT AS $$
BEGIN
  IF numero IS NULL OR numero = '' THEN
    RETURN NULL;
  END IF;
  RETURN SUBSTRING(numero, 1, 7);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Insérer tous les gymnases uniques depuis le champ Salle
-- Avec code_club extrait de EQA_no UNIQUEMENT si l'horaire n'est pas 00:00 (plateaux exclus)
WITH gymnases_uniques AS (
  SELECT DISTINCT
    TRIM("Salle") as nom,
    -- Extraire code_club seulement si ce n'est pas un plateau (horaire != 00:00)
    CASE
      WHEN "Heure" IS NOT NULL
        AND "Heure"::TEXT NOT LIKE '00:00%'
        AND "EQA_no" IS NOT NULL
      THEN extract_club_code("EQA_no")
      ELSE NULL
    END as code_club
  FROM "matches"
  WHERE "Salle" IS NOT NULL
    AND TRIM("Salle") != ''
    AND TRIM("Salle") != '-'
    AND TRIM("Salle") NOT ILIKE '%à définir%'
    AND TRIM("Salle") NOT ILIKE '%TBD%'
),
-- Regrouper par nom de gymnase et prendre le code_club le plus fréquent (mode)
gymnases_with_club AS (
  SELECT
    nom,
    -- Prendre le premier code_club non-null (s'il existe)
    MIN(code_club) FILTER (WHERE code_club IS NOT NULL) as code_club
  FROM gymnases_uniques
  GROUP BY nom
)
INSERT INTO gymnases (nom, code_club)
SELECT
  nom,
  code_club
FROM gymnases_with_club
ON CONFLICT (nom)
DO UPDATE SET
  code_club = COALESCE(EXCLUDED.code_club, gymnases.code_club),
  updated_at = NOW();

-- Afficher le résultat
DO $$
DECLARE
  gymnase_count INTEGER;
  gymnase_with_club_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO gymnase_count FROM gymnases;
  SELECT COUNT(*) INTO gymnase_with_club_count FROM gymnases WHERE code_club IS NOT NULL;
  RAISE NOTICE '✅ Initialisation terminée : % gymnases importés depuis les matchs', gymnase_count;
  RAISE NOTICE 'ℹ️  % gymnases ont un club propriétaire identifié', gymnase_with_club_count;
  RAISE NOTICE 'ℹ️  Vous pouvez maintenant ajouter les adresses via l''interface Admin → Gymnases';
END $$;

-- Afficher quelques exemples de gymnases créés
SELECT
  g.id,
  g.nom,
  g.code_club,
  c.nom as club_nom,
  g.adresse,
  g.ville
FROM gymnases g
LEFT JOIN clubs c ON g.code_club = c.code_club
ORDER BY g.nom
LIMIT 10;
