# Configuration de l'authentification VEEC Planning

## 📋 Résumé

Le système d'authentification est maintenant implémenté avec :
- **3 rôles** : `admin`, `entraineur`, `user`
- **Contrôle d'accès par route**
- **Stockage des utilisateurs** dans Supabase

---

## 🗄️ Architecture de stockage

### 1. Table `auth.users` (Supabase Auth - native)
- **Gérée automatiquement** par Supabase Auth
- Contient : `id`, `email`, `encrypted_password`, `created_at`, etc.
- Créée lors de `supabase.auth.signUp()`

### 2. Table `veec_profiles` (Custom - à créer)
- **Vous devez créer** cette table manuellement
- Contient : `user_id` (FK), `email`, `role`, `nom`, `prenom`
- Liée à `auth.users` via `user_id`

---

## 🔧 Étapes d'installation Supabase

### Étape 1 : Créer la table `veec_profiles`

1. **Accédez à votre projet Supabase** : https://app.supabase.com
2. Allez dans **SQL Editor** (menu gauche)
3. **Collez et exécutez** le script SQL suivant :

```sql
-- Fichier disponible dans : supabase/migrations/create_veec_profiles.sql

-- Création de la table veec_profiles
CREATE TABLE IF NOT EXISTS veec_profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'entraineur', 'user')),
  nom TEXT,
  prenom TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(user_id),
  UNIQUE(email)
);

-- Index pour performances
CREATE INDEX IF NOT EXISTS idx_veec_profiles_user_id ON veec_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_veec_profiles_email ON veec_profiles(email);
CREATE INDEX IF NOT EXISTS idx_veec_profiles_role ON veec_profiles(role);

-- RLS (Row Level Security)
ALTER TABLE veec_profiles ENABLE ROW LEVEL SECURITY;

-- Politique : Les utilisateurs peuvent voir leur propre profil
CREATE POLICY "Users can view own profile"
  ON veec_profiles FOR SELECT
  USING (auth.uid() = user_id);

-- Politique : Les utilisateurs peuvent mettre à jour leur profil (sauf role)
CREATE POLICY "Users can update own profile"
  ON veec_profiles FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND role = (SELECT role FROM veec_profiles WHERE user_id = auth.uid())
  );

-- Politique : Les admins peuvent tout voir
CREATE POLICY "Admins can view all profiles"
  ON veec_profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM veec_profiles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Politique : Les admins peuvent modifier tous les profils
CREATE POLICY "Admins can update all profiles"
  ON veec_profiles FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM veec_profiles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Politique : Insertion autorisée (pour signUp)
CREATE POLICY "Allow insert during signup"
  ON veec_profiles FOR INSERT
  WITH CHECK (true);

-- Trigger pour updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_veec_profiles_updated_at
  BEFORE UPDATE ON veec_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

4. **Vérifiez la création** :
   - Allez dans **Table Editor** (menu gauche)
   - Vous devriez voir la table `veec_profiles`

---

## 👤 Créer votre premier utilisateur Admin

### Option 1 : Via l'interface de l'application

1. Lancez l'application : `npm run dev`
2. Accédez à `/login`
3. Créez un compte (il aura le rôle `user` par défaut)
4. Allez dans **Supabase > Table Editor > veec_profiles**
5. Trouvez votre utilisateur et **modifiez le rôle** de `user` à `admin`

### Option 2 : Via SQL directement

```sql
-- Créer un utilisateur admin manuellement
INSERT INTO auth.users (email, encrypted_password, email_confirmed_at)
VALUES ('admin@veec.fr', crypt('VotreMotDePasse', gen_salt('bf')), NOW());

-- Récupérer l'ID de l'utilisateur créé
SELECT id FROM auth.users WHERE email = 'admin@veec.fr';

