# Configuration de l'authentification et des RLS dans Supabase

## 1. Structure de la table `veec_profiles`

Assurez-vous que votre table `veec_profiles` a la structure suivante:

```sql
CREATE TABLE veec_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'public' CHECK (role IN ('admin', 'board', 'entraineur', 'joueur', 'public')),
  nom TEXT,
  prenom TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## 2. Activer Row Level Security (RLS)

```sql
-- Activer RLS sur la table
ALTER TABLE veec_profiles ENABLE ROW LEVEL SECURITY;
```

## 3. Créer les policies RLS pour veec_profiles

**IMPORTANT**: Pour éviter les récursions infinies, nous utilisons une fonction helper qui stocke le rôle de l'utilisateur.

### Étape 3.1: Créer une fonction helper pour récupérer le rôle
```sql
-- Fonction qui retourne le rôle de l'utilisateur connecté
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
  SELECT role FROM veec_profiles WHERE user_id = auth.uid() LIMIT 1;
$$ LANGUAGE SQL SECURITY DEFINER STABLE;
```

### Policy 1: Les utilisateurs peuvent lire leur propre profil
```sql
CREATE POLICY "Users can read own profile"
ON veec_profiles
FOR SELECT
USING (auth.uid() = user_id);
```

### Policy 2: Les utilisateurs peuvent mettre à jour leur propre profil (nom/prénom uniquement)
```sql
CREATE POLICY "Users can update own profile"
ON veec_profiles
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id
  AND role = (SELECT role FROM veec_profiles WHERE user_id = auth.uid() AND id = veec_profiles.id LIMIT 1)
);
```

### Policy 3: Permettre l'insertion lors de l'inscription
```sql
CREATE POLICY "Users can insert own profile on signup"
ON veec_profiles
FOR INSERT
WITH CHECK (auth.uid() = user_id);
```

### Policy 4: Les admins peuvent tout voir (utilise la fonction helper)
```sql
CREATE POLICY "Admins can view all profiles"
ON veec_profiles
FOR SELECT
USING (get_user_role() = 'admin');
```

### Policy 5: Les admins peuvent modifier les rôles (utilise la fonction helper)
```sql
CREATE POLICY "Admins can update all profiles"
ON veec_profiles
FOR UPDATE
USING (get_user_role() = 'admin');
```

## 4. RLS pour les autres tables (optionnel selon vos besoins)

### Exemple pour VEEC_Equipes_FFVB

```sql
-- Activer RLS
ALTER TABLE "VEEC_Equipes_FFVB" ENABLE ROW LEVEL SECURITY;

-- Tout le monde peut lire les équipes
CREATE POLICY "Anyone can read teams"
ON "VEEC_Equipes_FFVB"
FOR SELECT
USING (true);

-- Seuls admin et board peuvent créer/modifier/supprimer
CREATE POLICY "Admin and board can manage teams"
ON "VEEC_Equipes_FFVB"
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM veec_profiles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'board')
  )
);
```

### Exemple pour VEEC_Collectifs

```sql
ALTER TABLE "VEEC_Collectifs" ENABLE ROW LEVEL SECURITY;

-- Tout le monde peut lire
CREATE POLICY "Anyone can read collectifs"
ON "VEEC_Collectifs"
FOR SELECT
USING (true);

-- Admin, board et entraîneur peuvent gérer
CREATE POLICY "Admin, board and entraineur can manage collectifs"
ON "VEEC_Collectifs"
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM veec_profiles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'board', 'entraineur')
  )
);
```

### Exemple pour VEEC_Training_Sessions

```sql
ALTER TABLE "VEEC_Training_Sessions" ENABLE ROW LEVEL SECURITY;

-- Tout le monde peut lire
CREATE POLICY "Anyone can read training sessions"
ON "training_sessions"
FOR SELECT
USING (true);

-- Admin et board peuvent gérer
CREATE POLICY "Admin and board can manage training sessions"
ON "training_sessions"
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM veec_profiles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'board')
  )
);
```

## 5. Créer un trigger pour mettre à jour `updated_at`

```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_veec_profiles_updated_at
BEFORE UPDATE ON veec_profiles
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
```

## 6. Configuration de l'authentification Supabase

Dans le dashboard Supabase:

1. **Authentication > Settings**
   - Activez "Enable email confirmations" si vous voulez que les utilisateurs confirment leur email
   - Configurez les URLs de redirection si nécessaire

2. **Authentication > Email Templates**
   - Personnalisez les templates d'emails (confirmation, reset password, etc.)

3. **Authentication > URL Configuration**
   - Site URL: `https://votre-domaine.com` (ou `http://localhost:5173` pour le dev)
   - Redirect URLs: Ajoutez vos URLs autorisées

## 7. Variables d'environnement

Assurez-vous d'avoir ces variables dans votre fichier `.env`:

```env
VITE_SUPABASE_URL=https://votre-projet.supabase.co
VITE_SUPABASE_ANON_KEY=votre_clé_publique_anon
```

## 8. Créer le premier administrateur

Après avoir créé un compte via l'interface, vous devez manuellement définir son rôle comme 'admin':

```sql
UPDATE veec_profiles
SET role = 'admin'
WHERE email = 'votre-email@example.com';
```

## 9. Test de sécurité

Testez les policies en vous connectant avec différents rôles et en vérifiant:

1. Un utilisateur 'public' ne peut voir que son propre profil
2. Un utilisateur 'public' ne peut pas modifier les équipes
3. Un 'admin' peut voir tous les profils et modifier tous les rôles
4. Les utilisateurs non authentifiés peuvent voir les données publiques (équipes, matchs, etc.)

## 10. Protection des pages dans l'application

L'application utilise le hook `useAuth()` qui fournit:
- `user`: L'utilisateur connecté (null si déconnecté)
- `profile`: Le profil avec le rôle
- `hasRole(role)`: Fonction pour vérifier si l'utilisateur a un rôle spécifique

Exemple d'utilisation:

```tsx
import { useAuth } from '../hooks/useAuth';

const AdminPage = () => {
  const { profile, hasRole } = useAuth();

  if (!hasRole(['admin', 'board'])) {
    return <div>Accès refusé</div>;
  }

  return <div>Contenu admin</div>;
};
```

## 11. Rôles disponibles

- **admin**: Accès complet à toutes les fonctionnalités
- **board**: Gestion des équipes et des collectifs
- **entraineur**: Gestion des collectifs et des entraînements
- **joueur**: Consultation et gestion de son propre profil
- **public**: Consultation des données publiques uniquement
