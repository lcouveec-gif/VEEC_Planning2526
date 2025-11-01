# Configuration de la page Planning des Matchs

## Vue d'ensemble

La page de planning des matchs permet de :
- Filtrer les matchs par plage de dates (début et fin)
- Filtrer par équipe
- Afficher les matchs groupés par date
- Voir les détails : heure, adversaire, domicile/extérieur, salle

## Configuration Supabase

### Étape 1 : Créer les tables

1. Allez sur https://odfijihyepuxjzeueiri.supabase.co
2. Cliquez sur "SQL Editor"
3. Copiez-collez le contenu du fichier `supabase_matches_setup.sql`
4. Cliquez sur "Run"

Cela va créer :
- **Table `VEEC_Equipe_FFVB`** : Liste des équipes du club
- **Table `matches`** : Liste des matchs avec relation vers les équipes
- **Politiques RLS** : Lecture publique autorisée
- **Données d'exemple** : Quelques équipes et matchs pour tester

### Étape 2 : Vérifier les données

Dans "Table Editor" :
- `VEEC_Equipe_FFVB` : Devrait contenir 6 équipes d'exemple
- `matches` : Devrait contenir 5 matchs d'exemple

## Structure des tables

### Table VEEC_Equipe_FFVB

| Colonne     | Type      | Description                    |
|-------------|-----------|--------------------------------|
| idequipe    | bigserial | Identifiant unique (PK)        |
| nom_equipe  | text      | Nom de l'équipe (ex: "SM1")    |
| categorie   | text      | Catégorie (ex: "Seniors M")    |
| niveau      | text      | Niveau (ex: "Régionale 1")     |
| created_at  | timestamp | Date de création               |
| updated_at  | timestamp | Date de modification           |

### Table matches

| Colonne      | Type      | Description                       |
|--------------|-----------|-----------------------------------|
| id           | bigserial | Identifiant unique (PK)           |
| idequipe     | bigint    | FK vers VEEC_Equipe_FFVB          |
| date_match   | date      | Date du match (YYYY-MM-DD)        |
| heure_match  | text      | Heure du match (HH:mm)            |
| adversaire   | text      | Nom de l'équipe adverse           |
| domicile     | boolean   | true=domicile, false=extérieur    |
| salle        | text      | Nom de la salle (optionnel)       |
| created_at   | timestamp | Date de création                  |
| updated_at   | timestamp | Date de modification              |

## Fonctionnalités

### Filtres disponibles

1. **Date de début** : Date à partir de laquelle chercher les matchs
2. **Date de fin** : Date jusqu'à laquelle chercher les matchs
3. **Équipe** : Filtrer par une équipe spécifique ou voir toutes les équipes

**Par défaut** : Affiche les matchs du début du mois en cours jusqu'à la fin du mois suivant

### Affichage des matchs

Les matchs sont :
- Groupés par date
- Triés chronologiquement
- Affichés avec :
  - Badge "Domicile" (vert) ou "Extérieur" (bleu)
  - Nom de l'équipe VEEC
  - Nom de l'adversaire
  - Salle (si renseignée)

## Fichiers créés

### Hooks React
- **[hooks/useTeams.ts](hooks/useTeams.ts)** : Charge les équipes depuis Supabase
- **[hooks/useMatches.ts](hooks/useMatches.ts)** : Charge les matchs avec filtres et jointure sur les équipes

### Composants
- **[components/MatchFilters.tsx](components/MatchFilters.tsx)** : Filtres de date et équipe
- **[components/MatchList.tsx](components/MatchList.tsx)** : Affichage de la liste des matchs
- **[components/MatchSchedule.tsx](components/MatchSchedule.tsx)** : Page principale avec filtres et liste

### Types TypeScript
- **[types.ts](types.ts)** : Interfaces `Team` et `Match`

## Ajouter des matchs

### Via l'interface Supabase

1. Allez dans "Table Editor"
2. Sélectionnez la table `matches`
3. Cliquez sur "Insert" > "Insert row"
4. Remplissez les champs :
   - `idequipe` : ID de l'équipe (sélectionner depuis VEEC_Equipe_FFVB)
   - `date_match` : YYYY-MM-DD
   - `heure_match` : HH:mm
   - `adversaire` : Nom de l'équipe adverse
   - `domicile` : true ou false
   - `salle` : Nom de la salle (optionnel)

### Via SQL

```sql
INSERT INTO matches (idequipe, date_match, heure_match, adversaire, domicile, salle)
VALUES (1, '2025-12-15', '20:00', 'PARIS VB', true, 'Gymnase Coupvray');
```

## Prochaines évolutions possibles

- Export PDF du planning des matchs
- Système de notifications pour les prochains matchs
- Affichage des résultats (score)
- Intégration avec la FFVB
- Gestion des absences joueurs
- Statistiques par équipe

## Dépannage

### Les équipes ne s'affichent pas dans le filtre
- Vérifiez que la table `VEEC_Equipe_FFVB` contient des données
- Vérifiez la politique RLS dans Supabase

### Les matchs ne s'affichent pas
- Vérifiez que la table `matches` contient des données
- Vérifiez que les dates des matchs correspondent à la plage de dates sélectionnée
- Vérifiez la foreign key `idequipe` pointe vers une équipe existante
- Consultez la console du navigateur (F12) pour les erreurs

### Erreur "relation does not exist"
- Les tables n'ont pas été créées dans Supabase
- Exécutez le script `supabase_matches_setup.sql`
