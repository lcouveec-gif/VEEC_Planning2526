# 📚 Index des fichiers Foreign Keys

Tous les fichiers nécessaires pour installer et tester les foreign keys dans votre base de données VEEC.

## 🚀 Démarrage rapide

**Vous voulez juste installer les FK ? Suivez ce guide :**

👉 **[INSTALLATION_FK_RAPIDE.md](INSTALLATION_FK_RAPIDE.md)** ⏱️ 5 minutes

## 📁 Fichiers disponibles

### 📖 Documentation

| Fichier | Description | Quand l'utiliser |
|---------|-------------|------------------|
| **[INSTALLATION_FK_RAPIDE.md](INSTALLATION_FK_RAPIDE.md)** | Guide d'installation en 5 minutes | ⭐ Commencez ici |
| **[README_FOREIGN_KEYS.md](README_FOREIGN_KEYS.md)** | Documentation complète avec FAQ | Pour comprendre en détail |
| **[FOREIGN_KEYS_GUIDE.md](FOREIGN_KEYS_GUIDE.md)** | Guide technique approfondi | Pour aller plus loin |
| **INDEX_FK.md** (ce fichier) | Table des matières | Pour naviguer |

### 🔧 Scripts SQL

| Fichier | Description | Usage |
|---------|-------------|-------|
| **[foreign-keys.sql](foreign-keys.sql)** | Script complet avec vérifications | À exécuter dans Supabase SQL Editor |

### 🧪 Scripts de test JavaScript

| Fichier | Description | Commande |
|---------|-------------|----------|
| **[check-orphan-data.js](check-orphan-data.js)** | Vérifie les données orphelines **AVANT** installation | `node check-orphan-data.js` |
| **[test-foreign-keys.js](test-foreign-keys.js)** | Teste que les FK sont bien installées **APRÈS** | `node test-foreign-keys.js` |
| **[analyse-schema.js](analyse-schema.js)** | Analyse la structure des tables | `node analyse-schema.js` |
| **[test-final.js](test-final.js)** | Test de la logique MCP Server | `node test-final.js` |

## 🎯 Parcours recommandé

### Étape 1: Préparation (optionnel)
```bash
# Vérifier qu'il n'y a pas de données orphelines
node check-orphan-data.js
```
Résultat attendu: ✅ Aucune donnée orpheline détectée

### Étape 2: Installation
1. Lisez **[INSTALLATION_FK_RAPIDE.md](INSTALLATION_FK_RAPIDE.md)**
2. Copiez le script SQL dans Supabase SQL Editor
3. Exécutez

### Étape 3: Vérification
```bash
# Tester que tout fonctionne
node test-foreign-keys.js
```
Résultat attendu: ✅ 4/4 tests réussis

### Étape 4: Validation finale
```bash
# Vérifier que le MCP Server fonctionne toujours
node test-final.js
```
Résultat attendu: ✅ 13 joueurs SM4 récupérés

## 📊 Votre base de données

D'après `check-orphan-data.js`, votre base contient:
- ✅ **19 équipes** (M13G2, M13F, M15G, M15F1, PVA, SM1-4, SF1-3, M18F1-2, M18G1-2, L6R)
- ✅ **383 licenciés** inscrits
- ✅ **53 collectifs** (joueurs assignés aux équipes)
- ✅ **231 matchs** dans l'historique
- ✅ **Aucune donnée orpheline**

## 🔑 Foreign Keys à installer

Le script `foreign-keys.sql` va créer **3 foreign keys** :

### 1. Collectifs → Équipes
```
VEEC_Collectifs.equipe_id → VEEC_Equipes_FFVB.IDEQUIPE
```
Impact: Relie chaque collectif à son équipe (ex: SM4)

### 2. Collectifs → Licenciés
```
VEEC_Collectifs.licencie_id → VEEC_Licencie.id
```
Impact: Relie chaque membre du collectif à sa fiche licencié

### 3. Matchs → Équipes
```
matches.idequipe → VEEC_Equipes_FFVB.IDEQUIPE
```
Impact: Relie chaque match à son équipe

## 📈 Gains attendus

Basé sur les tests de performance :

| Métrique | Avant | Après | Gain |
|----------|-------|-------|------|
| Temps de requête (joueurs SM4) | ~90ms | ~45ms | **50% plus rapide** |
| Nombre de requêtes | 2 | 1 | **50% moins de requêtes** |
| Intégrité des données | ❌ Non garantie | ✅ Garantie | 100% |
| Possibilité de JOIN auto | ❌ Non | ✅ Oui | ∞ |

## 🛠️ Maintenance

### Vérifier l'état des FK

Dans Supabase SQL Editor :
```sql
SELECT
    tc.table_name,
    tc.constraint_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    rc.update_rule,
    rc.delete_rule
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
JOIN information_schema.referential_constraints AS rc
    ON tc.constraint_name = rc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema = 'public'
    AND tc.table_name IN ('VEEC_Collectifs', 'matches');
```

### Supprimer les FK (rollback)

Si besoin d'annuler :
```sql
ALTER TABLE "VEEC_Collectifs" DROP CONSTRAINT IF EXISTS "fk_collectifs_equipe";
ALTER TABLE "VEEC_Collectifs" DROP CONSTRAINT IF EXISTS "fk_collectifs_licencie";
ALTER TABLE matches DROP CONSTRAINT IF EXISTS "fk_matches_equipe";

DROP INDEX IF EXISTS "idx_collectifs_equipe_id";
DROP INDEX IF EXISTS "idx_collectifs_licencie_id";
DROP INDEX IF EXISTS "idx_matches_idequipe";
```

## 💡 Conseils

### Avant l'installation
- ✅ Lisez `INSTALLATION_FK_RAPIDE.md` (5 min)
- ✅ Exécutez `node check-orphan-data.js` (optionnel)
- ✅ Faites une sauvegarde de votre base (Dashboard > Settings > Backups)

### Pendant l'installation
- ⏱️ L'installation prend ~5-10 secondes
- 📊 Suivez les messages dans le SQL Editor
- ✅ Vérifiez qu'il n'y a pas d'erreur

### Après l'installation
- ✅ Testez avec `node test-foreign-keys.js`
- ✅ Vérifiez le MCP Server avec `node test-final.js`
- 📈 Surveillez les performances dans Supabase Dashboard

## 🆘 Support

En cas de problème :

1. **Erreur "données orphelines"**
   → Consultez la section "Données orphelines" dans `FOREIGN_KEYS_GUIDE.md`

2. **Erreur "constraint already exists"**
   → Les FK sont déjà installées, tout va bien!

3. **Tests échouent après installation**
   → Vérifiez les noms des contraintes dans Supabase Dashboard > Database > Tables

4. **Performances dégradées**
   → Vérifiez que les index sont créés (voir "Vérifier l'état des FK" ci-dessus)

## 📚 Ressources externes

- [Supabase Foreign Keys Docs](https://supabase.com/docs/guides/database/tables#foreign-keys)
- [PostgreSQL FK Documentation](https://www.postgresql.org/docs/current/ddl-constraints.html#DDL-CONSTRAINTS-FK)
- [Supabase Database Performance](https://supabase.com/docs/guides/database/performance)

---

**Prêt à commencer ?** 👉 [INSTALLATION_FK_RAPIDE.md](INSTALLATION_FK_RAPIDE.md)
