-- Script pour corriger TOUTES les politiques RLS des tables personnalisées
-- À exécuter dans l'éditeur SQL de Supabase
-- Ce script résout les erreurs 406 (Not Acceptable)

-- ========================================
-- VEEC_Match_Positions
-- ========================================

-- Supprimer TOUTES les anciennes politiques (peu importe leur nom)
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'VEEC_Match_Positions') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON "VEEC_Match_Positions"';
    END LOOP;
END $$;

-- S'assurer que RLS est activé
ALTER TABLE "VEEC_Match_Positions" ENABLE ROW LEVEL SECURITY;

-- Recréer les politiques pour anon et authenticated
CREATE POLICY "Allow anon read access to match positions"
ON "VEEC_Match_Positions"
FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Allow anon insert access to match positions"
ON "VEEC_Match_Positions"
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Allow anon update access to match positions"
ON "VEEC_Match_Positions"
FOR UPDATE
TO anon, authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow anon delete access to match positions"
ON "VEEC_Match_Positions"
FOR DELETE
TO anon, authenticated
USING (true);

-- ========================================
-- VEEC_Collectifs
-- ========================================

-- Supprimer TOUTES les anciennes politiques (peu importe leur nom)
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'VEEC_Collectifs') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON "VEEC_Collectifs"';
    END LOOP;
END $$;

-- S'assurer que RLS est activé
ALTER TABLE "VEEC_Collectifs" ENABLE ROW LEVEL SECURITY;

-- Recréer les politiques pour anon et authenticated
CREATE POLICY "Allow anon read access to collectifs"
ON "VEEC_Collectifs"
FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Allow anon insert access to collectifs"
ON "VEEC_Collectifs"
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Allow anon update access to collectifs"
ON "VEEC_Collectifs"
FOR UPDATE
TO anon, authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow anon delete access to collectifs"
ON "VEEC_Collectifs"
FOR DELETE
TO anon, authenticated
USING (true);

-- ========================================
-- Vérification
-- ========================================

-- Cette requête vous permet de vérifier que les politiques sont bien créées
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('VEEC_Match_Positions', 'VEEC_Collectifs')
ORDER BY tablename, cmd;
