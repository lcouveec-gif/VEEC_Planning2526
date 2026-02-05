-- Création de la table veec_profiles pour les profils utilisateurs
CREATE TABLE IF NOT EXISTS veec_profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'entraineur', 'user')),
  nom TEXT,
  prenom TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Contraintes
  UNIQUE(user_id),
  UNIQUE(email)
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_veec_profiles_user_id ON veec_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_veec_profiles_email ON veec_profiles(email);
CREATE INDEX IF NOT EXISTS idx_veec_profiles_role ON veec_profiles(role);

-- RLS (Row Level Security) - Activer la sécurité au niveau des lignes
ALTER TABLE veec_profiles ENABLE ROW LEVEL SECURITY;

-- Politique : Les utilisateurs peuvent voir leur propre profil
CREATE POLICY "Users can view own profile"
  ON veec_profiles
  FOR SELECT
  USING (auth.uid() = user_id);

-- Politique : Les utilisateurs peuvent mettre à jour leur propre profil (sauf le rôle)
CREATE POLICY "Users can update own profile"
  ON veec_profiles
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND role = (SELECT role FROM veec_profiles WHERE user_id = auth.uid())
  );

-- Politique : Les admins peuvent tout voir
CREATE POLICY "Admins can view all profiles"
  ON veec_profiles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM veec_profiles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Politique : Les admins peuvent modifier tous les profils
CREATE POLICY "Admins can update all profiles"
  ON veec_profiles
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM veec_profiles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Politique : Permettre l'insertion lors de l'inscription
-- L'utilisateur peut créer son propre profil (auth.uid() = user_id)
CREATE POLICY "Allow insert during signup"
  ON veec_profiles
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Fonction pour mettre à jour automatiquement updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour updated_at
CREATE TRIGGER update_veec_profiles_updated_at
  BEFORE UPDATE ON veec_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Commentaires pour documentation
COMMENT ON TABLE veec_profiles IS 'Profils utilisateurs VEEC avec gestion des rôles';
COMMENT ON COLUMN veec_profiles.role IS 'Rôle de l''utilisateur: admin (accès total), entraineur (accès total sauf gestion autorisations + admin), user (lecture seule sur entraînements/matchs/équipes)';
