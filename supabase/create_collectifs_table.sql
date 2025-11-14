-- Table de liaison many-to-many entre équipes et joueurs (collectifs)
CREATE TABLE IF NOT EXISTS "VEEC_Collectifs" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipe_id TEXT NOT NULL, -- ID de l'équipe (ex: "0775819")
  licencie_id UUID NOT NULL, -- UUID du licencié
  numero_maillot INTEGER, -- Numéro de maillot (1-99) - optionnel
  poste TEXT, -- Poste du joueur (Passeur, Libéro, R4, Pointu, Central) - optionnel
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  -- Contrainte unique pour éviter les doublons
  UNIQUE(equipe_id, licencie_id),
  -- Contrainte pour le numéro de maillot
  CHECK (numero_maillot IS NULL OR (numero_maillot >= 1 AND numero_maillot <= 99))
);

-- Index pour rechercher rapidement par équipe
CREATE INDEX IF NOT EXISTS idx_collectifs_equipe_id ON "VEEC_Collectifs" (equipe_id);

-- Index pour rechercher rapidement par licencié
CREATE INDEX IF NOT EXISTS idx_collectifs_licencie_id ON "VEEC_Collectifs" (licencie_id);

-- Fonction pour mettre à jour automatiquement updated_at
CREATE OR REPLACE FUNCTION update_collectifs_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour mettre à jour updated_at
DROP TRIGGER IF EXISTS update_collectifs_updated_at ON "VEEC_Collectifs";
CREATE TRIGGER update_collectifs_updated_at
  BEFORE UPDATE ON "VEEC_Collectifs"
  FOR EACH ROW
  EXECUTE FUNCTION update_collectifs_updated_at_column();

-- RLS (Row Level Security) - Permettre la lecture publique
ALTER TABLE "VEEC_Collectifs" ENABLE ROW LEVEL SECURITY;

-- Politique pour permettre la lecture publique
CREATE POLICY "Allow public read access to collectifs"
ON "VEEC_Collectifs"
FOR SELECT
TO public
USING (true);

-- Politique pour permettre l'insertion publique
CREATE POLICY "Allow public insert access to collectifs"
ON "VEEC_Collectifs"
FOR INSERT
TO public
WITH CHECK (true);

-- Politique pour permettre la mise à jour publique
CREATE POLICY "Allow public update access to collectifs"
ON "VEEC_Collectifs"
FOR UPDATE
TO public
USING (true)
WITH CHECK (true);

-- Politique pour permettre la suppression publique
CREATE POLICY "Allow public delete access to collectifs"
ON "VEEC_Collectifs"
FOR DELETE
TO public
USING (true);
