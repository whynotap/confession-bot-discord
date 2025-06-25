## 🤖 Confession Bot — Discord

**Confession Bot** est un bot Discord simple et efficace qui permet aux membres d’un serveur d’envoyer des messages anonymes appelés *confessions*, qui seront publiés automatiquement dans un salon dédié.

---

## 🔧 Fonctionnalités

- 💌 Envoi anonyme de confessions via un salon textuel
- 🔒 Anonymat garanti (aucune trace d’identité de l’auteur)
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
   token=TOKEN_DE_TON_BOT_DISCORD (config.js)
   node index.js