-- Créer le profil admin (remplacez USER_ID_ICI)
INSERT INTO veec_profiles (user_id, email, role, nom, prenom)
VALUES ('USER_ID_ICI', 'admin@veec.fr', 'admin', 'Nom', 'Prénom');
```

---

## 🔐 Permissions par rôle

| Fonctionnalité | user | entraineur | admin |
|----------------|------|------------|-------|
| **Entraînements** | ✅ Lecture | ✅ Total | ✅ Total |
| **Matchs** | ✅ Lecture | ✅ Total | ✅ Total |
| **Équipes** | ✅ Lecture | ✅ Total | ✅ Total |
| **Position** | ❌ | ✅ Total | ✅ Total |
| **Arbitre** | ❌ | ✅ Total | ✅ Total |
| **IA** | ❌ | ✅ Total | ✅ Total |
| **Admin** | ❌ | ✅ Total* | ✅ Total |
| **Autorisations** | ❌ | ❌ | ✅ Total |

> *L'entraîneur a accès à toutes les sections Admin SAUF "Autorisations" (gestion des rôles)

---

## 🧪 Tester l'authentification

### Test 1 : Créer un compte
1. Accéder à `/login`
2. Cliquer sur "Pas encore de compte ? Inscrivez-vous"
3. Remplir : email, password, nom, prénom
4. Vérifier dans Supabase que l'utilisateur est créé avec le rôle `user`

### Test 2 : Connexion
1. Se connecter avec l'email/password
2. Vérifier que vous êtes redirigé vers `/team`
3. Vérifier que votre nom apparaît dans le header (si implémenté)

### Test 3 : Restrictions par rôle
1. **Avec compte `user`** :
   - ✅ Accès à `/team`, `/training`, `/matches`
   - ❌ Redirection depuis `/position` → "Accès refusé"
   - ❌ Redirection depuis `/admin` → "Accès refusé"

2. **Modifier le rôle en `entraineur`** (dans Supabase) :
   - ✅ Accès à `/position`, `/referee`, `/ai`
   - ✅ Accès à `/admin` (équipes, collectifs, automation)
   - ❌ La carte "Autorisations" n'apparaît PAS dans le menu Admin

3. **Modifier le rôle en `admin`** :
   - ✅ Accès total
   - ✅ La carte "Autorisations" apparaît dans Admin
   - ✅ Peut modifier les rôles des autres utilisateurs

### Test 4 : Gestion des autorisations (Admin uniquement)
1. Se connecter avec un compte `admin`
2. Aller dans `/admin` → cliquer sur "Autorisations"
3. Vérifier que la liste des utilisateurs s'affiche
4. Modifier le rôle d'un autre utilisateur
5. Vérifier qu'on ne peut PAS modifier son propre rôle

### Test 5 : Persistance de la session
1. Se connecter
2. Rafraîchir la page (F5)
3. Vérifier que vous restez connecté
4. Fermer le navigateur et rouvrir
5. Revenir sur le site → vous devriez être toujours connecté

---

## 🚀 Fichiers modifiés/créés

### Créés :
- `stores/useAuthStore.ts` - Store Zustand pour l'authentification
- `components/ProtectedRoute.tsx` - Composant de protection des routes
- `pages/LoginPage.tsx` - Page de connexion/inscription
- `components/Admin/PermissionsManager.tsx` - Gestion des rôles utilisateurs
- `supabase/migrations/create_veec_profiles.sql` - Script de création de table

### Modifiés :
- `router.tsx` - Routes protégées avec ProtectedRoute
- `index.tsx` - Activation de AuthProvider
- `contexts/AuthContext.tsx` - Utilisation du store Zustand
- `components/Admin.tsx` - Ajout section "Autorisations" (admin uniquement)
- `pages/LoginPage.tsx` - Mise à jour des descriptions de rôles

---

## 📞 En cas de problème

### ⚠️ "La création d'un profil tourne sans fin"
**Solution** : Consultez le guide complet de dépannage : **[TROUBLESHOOTING_AUTH.md](TROUBLESHOOTING_AUTH.md)**

Correctif rapide :
```sql
-- Exécuter dans Supabase SQL Editor
DROP POLICY IF EXISTS "Allow insert during signup" ON veec_profiles;
CREATE POLICY "Allow insert during signup"
  ON veec_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);
```

### Erreur : "RLS policy violation" lors de l'inscription
➡️ Exécutez le script `supabase/migrations/fix_rls_policies.sql`
➡️ Voir [TROUBLESHOOTING_AUTH.md](TROUBLESHOOTING_AUTH.md) pour plus de détails

### Erreur : "Cannot read properties of null (reading 'role')"
➡️ Le profil n'a pas été créé dans `veec_profiles` lors de l'inscription
➡️ Vérifiez que le code de `signUp` dans `AuthContext.tsx` insère bien dans `veec_profiles`

### Erreur : L'utilisateur ne peut pas voir son profil
➡️ Vérifiez que RLS est activé et que les politiques sont créées correctement
➡️ Voir [TROUBLESHOOTING_AUTH.md](TROUBLESHOOTING_AUTH.md) section "Diagnostiquer le problème"

### L'utilisateur reste bloqué sur la page de chargement
➡️ Vérifiez dans la console du navigateur (F12) s'il y a des erreurs Supabase
➡️ Vérifiez que `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY` sont corrects dans `.env`

---

## ✅ Checklist de mise en production

- [ ] Table `veec_profiles` créée dans Supabase
- [ ] Politiques RLS configurées
- [ ] Au moins un compte Admin créé
- [ ] Variables d'environnement configurées (`.env`)
- [ ] Testé : création de compte
- [ ] Testé : connexion/déconnexion
- [ ] Testé : restrictions par rôle
- [ ] Testé : gestion des autorisations (admin)
- [ ] Testé : persistance de session

---

## 📚 Documentation supplémentaire

- **Supabase Auth** : https://supabase.com/docs/guides/auth
- **RLS Policies** : https://supabase.com/docs/guides/auth/row-level-security
- **React Router** : https://reactrouter.com/
- **Zustand** : https://github.com/pmndrs/zustand
