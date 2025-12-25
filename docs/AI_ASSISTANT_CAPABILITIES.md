# Assistant IA VEEC - Capacités et Exemples

## 🤖 Vue d'ensemble

L'assistant IA VEEC est un chatbot intelligent qui peut accéder aux données du club en temps réel depuis Supabase. Il comprend le contexte temporel et peut répondre à des questions avec des références relatives au temps.

## ⏰ Contexte Temporel

L'assistant connaît **toujours** la date et l'heure actuelle. Il peut donc répondre à des questions comme :

### Exemples de questions temporelles :

#### Aujourd'hui / Maintenant
- "Quels sont les entraînements aujourd'hui ?"
- "Y a-t-il des matchs ce soir ?"
- "Quel jour sommes-nous ?"

#### Demain
- "Quels entraînements ont lieu demain ?"
- "Y a-t-il des matchs demain ?"
- "Quel gymnase est utilisé demain ?"

#### Cette semaine / Semaine prochaine
- "Quels sont les matchs de cette semaine ?"
- "Combien d'entraînements la semaine prochaine ?"
- "Quand joue l'équipe U18M cette semaine ?"

#### Jours spécifiques
- "Quels sont les entraînements du mercredi ?"
- "Y a-t-il des matchs samedi prochain ?"
- "Combien d'entraînements ont lieu le lundi ?"

## 📊 Fonctions disponibles

L'assistant a accès à **7 fonctions** pour interroger la base de données :

### 1. `getCurrentDateTime`
Obtient la date et l'heure actuelles.

**Utilité :** Permet à l'assistant de savoir précisément quel jour on est.

### 2. `calculateDate`
Calcule une date relative à aujourd'hui.

**Exemples :**
- Demain = +1 jour
- Hier = -1 jour
- Semaine prochaine = +7 jours
- Le mois prochain = +1 mois

### 3. `getTrainingSessions`
Récupère les entraînements.

**Filtres disponibles :**
- `team` : Nom de l'équipe (recherche partielle)
- `day` : Jour de la semaine (lundi, mardi, etc.)
- `gym` : Nom du gymnase

**Exemples de questions :**
- "Quels sont les entraînements de l'équipe U15F ?"
- "Combien d'entraînements ont lieu au gymnase Esbly ?"
- "Liste tous les entraînements du jeudi"

### 4. `getMatches`
Récupère les matchs.

**Filtres disponibles :**
- `team` : Nom de l'équipe
- `startDate` : Date de début (YYYY-MM-DD)
- `endDate` : Date de fin (YYYY-MM-DD)
- `competition` : Nom de la compétition

**Exemples de questions :**
- "Quels sont les prochains matchs de l'équipe U18M ?"
- "Y a-t-il des matchs entre le 25 et le 31 décembre ?"
- "Quels matchs sont programmés en Régionale ?"

### 5. `getTeams`
Récupère les équipes du club.

**Filtres disponibles :**
- `search` : Recherche dans le nom ou la division

**Exemples de questions :**
- "Combien d'équipes avons-nous ?"
- "Liste toutes les équipes en Nationale"
- "Quelles sont les équipes féminines ?"

### 6. `getPlayers`
Récupère les joueurs (licenciés).

**Filtres disponibles :**
- `search` : Nom ou prénom du joueur
- `team` : Filtrer par équipe

**Exemples de questions :**
- "Combien de joueurs sont licenciés ?"
- "Trouve le joueur Dupont"
- "Liste les joueurs de l'équipe U15M"

### 7. `getStatistics`
Récupère des statistiques générales.

**Données retournées :**
- Nombre d'entraînements
- Nombre de matchs
- Nombre d'équipes
- Nombre de joueurs

**Exemples de questions :**
- "Donne-moi un aperçu du club"
- "Combien de matchs sont planifiés ?"
- "Statistiques générales du VEEC"

## 🎯 Exemples de conversations complètes

### Scénario 1 : Consultation d'entraînements

**User :** Quels sont les entraînements demain ?

**Assistant :**
1. Appelle `calculateDate({ offset: 1, unit: 'day' })` → obtient "jeudi"
2. Appelle `getTrainingSessions({ day: "jeudi" })`
3. Répond : "Voici les entraînements de demain (jeudi 26 décembre) :
   - U15F : 18h00-19h30 au gymnase Esbly
   - U18M : 19h30-21h00 au gymnase Coupvray
   - ..."

### Scénario 2 : Recherche de matchs

**User :** Quand joue l'équipe U18M cette semaine ?

**Assistant :**
1. Appelle `calculateDate({ offset: 0 })` → obtient aujourd'hui
2. Appelle `calculateDate({ offset: 7 })` → obtient dans 7 jours
3. Appelle `getMatches({ team: "U18M", startDate: "2025-12-25", endDate: "2026-01-01" })`
4. Répond avec la liste des matchs

### Scénario 3 : Statistiques

**User :** Donne-moi un aperçu du club

**Assistant :**
1. Appelle `getStatistics()`
2. Répond : "Voici les statistiques du VEEC :
   - 45 entraînements planifiés
   - 120 matchs programmés
   - 12 équipes
   - 180 joueurs licenciés"

## 🔄 Flux de traitement

1. **L'utilisateur pose une question**
2. **Le LLM analyse** la question et décide s'il a besoin de données
3. **Appel de fonction** : Le LLM demande l'exécution d'une fonction (ex: `getTrainingSessions`)
4. **Exécution** : La fonction interroge Supabase et retourne les données
5. **Synthèse** : Le LLM reçoit les données brutes et génère une réponse en langage naturel
6. **Réponse** : L'utilisateur reçoit une réponse claire et contextuelle

## 🎨 Support multi-providers

Le système fonctionne avec :
- ✅ **OpenAI** (GPT-4, GPT-4o, etc.)
- ✅ **Anthropic** (Claude 3.5 Sonnet, Claude 3 Opus, etc.)
- ✅ **Google** (Gemini 2.5, Gemini Pro, etc.)

Chaque provider utilise son propre format de function calling, géré automatiquement par le système.

## 📝 Notes importantes

- Le contexte temporel est **régénéré à chaque message** pour rester à jour
- La limite est de **5 itérations** par question pour éviter les boucles infinies
- Les appels de fonctions sont **loggés dans la console** pour le debugging
- Les données sont récupérées en **temps réel** depuis Supabase
