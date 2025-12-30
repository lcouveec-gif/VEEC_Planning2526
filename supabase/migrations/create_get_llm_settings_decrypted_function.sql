-- Fonction pour récupérer les paramètres LLM avec la clé API déchiffrée
-- ATTENTION : Cette fonction est SECURITY DEFINER et ne doit être appelée que par les Edge Functions
CREATE OR REPLACE FUNCTION get_user_llm_settings_decrypted(
  p_user_id uuid,
  p_encryption_key text
)
RETURNS TABLE (
  provider text,
  api_key_decrypted text,
  model text,
  endpoint text,
  temperature numeric,
  max_tokens integer
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.provider,
    pgp_sym_decrypt(s.api_key_encrypted::bytea, p_encryption_key)::text as api_key_decrypted,
    s.model,
    s.endpoint,
    s.temperature,
    s.max_tokens
  FROM user_llm_settings s
  WHERE s.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Donner l'accès aux utilisateurs authentifiés (pour les Edge Functions)
GRANT EXECUTE ON FUNCTION get_user_llm_settings_decrypted TO authenticated;

-- Commentaire pour documentation
COMMENT ON FUNCTION get_user_llm_settings_decrypted IS 'Récupère les paramètres LLM avec la clé API déchiffrée - UTILISATION INTERNE UNIQUEMENT par les Edge Functions';
