-- Fonction pour insérer ou mettre à jour les paramètres LLM avec chiffrement
CREATE OR REPLACE FUNCTION upsert_user_llm_settings(
  p_user_id uuid,
  p_provider text,
  p_api_key text,
  p_model text,
  p_endpoint text,
  p_temperature numeric,
  p_max_tokens integer,
  p_encryption_key text
)
RETURNS void AS $$
BEGIN
  -- Utiliser INSERT ... ON CONFLICT pour UPSERT
  INSERT INTO user_llm_settings (
    user_id,
    provider,
    api_key_encrypted,
    model,
    endpoint,
    temperature,
    max_tokens
  ) VALUES (
    p_user_id,
    p_provider,
    pgp_sym_encrypt(p_api_key, p_encryption_key),
    p_model,
    p_endpoint,
    p_temperature,
    p_max_tokens
  )
  ON CONFLICT (user_id)
  DO UPDATE SET
    provider = EXCLUDED.provider,
    api_key_encrypted = EXCLUDED.api_key_encrypted,
    model = EXCLUDED.model,
    endpoint = EXCLUDED.endpoint,
    temperature = EXCLUDED.temperature,
    max_tokens = EXCLUDED.max_tokens,
    updated_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Donner l'accès à tous les utilisateurs authentifiés
GRANT EXECUTE ON FUNCTION upsert_user_llm_settings TO authenticated;

-- Commentaire pour documentation
COMMENT ON FUNCTION upsert_user_llm_settings IS 'Insère ou met à jour les paramètres LLM d''un utilisateur avec chiffrement de la clé API';
