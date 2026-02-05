# 🔴 FIX RAPIDE : Inscription qui tourne en boucle

## ✅ Solution immédiate (2 minutes)

### Étape 1 : Vérifier les logs dans la console

1. **Ouvrez la console du navigateur** (F12 > Console)
2. **Tentez de créer un compte**
3. **Observez les logs** :
   - 🔵 "Étape 1: Création du compte utilisateur..."
   - ✅ "Utilisateur créé: [ID]"
   - 🔵 "Étape 2: Création du profil dans veec_profiles..."
   - ❌ **C'est ici que ça bloque ?**

### Étape 2 : Identifier l'erreur exacte

Si vous voyez une **erreur rouge** dans la console, notez le code d'erreur :

#### Erreur A : `42501` ou "new row violates row-level security policy"
**Cause** : La politique RLS bloque l'insertion

**Solution** : Exécutez ce script dans Supabase SQL Editor :
```sql
DROP POLICY IF EXISTS "Allow insert during signup" ON veec_profiles;
CREATE POLICY "Allow insert during signup"
  ON veec_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);
```

#### Erreur B : `42P01` ou "relation 'veec_profiles' does not exist"
**Cause** : La table n'a pas été créée

**Solution** : Exécutez `supabase/migrations/setup_complete.sql` dans Supabase SQL Editor

#### Erreur C : `23505` ou "duplicate key value violates unique constraint"
**Cause** : L'email existe déjà

**Solution** : Utilisez un autre email OU supprimez l'ancien :
```sql
DELETE FROM veec_profiles WHERE email = 'votre.email@example.com';
DELETE FROM auth.users WHERE email = 'votre.email@example.com';
```

#### Erreur D : Timeout après 10 secondes
**Cause** : RLS empêche l'insertion de manière silencieuse

**Solution** : Vérifiez que la politique utilise `auth.uid() = user_id` :
```sql
SELECT with_check FROM pg_policies
WHERE tablename = 'veec_profiles' AND policyname = 'Allow insert during signup';
```
Doit retourner : `(auth.uid() = user_id)`

---

## 🔧 Test rapide RLS

Créez un compte test et vérifiez manuellement :

```sql
-- 1. Créer un utilisateur via l'interface /login
-- 2. Trouver son ID
SELECT id FROM auth.users WHERE email = 'test@test.com';

-- 3. Essayer d'insérer manuellement (remplacez l'ID)
INSERT INTO veec_profiles (user_id, email, role, nom, prenom)
VALUES ('ID_ICI', 'test@test.com', 'user', 'Test', 'User');
```

**Si ça fonctionne en SQL** : Le problème vient de l'app
**Si ça échoue en SQL** : Le problème vient des politiques RLS

---

## 📋 Checklist ultra-rapide

- [ ] La table `veec_profiles` existe dans Supabase
- [ ] RLS est activé sur `veec_profiles`
- [ ] La politique "Allow insert during signup" existe
- [ ] La politique utilise `WITH CHECK (auth.uid() = user_id)` et PAS `WITH CHECK (true)`
- [ ] Vous utilisez un email qui n'existe pas déjà
- [ ] Vous voyez les logs dans la console du navigateur

---

## 🚀 Solution tout-en-un

Si vous voulez tout réinitialiser :

```sql
-- ⚠️ ATTENTION : Supprime TOUTES les données !
DROP TABLE IF EXISTS veec_profiles CASCADE;

-- Puis exécutez supabase/migrations/setup_complete.sql
```

---

## 📞 Besoin d'aide ?

1. **Copiez les logs d'erreur** de la console (F12)
2. **Consultez** [TROUBLESHOOTING_AUTH.md](TROUBLESHOOTING_AUTH.md)
3. **Vérifiez** que vous avez bien exécuté `setup_complete.sql` ou `fix_rls_policies.sql`

---

## ✅ Une fois corrigé

Testez l'inscription avec ces données :
- Email : `test@veec.fr`
- Password : `Test123456`
- Nom : `Test`
- Prénom : `User`

Vous devriez voir dans la console :
```
🔵 Étape 1: Création du compte utilisateur...
✅ Utilisateur créé: [ID]
🔵 Étape 2: Création du profil dans veec_profiles...
✅ Profil créé: [Objet profil]
```

Et le message de succès : "Compte créé avec succès !"
