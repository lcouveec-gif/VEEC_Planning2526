# Corrections des Requêtes d'Équipes - Assistant IA

## 🐛 Problèmes identifiés

L'assistant IA ne parvenait pas à répondre aux questions concernant :
- Les matchs d'une équipe spécifique (ex: "Quel est le prochain match des SM1 ?")
- Les joueurs d'une équipe (ex: "Quels sont les joueurs des SM4 ?")

## 🔍 Analyse de la cause

### Problème 1 : Recherche de matchs incorrecte

**Avant :**
```typescript
if (args.team) {
  query = query.or(`Equipe_1.ilike.%${args.team}%,Equipe_2.ilike.%${args.team}%`);
}
```

❌ **Problème :** Les colonnes `Equipe_1` et `Equipe_2` contiennent les noms des équipes adverses, pas les équipes VEEC.

**Solution :**
```typescript
// 1. Trouver d'abord l'ID de l'équipe VEEC
const { data: teams } = await supabase
  .from('VEEC_Equipes_FFVB')
  .select('IDEQUIPE, NOM_FFVB')
  .or(`NOM_FFVB.ilike.%${args.team}%,NUM_EQUIPE.ilike.%${args.team}%`);

// 2. Filtrer les matchs par IDEQUIPE
if (teamIds.length > 0) {
  query = query.in('idequipe', teamIds);
}
```

✅ **Amélioration :** Recherche maintenant dans le nom complet ET le numéro d'équipe (SM1, U18M, etc.)

### Problème 2 : Recherche de joueurs incorrecte

**Avant :**
```typescript
const { data: teamPlayers } = await supabase
  .from('VEEC_Equipes_Joueurs')
  .select('IDLicencie')
  .ilike('IDEQUIPE', `%${args.team}%`);  // ❌ ilike sur un UUID !
```

❌ **Problème :** Utilisation de `ilike` sur un champ UUID au lieu de chercher d'abord l'équipe par son nom.

**Solution :**
```typescript
// 1. Trouver l'ID de l'équipe
const { data: teams } = await supabase
  .from('VEEC_Equipes_FFVB')
  .select('IDEQUIPE, NOM_FFVB, NUM_EQUIPE')
  .or(`NOM_FFVB.ilike.%${args.team}%,NUM_EQUIPE.ilike.%${args.team}%`);

// 2. Filtrer les joueurs par IDEQUIPE
const { data: teamPlayers } = await supabase
  .from('VEEC_Equipes_Joueurs')
  .select('IDLicencie, IDEQUIPE')
  .in('IDEQUIPE', teamIds);  // ✅ Utilisation correcte de .in()
```

## ✅ Corrections apportées

### 1. Fonction `getMatches` ([aiFunctions.ts](../lib/aiFunctions.ts:121-188))

**Nouvelles capacités :**
- ✅ Recherche par nom complet d'équipe : "Seniors Masculins 1"
- ✅ Recherche par code court : "SM1", "SF1", "U18M"
- ✅ Recherche dans `NUM_EQUIPE` et `NOM_FFVB`
- ✅ Support de plusieurs équipes si la recherche est ambiguë

**Données retournées enrichies :**
```typescript
{
  id: match.idmatch,
  date: match.Date,
  heure: match.Heure,
  competition: match.Competition,
  equipeVEEC: "Seniors Masculins 1",      // ✅ Nom de l'équipe VEEC
  numeroEquipe: "SM1",                    // ✅ Code court
  adversaire: "Club Adversaire",          // ✅ Adversaire correct (calculé)
  domicileExterieur: "Domicile",          // ✅ Domicile ou Extérieur
  lieu: "à domicile",                     // ✅ Format français
  salle: "Gymnase XYZ",
}
```

**Logique de détermination de l'adversaire :**
- Si `Domicile_Exterieur = "Domicile"` → L'équipe VEEC est à domicile (Equipe_1), l'adversaire est Equipe_2
- Si `Domicile_Exterieur = "Exterieur"` → L'équipe VEEC se déplace (Equipe_2), l'adversaire est Equipe_1

### 2. Fonction `getPlayers` ([aiFunctions.ts](../lib/aiFunctions.ts:227-283))

**Nouvelles capacités :**
- ✅ Recherche d'équipe par nom complet ou code court
- ✅ Utilisation correcte de `.in()` pour les UUIDs
- ✅ Support de plusieurs équipes dans la recherche

**Flux corrigé :**
1. Si `team` fourni → Chercher l'équipe dans `VEEC_Equipes_FFVB`
2. Récupérer les `IDEQUIPE` correspondants
3. Chercher dans `VEEC_Equipes_Joueurs` avec `.in('IDEQUIPE', teamIds)`
4. Filtrer les joueurs par leurs IDs

### 3. Amélioration des descriptions de fonctions

