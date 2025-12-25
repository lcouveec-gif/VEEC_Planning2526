-- ============================================================
-- Script SQL pour ajouter les Foreign Keys dans Supabase
-- ============================================================
--
-- Ce script ajoute les contraintes de clés étrangères pour:
-- 1. Améliorer l'intégrité référentielle des données
-- 2. Permettre les JOINs automatiques via l'API Supabase
-- 3. Optimiser les performances du MCP Server
--
-- À exécuter dans: Supabase Dashboard > SQL Editor
-- ============================================================

-- ============================================================
-- 1. Foreign Key: VEEC_Collectifs.equipe_id → VEEC_Equipes_FFVB.IDEQUIPE
-- ============================================================
-- Permet de joindre automatiquement les collectifs avec leurs équipes
-- Si une équipe est supprimée, tous ses collectifs sont aussi supprimés (CASCADE)

-- D'abord, vérifier qu'il n'y a pas de valeurs orphelines
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM "VEEC_Collectifs" c
        LEFT JOIN "VEEC_Equipes_FFVB" e ON c.equipe_id = e."IDEQUIPE"
        WHERE e."IDEQUIPE" IS NULL
    ) THEN
        RAISE NOTICE 'ATTENTION: Il existe des collectifs avec des equipe_id qui ne correspondent à aucune équipe!';
        RAISE NOTICE 'Veuillez corriger ces données avant d''ajouter la contrainte.';
        RAISE EXCEPTION 'Données orphelines détectées';
    END IF;
END $$;

-- Supprimer la contrainte si elle existe déjà (pour ré-exécution du script)
ALTER TABLE "VEEC_Collectifs"
DROP CONSTRAINT IF EXISTS "fk_collectifs_equipe";

-- Ajouter la contrainte de clé étrangère
ALTER TABLE "VEEC_Collectifs"
ADD CONSTRAINT "fk_collectifs_equipe"
FOREIGN KEY (equipe_id)
REFERENCES "VEEC_Equipes_FFVB"("IDEQUIPE")
ON DELETE CASCADE
ON UPDATE CASCADE;

-- Créer un index pour optimiser les requêtes
CREATE INDEX IF NOT EXISTS "idx_collectifs_equipe_id"
ON "VEEC_Collectifs"(equipe_id);

COMMENT ON CONSTRAINT "fk_collectifs_equipe" ON "VEEC_Collectifs" IS
'RelationMany-to-One: Un collectif appartient à une équipe. Si l''équipe est supprimée, le collectif est supprimé aussi.';


-- ============================================================
-- 2. Foreign Key: VEEC_Collectifs.licencie_id → VEEC_Licencie.id
-- ============================================================
-- Permet de joindre automatiquement les collectifs avec les licenciés
-- Si un licencié est supprimé, toutes ses participations aux collectifs sont supprimées

-- Vérifier qu'il n'y a pas de valeurs orphelines
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM "VEEC_Collectifs" c
        LEFT JOIN "VEEC_Licencie" l ON c.licencie_id = l.id
        WHERE l.id IS NULL
    ) THEN
        RAISE NOTICE 'ATTENTION: Il existe des collectifs avec des licencie_id qui ne correspondent à aucun licencié!';
        RAISE NOTICE 'Veuillez corriger ces données avant d''ajouter la contrainte.';
        RAISE EXCEPTION 'Données orphelines détectées';
    END IF;
END $$;

-- Supprimer la contrainte si elle existe déjà
ALTER TABLE "VEEC_Collectifs"
DROP CONSTRAINT IF EXISTS "fk_collectifs_licencie";

-- Ajouter la contrainte de clé étrangère
ALTER TABLE "VEEC_Collectifs"
ADD CONSTRAINT "fk_collectifs_licencie"
FOREIGN KEY (licencie_id)
REFERENCES "VEEC_Licencie"(id)
ON DELETE CASCADE
ON UPDATE CASCADE;

-- Créer un index pour optimiser les requêtes
CREATE INDEX IF NOT EXISTS "idx_collectifs_licencie_id"
ON "VEEC_Collectifs"(licencie_id);

COMMENT ON CONSTRAINT "fk_collectifs_licencie" ON "VEEC_Collectifs" IS
'Relation Many-to-One: Un collectif contient un licencié. Un licencié peut être dans plusieurs collectifs (équipes différentes).';


-- ============================================================
-- 3. Foreign Key: matches.idequipe → VEEC_Equipes_FFVB.IDEQUIPE
-- ============================================================
-- Permet de joindre automatiquement les matchs avec leurs équipes
-- Si une équipe est supprimée, on garde les matchs mais on met idequipe à NULL (historique)

