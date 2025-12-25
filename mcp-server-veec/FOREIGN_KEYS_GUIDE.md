# Guide d'installation des Foreign Keys

## Pourquoi ajouter des Foreign Keys ?

Les foreign keys (clés étrangères) apportent plusieurs avantages majeurs :

### 1. **Intégrité des données**
- Empêche les données orphelines (ex: un collectif qui référence une équipe inexistante)
- Garantit la cohérence entre les tables

### 2. **Performance**
- Les index sont automatiquement créés sur les colonnes FK
- Les requêtes avec JOIN sont beaucoup plus rapides
- Le cache de Supabase est optimisé

### 3. **JOINs automatiques via l'API**
Au lieu de faire 2 requêtes séparées :
```javascript
// ❌ AVANT (2 requêtes)
const { data: collectifs } = await supabase
  .from('VEEC_Collectifs')
  .select('*')
  .eq('equipe_id', 'SM4');

const licencieIds = collectifs.map(c => c.licencie_id);
const { data: licencies } = await supabase
  .from('VEEC_Licencie')
  .select('*')
  .in('id', licencieIds);
```

Vous pouvez faire 1 seule requête avec JOIN automatique :
```javascript
// ✅ APRÈS (1 requête avec JOIN)
const { data: collectifs } = await supabase
  .from('VEEC_Collectifs')
  .select(`
    *,
    equipe:VEEC_Equipes_FFVB(IDEQUIPE, NOM_FFVB),
    licencie:VEEC_Licencie(id, Nom_Licencie, Prenom_Licencie)
  `)
  .eq('equipe_id', 'SM4');
```

## Installation

### Étape 1: Ouvrir le SQL Editor de Supabase

1. Connectez-vous à votre dashboard Supabase : https://supabase.com/dashboard
2. Sélectionnez votre projet VEEC
3. Cliquez sur **SQL Editor** dans le menu de gauche
4. Cliquez sur **New query**

### Étape 2: Exécuter le script SQL

1. Copiez le contenu du fichier `foreign-keys.sql`
2. Collez-le dans l'éditeur SQL
3. Cliquez sur **Run** (ou appuyez sur `Ctrl+Enter`)

### Étape 3: Vérifier les résultats

Le script affichera :
- ✅ Les contraintes créées avec succès
- ⚠️ Les avertissements si des données orphelines sont détectées
- 📊 Un tableau récapitulatif des foreign keys

### Étape 4: En cas d'erreur "Données orphelines"

Si le script détecte des données orphelines, vous devez les corriger avant :

```sql
-- Trouver les collectifs avec equipe_id invalide
SELECT c.*, e."IDEQUIPE"
FROM "VEEC_Collectifs" c
LEFT JOIN "VEEC_Equipes_FFVB" e ON c.equipe_id = e."IDEQUIPE"
WHERE e."IDEQUIPE" IS NULL;

-- Trouver les collectifs avec licencie_id invalide
SELECT c.*, l.id
FROM "VEEC_Collectifs" c
LEFT JOIN "VEEC_Licencie" l ON c.licencie_id = l.id
WHERE l.id IS NULL;

-- Trouver les matchs avec idequipe invalide
SELECT m.*, e."IDEQUIPE"
FROM matches m
LEFT JOIN "VEEC_Equipes_FFVB" e ON m.idequipe = e."IDEQUIPE"
WHERE m.idequipe IS NOT NULL AND e."IDEQUIPE" IS NULL;
```

Corrigez ou supprimez ces enregistrements, puis ré-exécutez le script.

## Relations créées

### 1. VEEC_Collectifs → VEEC_Equipes_FFVB
```
equipe_id → IDEQUIPE
ON DELETE: CASCADE (supprimer le collectif si l'équipe est supprimée)
ON UPDATE: CASCADE (mettre à jour si le code équipe change)
```

### 2. VEEC_Collectifs → VEEC_Licencie
```
licencie_id → id
ON DELETE: CASCADE (supprimer du collectif si le licencié est supprimé)
ON UPDATE: CASCADE
```

### 3. matches → VEEC_Equipes_FFVB
```
idequipe → IDEQUIPE
ON DELETE: SET NULL (garder le match mais mettre idequipe à NULL)
ON UPDATE: CASCADE
```

## Mise à jour du MCP Server

Une fois les foreign keys créées, vous pourrez mettre à jour le serveur MCP pour utiliser les JOINs automatiques.

Voir le fichier `src/index-optimized.ts` pour la version optimisée.

## Rollback (annuler les changements)

Si vous voulez supprimer les foreign keys :

```sql
ALTER TABLE "VEEC_Collectifs" DROP CONSTRAINT IF EXISTS "fk_collectifs_equipe";
ALTER TABLE "VEEC_Collectifs" DROP CONSTRAINT IF EXISTS "fk_collectifs_licencie";
ALTER TABLE matches DROP CONSTRAINT IF EXISTS "fk_matches_equipe";

DROP INDEX IF EXISTS "idx_collectifs_equipe_id";
DROP INDEX IF EXISTS "idx_collectifs_licencie_id";
DROP INDEX IF EXISTS "idx_matches_idequipe";
```

## Support

En cas de problème, consultez :
- [Documentation Supabase sur les Foreign Keys](https://supabase.com/docs/guides/database/tables#foreign-keys)
- [PostgreSQL Foreign Key Documentation](https://www.postgresql.org/docs/current/ddl-constraints.html#DDL-CONSTRAINTS-FK)

## Tests après installation

Utilisez ce script pour tester les JOINs :

```javascript
node test-foreign-keys.js
```