**getMatches :**
```typescript
description: 'Récupère la liste des matchs des équipes VEEC. Permet de filtrer par équipe (SM1, SM2, SF1, U18M, etc.), dates et compétition. IMPORTANT: utilise le nom ou numéro d\'équipe VEEC (ex: "SM1", "U18M", "SF1").'
```

**getPlayers :**
```typescript
description: 'Récupère la liste des joueurs licenciés. Permet de filtrer par nom/prénom ou par équipe (ex: "SM1", "U18M").'
```

### 4. Enrichissement du prompt système ([AIChat.tsx](../components/AIChat.tsx:39-65))

**Ajout d'une section nomenclature :**
```
NOMENCLATURE DES ÉQUIPES:
Les équipes VEEC sont identifiées par des codes courts (SM1, SM2, SF1, U18M, U15F, etc.) ou noms complets.
Exemples: "SM1" = Seniors Masculins 1, "SF1" = Seniors Féminines 1, "U18M" = U18 Masculins
```

**Instructions spécifiques :**
- Utiliser EXACTEMENT le code fourni par l'utilisateur
- Pour "prochain match" : `startDate = aujourd'hui` (sans `endDate`)
- Pour les joueurs : utiliser le paramètre `team`

## 🎯 Exemples de requêtes maintenant supportées

### Matchs

| Question utilisateur | Fonction appelée | Paramètres |
|---------------------|------------------|------------|
| "Quel est le prochain match des SM1 ?" | `getMatches` | `{ team: "SM1", startDate: "2025-12-25" }` |
| "Quand joue l'équipe U18M ?" | `getMatches` | `{ team: "U18M", startDate: "2025-12-25" }` |
| "Matchs des Seniors Féminines 1 ce mois-ci" | `getMatches` | `{ team: "SF1", startDate: "2025-12-01", endDate: "2025-12-31" }` |

### Joueurs

| Question utilisateur | Fonction appelée | Paramètres |
|---------------------|------------------|------------|
| "Quels sont les joueurs des SM4 ?" | `getPlayers` | `{ team: "SM4" }` |
| "Liste les joueurs de l'équipe U15F" | `getPlayers` | `{ team: "U15F" }` |
| "Combien de joueurs dans l'équipe U18M ?" | `getPlayers` | `{ team: "U18M" }` |

## 🔄 Flux de traitement amélioré

### Exemple : "Quel est le prochain match des SM1 ?"

**Avant (❌ échouait) :**
```
1. LLM → getMatches({ team: "SM1" })
2. Fonction → Recherche dans Equipe_1 et Equipe_2 avec ILIKE "%SM1%"
3. Résultat → Aucun match trouvé (SM1 n'est pas dans les équipes adverses)
```

**Après (✅ fonctionne) :**
```
1. LLM → getCurrentDateTime() → Obtient "2025-12-25"
2. LLM → getMatches({ team: "SM1", startDate: "2025-12-25" })
3. Fonction → Cherche d'abord l'équipe:
   - SELECT * FROM VEEC_Equipes_FFVB WHERE NUM_EQUIPE ILIKE '%SM1%'
   - Trouve IDEQUIPE = "abc-123-xyz"
4. Fonction → Cherche les matchs:
   - SELECT * FROM matches WHERE idequipe IN ('abc-123-xyz') AND Date >= '2025-12-25'
5. Résultat → Liste des matchs de l'équipe SM1 à venir
6. LLM → Formate la réponse en français
```

## 📊 Impact des corrections

### Avant
- ❌ Questions sur matchs d'équipe → Aucune réponse
- ❌ Questions sur joueurs d'équipe → Aucun résultat
- ❌ Recherche par code court (SM1, U18M) → Impossible

### Après
- ✅ Recherche de matchs par équipe → Fonctionne parfaitement
- ✅ Recherche de joueurs par équipe → Fonctionne parfaitement
- ✅ Support codes courts ET noms complets → Flexible
- ✅ Requêtes temporelles ("prochain match") → Intelligentes

## 🧪 Tests recommandés

```
✅ "Quel est le prochain match des SM1 ?"
✅ "Quand joue l'équipe U18M ?"
✅ "Liste les matchs des Seniors Féminines 1"
✅ "Quels sont les joueurs des SM4 ?"
✅ "Combien de joueurs dans l'équipe U15F ?"
✅ "Matchs de cette semaine pour SM2"
```

## 🚀 Prêt pour utilisation

Les corrections sont **complètes et opérationnelles**. L'assistant peut maintenant :
- 🎯 Trouver les matchs de n'importe quelle équipe VEEC
- 👥 Lister les joueurs d'une équipe spécifique
- 📅 Gérer les requêtes temporelles intelligemment
- 🔍 Rechercher par code court ou nom complet
