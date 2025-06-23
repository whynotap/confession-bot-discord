## 🤖 Confession Bot — Discord

**Confession Bot** est un bot Discord simple et efficace qui permet aux membres d’un serveur d’envoyer des messages anonymes appelés *confessions*, qui seront publiés automatiquement dans un salon dédié.

---

## 🔧 Fonctionnalités

- 💌 Envoi anonyme de confessions via messages privés (DM)
- 📰 Publication automatique dans un canal spécifique du serveur
- 🔒 Anonymat garanti (aucune trace d’identité de l’auteur)
- 📁 **Système de logs configurable** pour suivre les erreurs ou activités (facultatif)
- 🧼 Filtrage de contenu (optionnel)
- 🛠️ Facile à configurer et à déployer

---

## 🖥️ Prérequis

- Node.js v18+
- Un bot Discord (créé via le [portail développeur Discord](https://discord.com/developers/applications))
- Un token de bot valide
- Les permissions `Envoyer des messages` et `Lire les messages` dans le salon des confessions

---

## 🚀 Installation

1. **Clone le projet**
   ```bash
   git clone https://github.com/whynotap/confession-bot-discord.git
   cd confession-bot-discord
   npm install
   TOKEN=TOKEN_DE_TON_BOT_DISCORD
   node index.js
