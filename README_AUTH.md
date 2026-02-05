# 🔐 Authentification VEEC Planning - Guide Complet

## 📚 Documentation disponible

| Document | Utilité | Quand l'utiliser |
|----------|---------|------------------|
| **[QUICK_FIX_SIGNUP.md](QUICK_FIX_SIGNUP.md)** ⭐ | **FIX RAPIDE** : Inscription qui bloque | Si la création de compte tourne en boucle |
| **[SETUP_AUTH.md](SETUP_AUTH.md)** | **Guide d'installation complet** | Pour installer l'authentification de zéro |
| **[TROUBLESHOOTING_AUTH.md](TROUBLESHOOTING_AUTH.md)** | **Dépannage détaillé** | Pour diagnostiquer et résoudre tous les problèmes |
| **[supabase/migrations/README.md](supabase/migrations/README.md)** | **Guide des scripts SQL** | Pour comprendre et utiliser les migrations |

---

## 🚀 Installation rapide (5 minutes)

### 1. Créer la table dans Supabase

1. Allez dans **Supabase > SQL Editor**
2. Copiez et exécutez : **[supabase/migrations/setup_complete.sql](supabase/migrations/setup_complete.sql)**
3. Vérifiez le message de succès ✅

### 2. Créer votre premier admin

1. Lancez l'app : `npm run dev`
2. Allez sur `/login`
3. Créez un compte (rôle `user` par défaut)
4. Dans **Supabase > Table Editor > veec_profiles**
5. Modifiez votre rôle de `user` à `admin`

### 3. Testez

- ✅ Connexion/Déconnexion
- ✅ Accès aux différentes sections selon votre rôle
- ✅ Gestion des autorisations (admin uniquement)

---

## 🆘 Problèmes courants

### "La création d'un compte tourne en boucle" 🔴

**Consultez** : [QUICK_FIX_SIGNUP.md](QUICK_FIX_SIGNUP.md)

**Solution ultra-rapide** :
```sql
-- Dans Supabase SQL Editor
DROP POLICY IF EXISTS "Allow insert during signup" ON veec_profiles;
CREATE POLICY "Allow insert during signup"
  ON veec_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);
```

### "Table veec_profiles does not exist"

**Solution** : Exécutez [setup_complete.sql](supabase/migrations/setup_complete.sql)

### "RLS policy violation"

**Solution** : Exécutez [fix_rls_policies.sql](supabase/migrations/fix_rls_policies.sql)

---

## 🔍 Diagnostic rapide

### Vérifier que tout fonctionne

```sql
-- 1. Table existe ?
SELECT * FROM information_schema.tables WHERE table_name = 'veec_profiles';

-- 2. RLS activé ?
SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'veec_profiles';

-- 3. Politique d'insertion correcte ?
SELECT with_check FROM pg_policies
WHERE tablename = 'veec_profiles' AND policyname = 'Allow insert during signup';
-- Doit retourner: (auth.uid() = user_id)
```

### Console du navigateur (F12)

Lors de l'inscription, vous devriez voir :
```
🔵 Étape 1: Création du compte utilisateur...
✅ Utilisateur créé: [ID]
🔵 Étape 2: Création du profil dans veec_profiles...
✅ Profil créé: [Profil]
```

Si vous voyez une **erreur rouge**, notez le code et consultez [QUICK_FIX_SIGNUP.md](QUICK_FIX_SIGNUP.md)

---

## 📊 Architecture

```
┌─────────────────────────────────────┐
│  auth.users (Supabase Auth)         │
│  - id, email, encrypted_password    │
└─────────────────────────────────────┘
              │
              │ (FK: user_id)
              ▼
┌─────────────────────────────────────┐
│  veec_profiles (Custom Table)       │
│  - user_id, email, role             │
│  - nom, prenom                      │
│  - RLS: auth.uid() = user_id        │
└─────────────────────────────────────┘
```

---

## 🔐 Rôles et permissions

| Route | user | entraineur | admin |
|-------|------|------------|-------|
| `/training`, `/matches`, `/team` | ✅ Lecture | ✅ Total | ✅ Total |
| `/position`, `/referee`, `/ai` | ❌ | ✅ Total | ✅ Total |
| `/admin/*` (sauf autorisations) | ❌ | ✅ Total | ✅ Total |
| `/admin` → Autorisations | ❌ | ❌ | ✅ Total |

---

## 🛠️ Scripts SQL disponibles

| Script | Usage |
|--------|-------|
| **setup_complete.sql** ⭐ | Installation complète (recommandé) |
| **create_veec_profiles.sql** | Création de table uniquement |
| **fix_rls_policies.sql** | Réparation des politiques RLS |

Tous dans le dossier [`supabase/migrations/`](supabase/migrations/)

---

## ✅ Checklist finale

Avant de passer en production :

- [ ] Table `veec_profiles` créée avec `setup_complete.sql`
- [ ] Au moins un compte admin créé
- [ ] Test : Inscription d'un nouveau compte
- [ ] Test : Connexion/Déconnexion
- [ ] Test : Restrictions par rôle (user ne peut pas accéder à /admin)
- [ ] Test : Gestion des autorisations (admin uniquement)
- [ ] RLS activé (JAMAIS le désactiver en production !)
- [ ] Variables `.env` configurées (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)

---

## 📖 Liens utiles

- **Documentation Supabase Auth** : https://supabase.com/docs/guides/auth
- **Documentation RLS** : https://supabase.com/docs/guides/auth/row-level-security
- **PostgreSQL Policies** : https://www.postgresql.org/docs/current/sql-createpolicy.html

---

## 🎯 En cas de doute

1. **Consultez** [QUICK_FIX_SIGNUP.md](QUICK_FIX_SIGNUP.md) pour les problèmes d'inscription
2. **Consultez** [TROUBLESHOOTING_AUTH.md](TROUBLESHOOTING_AUTH.md) pour le dépannage complet
3. **Vérifiez** les logs dans la console du navigateur (F12)
4. **Exécutez** les scripts de diagnostic SQL ci-dessus

---

**Dernière mise à jour** : 2025-12-25
**Version** : 1.0.0
