# Guide de la Saisie Vocale - Assistant IA VEEC

## 🎤 Vue d'ensemble

L'assistant IA VEEC intègre une fonctionnalité de **reconnaissance vocale** qui vous permet de poser vos questions en parlant, sans avoir à taper au clavier.

## 🌐 Compatibilité navigateurs

La reconnaissance vocale utilise l'API Web Speech Recognition native des navigateurs.

### ✅ Navigateurs supportés
- **Google Chrome** (recommandé) - Support complet
- **Microsoft Edge** - Support complet
- **Safari** (macOS/iOS) - Support complet
- **Opera** - Support complet

### ❌ Navigateurs non supportés
- **Firefox** - L'API Web Speech Recognition n'est pas encore implémentée
- **Navigateurs anciens** - Versions obsolètes

> **Note :** Si votre navigateur ne supporte pas la reconnaissance vocale, le bouton micro ne sera tout simplement pas affiché.

## 🚀 Comment utiliser la saisie vocale

### 1. Activer le microphone

1. Cliquez sur le bouton **🎤** à côté de la zone de saisie
2. Lors de la première utilisation, votre navigateur vous demandera l'autorisation d'accéder au microphone
3. **Autorisez l'accès** pour activer la fonctionnalité

### 2. Parler votre question

1. Une fois activé, le bouton devient **rouge** et affiche **🎤🔴**
2. Le message "🎤 Écoute en cours... Parlez maintenant !" apparaît
3. **Parlez clairement** votre question en français
4. L'enregistrement s'arrête automatiquement quand vous arrêtez de parler

### 3. Vérifier et envoyer

1. Votre question transcrite apparaît automatiquement dans la zone de texte
2. Vous pouvez **modifier** le texte si nécessaire
3. Cliquez sur **📤** ou appuyez sur **Entrée** pour envoyer

## 💡 Conseils pour une meilleure reconnaissance

### ✅ Bonnes pratiques

- **Parlez clairement** et à un rythme normal
- **Évitez le bruit ambiant** (musique, conversations)
- **Utilisez un micro de qualité** si possible
- **Formulez des phrases complètes** plutôt que des mots isolés
- **Attendez l'indicateur rouge** avant de commencer à parler

### ❌ À éviter

- Parler trop vite ou trop lentement
- Parler dans un environnement bruyant
- Utiliser des mots techniques complexes sans articulation
- Interrompre la reconnaissance avant qu'elle ne se termine

## 📝 Exemples de questions vocales

### Questions temporelles
- *"Quels sont les entraînements demain ?"*
- *"Y a-t-il des matchs ce week-end ?"*
- *"Quels entraînements ont lieu mercredi prochain ?"*

### Recherche d'équipes
- *"Combien d'équipes avons-nous au club ?"*
- *"Quelles sont les équipes en Nationale ?"*

### Recherche de joueurs
- *"Combien de joueurs sont licenciés ?"*
- *"Liste les joueurs de l'équipe U15F"*

### Statistiques
- *"Donne-moi un aperçu du club"*
- *"Combien de matchs sont prévus ce mois-ci ?"*

## 🎨 Interface visuelle

### États du bouton micro

| État | Apparence | Description |
|------|-----------|-------------|
| **Inactif** | 🎤 (gris) | Prêt à démarrer l'écoute |
| **Écoute** | 🎤🔴 (rouge pulsant) | Enregistrement en cours |
| **Désactivé** | 🎤 (grisé) | Pendant le traitement d'un message |

### Messages d'aide

- **Mode normal** : "Entrée pour envoyer • Shift+Entrée pour nouvelle ligne • 🎤 pour parler"
- **Mode écoute** : "🎤 Écoute en cours... Parlez maintenant !" (en rouge pulsant)

## 🔧 Configuration technique

### Paramètres de reconnaissance

```javascript
- Langue : fr-FR (Français)
- Mode continu : Non
- Résultats intermédiaires : Non
- Nombre d'alternatives : 1
```

### Fonctionnement

1. **Initialisation** : Au chargement du composant, l'API Web Speech est initialisée
2. **Démarrage** : Clic sur le bouton → `recognition.start()`
3. **Capture** : La parole est convertie en texte en temps réel
4. **Résultat** : Le texte est inséré automatiquement dans le champ de saisie
5. **Arrêt** : La reconnaissance s'arrête automatiquement après quelques secondes de silence

## ⚠️ Gestion des erreurs

### Erreur "Permission refusée"

**Problème :** Vous avez refusé l'accès au microphone

**Solution :**
1. Cliquez sur l'icône **🔒** ou **🎤** dans la barre d'adresse du navigateur
2. Autorisez l'accès au microphone
3. Rechargez la page

### Erreur "Microphone non trouvé"

**Problème :** Aucun microphone n'est détecté sur votre appareil

**Solution :**
1. Vérifiez qu'un microphone est bien connecté
2. Vérifiez les paramètres système de votre microphone
3. Testez avec un autre appareil ou microphone

### Erreur "Reconnaissance non supportée"

**Problème :** Votre navigateur ne supporte pas l'API

**Solution :**
1. Utilisez Chrome, Edge ou Safari
2. Mettez à jour votre navigateur vers la dernière version
3. Utilisez la saisie clavier classique

## 🔐 Confidentialité et sécurité

### Traitement local vs cloud

- La reconnaissance vocale utilise les **services cloud** de votre navigateur (Google Speech API pour Chrome/Edge)
- L'audio est envoyé aux serveurs pour la transcription
- **Aucun enregistrement permanent** n'est conservé
- Seul le **texte transcrit** est utilisé dans l'application

### Données envoyées

- Audio temporaire (uniquement pendant la transcription)
- Aucune donnée personnelle n'est associée
- Le texte transcrit reste dans votre session locale

## 🎯 Cas d'usage recommandés

### ✅ Idéal pour

- Poser des questions rapides sur mobile
- Utilisation mains-libres
- Accessibilité pour personnes à mobilité réduite
- Environnements où taper est difficile

### ⚠️ Moins adapté pour

- Environnements bruyants (open space, stade)
- Requêtes avec beaucoup de données techniques (IDs, codes)
- Utilisation en public (confidentialité)
- Connexion internet instable

## 📱 Utilisation mobile

La reconnaissance vocale fonctionne parfaitement sur **smartphones et tablettes** :

- **iOS (Safari)** : Support complet, excellent taux de reconnaissance
- **Android (Chrome)** : Support complet, haute précision
- Interface tactile optimisée pour le bouton micro
- Particulièrement utile sur mobile où le clavier prend de la place

## 🆘 Support et dépannage

### La reconnaissance ne démarre pas

1. Vérifiez que le bouton 🎤 est visible
2. Vérifiez les permissions du microphone
3. Rechargez la page
4. Essayez avec un autre navigateur

### Le texte transcrit est incorrect

1. Parlez plus clairement et lentement
2. Réduisez le bruit ambiant
3. Vérifiez que le bon microphone est sélectionné
4. Modifiez manuellement le texte après transcription

### Le bouton micro n'apparaît pas

1. Votre navigateur ne supporte pas la fonctionnalité
2. Utilisez Chrome, Edge ou Safari
3. Utilisez la saisie clavier classique

---

**Astuce finale** : Vous pouvez **combiner** saisie vocale et clavier ! Utilisez le micro pour la question principale, puis ajustez avec le clavier si nécessaire.