-- Vérifier qu'il n'y a pas de valeurs orphelines
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM matches m
        LEFT JOIN "VEEC_Equipes_FFVB" e ON m.idequipe = e."IDEQUIPE"
        WHERE m.idequipe IS NOT NULL AND e."IDEQUIPE" IS NULL
    ) THEN
        RAISE NOTICE 'ATTENTION: Il existe des matchs avec des idequipe qui ne correspondent à aucune équipe!';
        RAISE NOTICE 'Veuillez corriger ces données avant d''ajouter la contrainte.';
        RAISE EXCEPTION 'Données orphelines détectées';
    END IF;
END $$;

-- Supprimer la contrainte si elle existe déjà
ALTER TABLE matches
DROP CONSTRAINT IF EXISTS "fk_matches_equipe";

-- Ajouter la contrainte de clé étrangère
ALTER TABLE matches
ADD CONSTRAINT "fk_matches_equipe"
FOREIGN KEY (idequipe)
REFERENCES "VEEC_Equipes_FFVB"("IDEQUIPE")
ON DELETE SET NULL  -- Garder l'historique des matchs même si l'équipe est supprimée
ON UPDATE CASCADE;

-- Créer un index pour optimiser les requêtes
CREATE INDEX IF NOT EXISTS "idx_matches_idequipe"
ON matches(idequipe);

COMMENT ON CONSTRAINT "fk_matches_equipe" ON matches IS
'Relation Many-to-One: Un match appartient à une équipe. Si l''équipe est supprimée, on garde le match mais idequipe devient NULL.';


-- ============================================================
-- 4. BONUS: Ajouter des colonnes manquantes dans matches pour cohérence
-- ============================================================
-- Note: Ces colonnes existent déjà selon l'analyse, mais on les documente ici

-- Vérifier que les colonnes essentielles existent
DO $$
BEGIN
    -- Ajouter Competition si elle n'existe pas
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'matches' AND column_name = 'Competition'
    ) THEN
        ALTER TABLE matches ADD COLUMN "Competition" TEXT;
        RAISE NOTICE 'Colonne Competition ajoutée';
    END IF;

    -- Ajouter Domicile_Exterieur si elle n'existe pas
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'matches' AND column_name = 'Domicile_Exterieur'
    ) THEN
        ALTER TABLE matches ADD COLUMN "Domicile_Exterieur" TEXT;
        RAISE NOTICE 'Colonne Domicile_Exterieur ajoutée';
    END IF;

    -- Ajouter Equipe_1 si elle n'existe pas
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'matches' AND column_name = 'Equipe_1'
    ) THEN
        ALTER TABLE matches ADD COLUMN "Equipe_1" TEXT;
        RAISE NOTICE 'Colonne Equipe_1 ajoutée';
    END IF;

    -- Ajouter Equipe_2 si elle n'existe pas
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'matches' AND column_name = 'Equipe_2'
    ) THEN
        ALTER TABLE matches ADD COLUMN "Equipe_2" TEXT;
        RAISE NOTICE 'Colonne Equipe_2 ajoutée';
    END IF;
END $$;


-- ============================================================
-- 5. Vérification finale
-- ============================================================
-- Afficher toutes les foreign keys créées
SELECT
    tc.table_name,
    tc.constraint_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    rc.update_rule,
    rc.delete_rule
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
JOIN information_schema.referential_constraints AS rc
    ON tc.constraint_name = rc.constraint_name
    AND tc.table_schema = rc.constraint_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema = 'public'
    AND tc.table_name IN ('VEEC_Collectifs', 'matches')
ORDER BY tc.table_name, tc.constraint_name;


-- ============================================================
-- 6. Test des JOINs automatiques
-- ============================================================
-- Maintenant vous pouvez utiliser ces requêtes dans le MCP Server:

-- Test 1: Collectifs avec équipe et licencié (JOIN automatique)
-- SELECT
--     c.*,
--     e.*,
--     l.*
-- FROM "VEEC_Collectifs" c
-- LEFT JOIN "VEEC_Equipes_FFVB" e ON c.equipe_id = e."IDEQUIPE"
-- LEFT JOIN "VEEC_Licencie" l ON c.licencie_id = l.id
-- WHERE e."IDEQUIPE" = 'SM4';

-- Test 2: Matchs avec équipe (JOIN automatique)
-- SELECT
--     m.*,
--     e.*
-- FROM matches m
-- LEFT JOIN "VEEC_Equipes_FFVB" e ON m.idequipe = e."IDEQUIPE"
-- WHERE e."IDEQUIPE" = 'SM4';

-- ============================================================
-- FIN DU SCRIPT
-- ============================================================
--
-- Résumé des améliorations:
-- ✅ Intégrité référentielle garantie
-- ✅ JOINs automatiques dans l'API Supabase
-- ✅ Performances optimisées avec les index
-- ✅ Protection contre les suppressions accidentelles (CASCADE/SET NULL)
--
-- Prochaine étape:
-- Modifier le code MCP Server pour utiliser les JOINs automatiques
-- ============================================================
