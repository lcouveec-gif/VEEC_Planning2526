# Scripts SQL - Migrations Supabase

Ce dossier contient les scripts SQL pour configurer l'authentification VEEC Planning dans Supabase.

## 📋 Scripts disponibles

### 1. `setup_complete.sql` ⭐ **RECOMMANDÉ**
**Utilisez ce script pour une installation complète en une seule fois.**

Contient :
- ✅ Création de la table `veec_profiles`
- ✅ Création des index de performance
- ✅ Activation de RLS
- ✅ Création de TOUTES les politiques (corrigées)
- ✅ Triggers et fonctions
- ✅ Vérification automatique

**Comment l'utiliser** :
1. Ouvrez **Supabase > SQL Editor**
2. Copiez tout le contenu de `setup_complete.sql`
3. Cliquez sur **Run**
4. Vérifiez les messages de succès

---

### 2. `create_veec_profiles.sql`
Script de création initiale de la table (version corrigée).

**Quand l'utiliser** : Si vous voulez créer la table manuellement étape par étape.

---

### 3. `fix_rls_policies.sql`
Script de réparation des politiques RLS.

**Quand l'utiliser** : Si vous avez déjà créé la table mais que l'inscription ne fonctionne pas (boucle infinie).

Ce script :
- Supprime l'ancienne politique d'insertion
- Crée la nouvelle politique correcte : `WITH CHECK (auth.uid() = user_id)`

---

## 🚀 Installation rapide (Recommandé)

### Méthode 1 : Script complet (Le plus simple)

```bash
# 1. Copiez le contenu de setup_complete.sql
# 2. Allez dans Supabase > SQL Editor
# 3. Collez et exécutez
```

### Méthode 2 : Depuis Supabase CLI (Avancé)

```bash
# Si vous utilisez Supabase CLI localement
supabase db reset
supabase migration new create_veec_profiles
# Copiez le contenu de setup_complete.sql dans le fichier créé
supabase db push
```

---

## 🔍 Vérifier l'installation

Après avoir exécuté un script, vérifiez que tout fonctionne :

### Vérification 1 : Table créée
```sql
SELECT * FROM information_schema.tables
WHERE table_name = 'veec_profiles';
```
✅ Doit retourner une ligne

### Vérification 2 : RLS activé
```sql
SELECT tablename, rowsecurity
FROM pg_tables
WHERE tablename = 'veec_profiles';
```
✅ `rowsecurity` doit être `true`

### Vérification 3 : Politiques créées
```sql
SELECT policyname, cmd
FROM pg_policies
WHERE tablename = 'veec_profiles'
ORDER BY cmd, policyname;
```
✅ Doit retourner 5 politiques :
- `Allow insert during signup` (INSERT)
- `Admins can view all profiles` (SELECT)
- `Users can view own profile` (SELECT)
- `Admins can update all profiles` (UPDATE)
- `Users can update own profile` (UPDATE)

### Vérification 4 : Politique d'insertion correcte
```sql
SELECT with_check
FROM pg_policies
WHERE tablename = 'veec_profiles'
  AND policyname = 'Allow insert during signup';
```
✅ Doit retourner : `(auth.uid() = user_id)`
❌ Si vous voyez `true`, exécutez `fix_rls_policies.sql`

---

## 🛠️ Réparation en cas de problème

### Problème : "La création d'un profil tourne sans fin"

**Solution** :
```bash
# Exécutez fix_rls_policies.sql
# OU exécutez setup_complete.sql (écrase tout)
```

### Problème : Table déjà existante

**Option 1** : Supprimer et recréer (⚠️ PERTE DE DONNÉES)
```sql
DROP TABLE veec_profiles CASCADE;
-- Puis exécutez setup_complete.sql
```

**Option 2** : Juste corriger les politiques
```bash
# Exécutez fix_rls_policies.sql
```

---

## 📚 Ordre d'exécution des scripts (si manuel)

Si vous voulez tout faire manuellement dans l'ordre :

1. `create_veec_profiles.sql` - Créer la table
2. *(Optionnel)* `fix_rls_policies.sql` - Si problèmes RLS

**OU simplement** :

1. `setup_complete.sql` - Tout en une fois ⭐

---

## ✅ Après installation

1. **Créer votre premier admin** :
   - Via l'app : Créer un compte sur `/login`
   - Puis dans Supabase SQL Editor :
   ```sql
   UPDATE veec_profiles
   SET role = 'admin'
   WHERE email = 'votre.email@example.com';
   ```

2. **Tester** :
   - Créer un compte
   - Se connecter
   - Vérifier l'accès aux différentes sections

---

## 📖 Documentation

- [SETUP_AUTH.md](../../SETUP_AUTH.md) - Guide d'installation complet
- [TROUBLESHOOTING_AUTH.md](../../TROUBLESHOOTING_AUTH.md) - Dépannage détaillé

---

## 🔐 Sécurité

Ces scripts activent **Row Level Security (RLS)** pour protéger les données :

- ✅ Les utilisateurs ne voient QUE leur propre profil
- ✅ Les utilisateurs NE PEUVENT PAS modifier leur rôle
- ✅ Seuls les admins peuvent voir/modifier tous les profils
- ✅ L'insertion est autorisée uniquement pour son propre profil

**NE JAMAIS désactiver RLS en production !**
