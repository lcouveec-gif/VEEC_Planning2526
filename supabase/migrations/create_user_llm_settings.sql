-- Table pour stocker les paramètres LLM de chaque utilisateur
CREATE TABLE IF NOT EXISTS user_llm_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  provider text NOT NULL,
  api_key_encrypted text NOT NULL,  -- Clé API chiffrée avec pgcrypto
  model text NOT NULL,
  endpoint text NOT NULL,
  temperature numeric DEFAULT 0.7 CHECK (temperature >= 0 AND temperature <= 2),
  max_tokens integer DEFAULT 2000 CHECK (max_tokens >= 100 AND max_tokens <= 32000),
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(user_id)
);

-- Index pour accélérer les recherches par user_id
CREATE INDEX IF NOT EXISTS idx_user_llm_settings_user_id ON user_llm_settings(user_id);

-- Activer Row Level Security
ALTER TABLE user_llm_settings ENABLE ROW LEVEL SECURITY;

-- Policy : Les utilisateurs peuvent uniquement voir leurs propres paramètres
CREATE POLICY "Users can view their own LLM settings"
  ON user_llm_settings
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy : Les utilisateurs peuvent uniquement insérer leurs propres paramètres
CREATE POLICY "Users can insert their own LLM settings"
  ON user_llm_settings
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy : Les utilisateurs peuvent uniquement mettre à jour leurs propres paramètres
CREATE POLICY "Users can update their own LLM settings"
  ON user_llm_settings
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy : Les utilisateurs peuvent uniquement supprimer leurs propres paramètres
CREATE POLICY "Users can delete their own LLM settings"
  ON user_llm_settings
  FOR DELETE
  USING (auth.uid() = user_id);

-- Fonction pour mettre à jour automatiquement updated_at
CREATE OR REPLACE FUNCTION update_user_llm_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour updated_at
CREATE TRIGGER update_user_llm_settings_updated_at
  BEFORE UPDATE ON user_llm_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_user_llm_settings_updated_at();

-- Activer l'extension pgcrypto si ce n'est pas déjà fait (pour le chiffrement)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Commentaires pour la documentation
COMMENT ON TABLE user_llm_settings IS 'Stocke les paramètres de configuration LLM de chaque utilisateur de manière sécurisée';
COMMENT ON COLUMN user_llm_settings.api_key_encrypted IS 'Clé API chiffrée avec pgcrypto - ne jamais exposer en clair côté client';
COMMENT ON COLUMN user_llm_settings.provider IS 'Fournisseur LLM : openai, anthropic, google, custom';
COMMENT ON COLUMN user_llm_settings.model IS 'Nom du modèle LLM à utiliser';
COMMENT ON COLUMN user_llm_settings.endpoint IS 'URL de l''endpoint API du LLM';
