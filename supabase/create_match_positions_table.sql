-- Table pour stocker les compositions d'équipe par match
CREATE TABLE IF NOT EXISTS "VEEC_Match_Positions" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL, -- UUID pour correspondre à la table des matchs
  team_id TEXT NOT NULL,
  match_date TIMESTAMP,
  players JSONB NOT NULL, -- Array de joueurs avec leurs infos
  set_lineups JSONB DEFAULT '[]'::jsonb, -- Array des compositions par set (peut être vide à l'étape 2)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour rechercher rapidement par match_id
CREATE INDEX IF NOT EXISTS idx_match_positions_match_id ON "VEEC_Match_Positions" (match_id);

-- Index pour rechercher par team_id
CREATE INDEX IF NOT EXISTS idx_match_positions_team_id ON "VEEC_Match_Positions" (team_id);

-- Fonction pour mettre à jour automatiquement updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour mettre à jour updated_at
DROP TRIGGER IF EXISTS update_match_positions_updated_at ON "VEEC_Match_Positions";
CREATE TRIGGER update_match_positions_updated_at
  BEFORE UPDATE ON "VEEC_Match_Positions"
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS (Row Level Security) - Permettre la lecture publique
ALTER TABLE "VEEC_Match_Positions" ENABLE ROW LEVEL SECURITY;

-- Politique pour permettre la lecture publique
CREATE POLICY "Allow public read access to match positions"
ON "VEEC_Match_Positions"
FOR SELECT
TO public
USING (true);

-- Politique pour permettre l'insertion publique
CREATE POLICY "Allow public insert access to match positions"
ON "VEEC_Match_Positions"
FOR INSERT
TO public
WITH CHECK (true);

-- Politique pour permettre la mise à jour publique
CREATE POLICY "Allow public update access to match positions"
ON "VEEC_Match_Positions"
FOR UPDATE
TO public
USING (true)
WITH CHECK (true);

-- Politique pour permettre la suppression publique
CREATE POLICY "Allow public delete access to match positions"
ON "VEEC_Match_Positions"
FOR DELETE
TO public
USING (true);
