-- Script pour corriger les politiques RLS de VEEC_Collectifs
-- À exécuter dans l'éditeur SQL de Supabase

-- Supprimer les anciennes politiques si elles existent
DROP POLICY IF EXISTS "Allow public read access to collectifs" ON "VEEC_Collectifs";
DROP POLICY IF EXISTS "Allow public insert access to collectifs" ON "VEEC_Collectifs";
DROP POLICY IF EXISTS "Allow public update access to collectifs" ON "VEEC_Collectifs";
DROP POLICY IF EXISTS "Allow public delete access to collectifs" ON "VEEC_Collectifs";

-- S'assurer que RLS est activé
ALTER TABLE "VEEC_Collectifs" ENABLE ROW LEVEL SECURITY;

-- Recréer les politiques pour permettre l'accès public
CREATE POLICY "Allow public read access to collectifs"
ON "VEEC_Collectifs"
FOR SELECT
TO public
USING (true);

CREATE POLICY "Allow public insert access to collectifs"
ON "VEEC_Collectifs"
FOR INSERT
TO public
WITH CHECK (true);

CREATE POLICY "Allow public update access to collectifs"
ON "VEEC_Collectifs"
FOR UPDATE
TO public
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow public delete access to collectifs"
ON "VEEC_Collectifs"
FOR DELETE
TO public
USING (true);
