# Dépannage - Authentification VEEC Planning

## 🔴 Problème : "La création d'un profil tourne sans fin"

### Cause probable
Les politiques RLS (Row Level Security) bloquent l'insertion du profil lors de l'inscription.

### Solution rapide

#### Option 1 : Corriger la politique RLS (RECOMMANDÉ)

1. **Allez dans Supabase > SQL Editor**
2. **Exécutez ce script** : `supabase/migrations/fix_rls_policies.sql`

```sql
-- Supprimer l'ancienne politique
DROP POLICY IF EXISTS "Allow insert during signup" ON veec_profiles;

-- Créer la nouvelle politique correcte
CREATE POLICY "Allow insert during signup"
  ON veec_profiles
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);
```

3. **Testez à nouveau** l'inscription

#### Option 2 : Désactiver temporairement RLS (NON RECOMMANDÉ EN PRODUCTION)

```sql
-- ⚠️ ATTENTION : Ceci désactive la sécurité !
ALTER TABLE veec_profiles DISABLE ROW LEVEL SECURITY;
```

> **Note**: Cette option est à utiliser UNIQUEMENT pour tester localement. Ne JAMAIS désactiver RLS en production !

---

## 🔍 Diagnostiquer le problème

### 1. Vérifier que la table existe

```sql
SELECT * FROM information_schema.tables
WHERE table_name = 'veec_profiles';
```

**Résultat attendu** : Une ligne avec `table_name = 'veec_profiles'`

### 2. Vérifier que RLS est activé

```sql
SELECT tablename, rowsecurity
FROM pg_tables
WHERE tablename = 'veec_profiles';
```

**Résultat attendu** : `rowsecurity = true`

### 3. Vérifier les politiques RLS

```sql
SELECT policyname, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'veec_profiles';
```

**Résultat attendu** : Au moins 5 politiques :
- `Users can view own profile` (SELECT)
- `Users can update own profile` (UPDATE)
- `Admins can view all profiles` (SELECT)
- `Admins can update all profiles` (UPDATE)
- `Allow insert during signup` (INSERT) ← **Important !**

### 4. Vérifier la politique d'insertion

```sql
SELECT with_check
FROM pg_policies
WHERE tablename = 'veec_profiles'
  AND policyname = 'Allow insert during signup';
```

**Résultat attendu** : `(auth.uid() = user_id)`

**Résultat incorrect** : `true` ← Si vous voyez ceci, c'est le problème !

---

## 🧪 Tester manuellement l'insertion

### Test 1 : Insérer un profil pour l'utilisateur connecté

```sql
-- D'abord, créez un compte via l'interface (/login)
-- Puis, trouvez votre user_id :
SELECT auth.uid();

-- Essayez d'insérer votre profil :
INSERT INTO veec_profiles (user_id, email, role, nom, prenom)
VALUES (
  auth.uid(),
  'votre.email@example.com',
  'user',
  'Test',
  'User'
);
```

**Si ça fonctionne** : RLS est bien configuré ✅
**Si erreur "new row violates row-level security policy"** : RLS bloque l'insertion ❌

---

## 🛠️ Solutions selon l'erreur

### Erreur : "new row violates row-level security policy"

**Cause** : La politique RLS est trop restrictive

**Solution** : Exécuter `fix_rls_policies.sql` (voir Option 1 ci-dessus)

### Erreur : "duplicate key value violates unique constraint"

**Cause** : Le profil existe déjà pour cet utilisateur

**Solution** :
```sql
-- Vérifier si le profil existe
SELECT * FROM veec_profiles WHERE email = 'votre.email@example.com';

-- Si oui, supprimer et recréer
DELETE FROM veec_profiles WHERE email = 'votre.email@example.com';
```

### Erreur : "relation 'veec_profiles' does not exist"

**Cause** : La table n'a pas été créée

**Solution** : Exécuter `create_veec_profiles.sql` (voir SETUP_AUTH.md)

### Erreur : "permission denied for table veec_profiles"

**Cause** : L'utilisateur Supabase n'a pas les permissions

**Solution** :
```sql
-- Vérifier le propriétaire de la table
SELECT tableowner FROM pg_tables WHERE tablename = 'veec_profiles';

-- Si nécessaire, donner les permissions
GRANT ALL ON veec_profiles TO authenticated;
GRANT ALL ON veec_profiles TO anon;
```

---

## 📊 Vérifier les logs d'erreur

### Dans la console du navigateur (F12)

1. Ouvrez la console du navigateur (F12 > Console)
2. Tentez de créer un compte
3. Cherchez les erreurs en rouge contenant :
   - `new row violates row-level security`
   - `permission denied`
   - `duplicate key`
   - `relation does not exist`

### Dans Supabase Logs

1. Allez dans **Supabase > Logs > Database**
2. Filtrez par `error`
3. Cherchez les erreurs liées à `veec_profiles`

---

## 🔧 Script de réinitialisation complète

**⚠️ ATTENTION : Ceci supprime TOUTES les données de veec_profiles !**

```sql
-- 1. Supprimer la table (et toutes les données)
DROP TABLE IF EXISTS veec_profiles CASCADE;

-- 2. Recréer la table avec les bonnes politiques
-- (Copiez tout le contenu de create_veec_profiles.sql ici)
```

---

## 📞 Checklist de dépannage

- [ ] La table `veec_profiles` existe dans Supabase
- [ ] RLS est activé sur la table
- [ ] La politique `"Allow insert during signup"` existe
- [ ] La politique utilise `WITH CHECK (auth.uid() = user_id)` et non `WITH CHECK (true)`
- [ ] Les variables `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY` sont correctes dans `.env`
- [ ] Le fichier `.env` est à la racine du projet
- [ ] L'application a été redémarrée après modification de `.env`
- [ ] La console du navigateur ne montre pas d'erreur 401/403
- [ ] Supabase Auth est bien configuré (Email provider activé)

---

## 🎯 Test final

Une fois corrigé, testez l'inscription complète :

1. **Créer un compte** :
   - Email : `test@veec.fr`
   - Password : `Test123456`
   - Nom : `Test`
   - Prénom : `User`

2. **Vérifier dans Supabase** :
   ```sql
   SELECT * FROM veec_profiles WHERE email = 'test@veec.fr';
   ```

   **Résultat attendu** : Une ligne avec le profil créé

3. **Se connecter** avec le compte créé

4. **Vérifier** que l'utilisateur peut accéder à `/team`

---

## 💡 Astuces

### Voir tous les utilisateurs créés

```sql
-- Dans auth.users
SELECT id, email, created_at FROM auth.users ORDER BY created_at DESC;

-- Dans veec_profiles
SELECT user_id, email, role, nom, prenom FROM veec_profiles ORDER BY created_at DESC;
```

### Créer un admin rapidement

```sql
-- 1. Créer un compte via /login
-- 2. Trouver l'ID
SELECT id FROM auth.users WHERE email = 'votre.email@example.com';

-- 3. Mettre à jour le rôle
UPDATE veec_profiles
SET role = 'admin'
WHERE email = 'votre.email@example.com';
```

### Supprimer un utilisateur complètement

```sql
-- Ceci supprime l'utilisateur ET son profil (grâce à ON DELETE CASCADE)
DELETE FROM auth.users WHERE email = 'email@example.com';
```

---

## 📚 Ressources

- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
- [Supabase Auth Policies](https://supabase.com/docs/guides/auth/managing-user-data)
- [PostgreSQL Policies](https://www.postgresql.org/docs/current/sql-createpolicy.html)
