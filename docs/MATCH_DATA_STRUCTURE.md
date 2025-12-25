# Structure des Données de Match - Assistant IA

## 📊 Schéma de la table `matches`

La table `matches` dans Supabase contient les matchs de toutes les équipes VEEC avec la structure suivante :

```typescript
{
  idmatch: string,           // ID unique du match
  idequipe: string,          // ID de l'équipe VEEC (FK → VEEC_Equipes_FFVB)
  Date: string,              // Date du match (YYYY-MM-DD)
  Heure: string,             // Heure du match (HH:MM)
  Equipe_1: string,          // Nom de l'équipe à domicile
  Equipe_2: string,          // Nom de l'équipe à l'extérieur
  Domicile_Exterieur: string,// "Domicile" ou "Exterieur" (pour l'équipe VEEC)
  Salle: string,             // Nom du gymnase
  Competition: string,       // Nom de la compétition
}
```

## 🏐 Logique Domicile / Extérieur

### Principe fondamental

**L'équipe VEEC peut être soit à domicile, soit à l'extérieur.**

- `Domicile_Exterieur = "Domicile"` → L'équipe VEEC joue **chez elle**
- `Domicile_Exterieur = "Exterieur"` → L'équipe VEEC joue **en déplacement**

### Répartition dans Equipe_1 et Equipe_2

#### Convention volley-ball
- **Equipe_1** = Toujours l'équipe qui reçoit (à domicile)
- **Equipe_2** = Toujours l'équipe qui se déplace (à l'extérieur)

#### Application pour VEEC

| Domicile_Exterieur | Equipe_1 | Equipe_2 | Équipe VEEC | Adversaire |
|-------------------|----------|----------|-------------|------------|
| "Domicile" | **VEEC SM1** | Club XYZ | Equipe_1 | Equipe_2 |
| "Exterieur" | Club ABC | **VEEC SM1** | Equipe_2 | Equipe_1 |

### Exemples concrets

#### Exemple 1 : Match à domicile
```json
{
  "idequipe": "abc-123",
  "Equipe_1": "VEEC - SM1",
  "Equipe_2": "Melun VB",
  "Domicile_Exterieur": "Domicile",
  "Salle": "Gymnase Esbly"
}
```

**Interprétation :**
- ✅ VEEC SM1 joue **à domicile**
- ✅ Adversaire : **Melun VB**
- ✅ Lieu : Gymnase Esbly (gymnase VEEC)

#### Exemple 2 : Match à l'extérieur
```json
{
  "idequipe": "abc-123",
  "Equipe_1": "Paris Volley",
  "Equipe_2": "VEEC - SM1",
  "Domicile_Exterieur": "Exterieur",
  "Salle": "Gymnase Pierre de Coubertin"
}
```

**Interprétation :**
- ✅ VEEC SM1 joue **à l'extérieur**
- ✅ Adversaire : **Paris Volley**
- ✅ Lieu : Gymnase Pierre de Coubertin (gymnase adverse)

## 🔧 Implémentation dans l'Assistant IA

### Code de détermination de l'adversaire

```typescript
const isHome = match.Domicile_Exterieur?.toLowerCase() === 'domicile';
const adversaire = isHome ? match.Equipe_2 : match.Equipe_1;
```

**Logique :**
1. Vérifier si `Domicile_Exterieur = "Domicile"`
2. Si oui (à domicile) → Adversaire = `Equipe_2`
3. Si non (à l'extérieur) → Adversaire = `Equipe_1`

### Données retournées par getMatches

```typescript
{
  equipeVEEC: "Seniors Masculins 1",    // Toujours l'équipe VEEC
  numeroEquipe: "SM1",                  // Code court
  adversaire: "Melun VB",               // Calculé selon la logique
  domicileExterieur: "Domicile",        // Valeur brute
  lieu: "à domicile",                   // Format lisible en français
  salle: "Gymnase Esbly",
  date: "2025-12-28",
  heure: "20:00"
}
```

## 📝 Exemples de réponses IA

### Question : "Quel est le prochain match des SM1 ?"

**Données récupérées :**
```json
{
  "date": "2025-12-28",
  "heure": "20:00",
  "equipeVEEC": "Seniors Masculins 1",
  "numeroEquipe": "SM1",
  "adversaire": "Melun VB",
  "lieu": "à domicile",
  "salle": "Gymnase Esbly"
}
```

**Réponse formatée par l'IA :**
```
Le prochain match des SM1 est le samedi 28 décembre 2025 à 20h00.
Ils joueront à domicile contre Melun VB au Gymnase Esbly.
```

### Question : "Où joue l'équipe U18M ce week-end ?"

**Données récupérées :**
```json
{
  "date": "2025-12-29",
  "heure": "15:00",
  "equipeVEEC": "U18 Masculins",
  "numeroEquipe": "U18M",
  "adversaire": "Coulommiers VB",
  "lieu": "à l'extérieur",
  "salle": "Gymnase des Sports Coulommiers"
}
```

**Réponse formatée par l'IA :**
```
L'équipe U18M joue ce week-end le dimanche 29 décembre à 15h00.
Match à l'extérieur contre Coulommiers VB au Gymnase des Sports Coulommiers.
```

## ⚠️ Cas particuliers

### Cas 1 : Domicile_Exterieur manquant

Si `Domicile_Exterieur` est `null` ou vide :
```typescript
const adversaire = match.Equipe_2 || match.Equipe_1 || 'Adversaire inconnu';
// Fallback sur Equipe_2 par défaut
```

### Cas 2 : Valeurs inattendues

Si `Domicile_Exterieur` contient une autre valeur que "Domicile" ou "Exterieur" :
```typescript
const isHome = match.Domicile_Exterieur?.toLowerCase() === 'domicile';
// Toute autre valeur sera considérée comme "Exterieur"
```

## 🎯 Avantages de cette approche

✅ **Cohérence** : L'adversaire est toujours correctement identifié
✅ **Clarté** : Le lieu (domicile/extérieur) est explicite
✅ **Flexibilité** : Gestion des cas particuliers
✅ **Lisibilité** : Format en français pour l'utilisateur final

## 🔍 Tests de validation

### Test 1 : Match à domicile
```typescript
input: { Domicile_Exterieur: "Domicile", Equipe_1: "VEEC SM1", Equipe_2: "Adversaire" }
output: { adversaire: "Adversaire", lieu: "à domicile" }
```

### Test 2 : Match à l'extérieur
```typescript
input: { Domicile_Exterieur: "Exterieur", Equipe_1: "Adversaire", Equipe_2: "VEEC SM1" }
output: { adversaire: "Adversaire", lieu: "à l'extérieur" }
```

### Test 3 : Valeur manquante (fallback)
```typescript
input: { Domicile_Exterieur: null, Equipe_1: "A", Equipe_2: "B" }
output: { adversaire: "B", lieu: "à l'extérieur" } // Fallback
```

## 📚 Références

- Table Supabase : `matches`
- Relation FK : `idequipe` → `VEEC_Equipes_FFVB.IDEQUIPE`
- Fonction : `getMatches()` dans [aiFunctions.ts](../lib/aiFunctions.ts)
- Documentation : [AI_FIXES_TEAM_QUERIES.md](./AI_FIXES_TEAM_QUERIES.md)
