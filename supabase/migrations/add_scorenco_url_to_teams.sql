-- ========================================
-- Ajouter le champ scorenco_url à la table VEEC_Equipes_FFVB
-- ========================================

-- Ajouter la colonne scorenco_url
ALTER TABLE "VEEC_Equipes_FFVB"
ADD COLUMN IF NOT EXISTS scorenco_url TEXT;

-- Ajouter un commentaire sur la colonne
COMMENT ON COLUMN "VEEC_Equipes_FFVB".scorenco_url IS 'URL Score''n''co de l''équipe (ex: https://app.scorenco.com/teams/126306)';

-- Message de succès
DO $$
BEGIN
  RAISE NOTICE '✅ Colonne scorenco_url ajoutée à la table VEEC_Equipes_FFVB';
END $$;
