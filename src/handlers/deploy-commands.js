import { REST, Routes } from 'discord.js';
import { config } from '../config/config.js';
import setupHandler from './setupHandler.js';
import statsHandler from './statsHandler.js';
import configHandler from './configHandler.js';
import confessionHandler from './confessionHandler.js';

// Liste des commandes à déployer
const commands = [
  setupHandler.data,
  statsHandler.data,
  configHandler.data,
  confessionHandler.data
].filter(cmd => {
  if (!cmd) {
    console.warn('⚠️ Commande invalide détectée, elle sera ignorée');
    return false;
  }
  return true;
});

// Création de l'instance REST
const rest = new REST({ version: '10' }).setToken(config.discord.token);

// Fonction pour déployer les commandes
async function deployCommands() {
  try {
    console.log(`🔄 Début du déploiement de ${commands.length} commandes d'application (/)...`);

    // Récupérer l'ID du client depuis la configuration ou l'environnement
    const clientId = config.discord.clientId || process.env.CLIENT_ID;
    if (!clientId) {
      throw new Error('ID client non trouvé. Assurez-vous que le bot est connecté.');
    }

    // Mettre à jour les commandes globales
    const data = await rest.put(
      Routes.applicationCommands(clientId),
      { body: commands },
    );

    console.log(`✅ ${data.length} commandes d'application (/) ont été enregistrées avec succès.`);
    console.log('📝 Commandes déployées :');
    data.forEach(cmd => console.log(`- ${cmd.name} (${cmd.id})`));
    
    return data;
  } catch (error) {
    console.error('❌ Erreur lors du déploiement des commandes :', error);
    throw error;
  }
}

// Exécuter le déploiement si le script est lancé directement
if (process.argv[1] === new URL(import.meta.url).pathname) {
  deployCommands()
    .catch(console.error);
}

export default deployCommands;
