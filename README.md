# VEEC Planning 2526

Déploiements automatiques 🚀

| Environnement | Domaine | Statut | Dernier déploiement |
|---------------|---------|--------|----------------------|
| **Recette**   | [recette.planning.veec.coutellec.fr](https://recette.planning.veec.coutellec.fr) | [![Deploy Recette](https://github.com/LCOUTELLEC/VEEC_Planning2526/actions/workflows/deploy-recette.yml/badge.svg?branch=recette)](https://github.com/LCOUTELLEC/VEEC_Planning2526/actions/workflows/deploy-recette.yml) | [Voir la date](./LAST_DEPLOY_RECETTE.md) |
| **Production**| [planning.veec.coutellec.fr](https://planning.veec.coutellec.fr) | [![Deploy Prod](https://github.com/LCOUTELLEC/VEEC_Planning2526/actions/workflows/deploy.yml/badge.svg?branch=main)](https://github.com/LCOUTELLEC/VEEC_Planning2526/actions/workflows/deploy.yml) | [Voir la date](./LAST_DEPLOY_PROD.md) |

<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1q_d0z27NrZInc-y-DlLcf0TnJ02bbEuI

## Run Locally

**Prerequisites:**  Node.js . 

1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`
