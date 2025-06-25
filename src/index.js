import { Client, GatewayIntentBits, Partials, Collection } from 'discord.js';
import { config, configManager } from './config/config.js';
import setupHandler from './handlers/setupHandler.js';
import statsHandler from './handlers/statsHandler.js';
import confessionHandler from './handlers/confessionHandler.js';

// Configuration du client Discord
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.DirectMessages
  ],
  partials: [
    Partials.Channel,
    Partials.Message,
    Partials.Reaction
  ]
});

// Attendre que la configuration soit chargée
await configManager.load();

// Initialisation des commandes
client.commands = new Collection();
const commandFiles = [
  setupHandler,
  statsHandler,
  confessionHandler
].filter(cmd => {
  if (!cmd.data) {
    console.error('Commande invalide - propriété data manquante:', cmd);
    return false;
  }
  return true;
});

// Enregistrement des commandes
commandFiles.forEach(command => {
  client.commands.set(command.data.name, command);
});

// Événement prêt
client.once('ready', async () => {
  console.log(`✅ Connecté en tant que ${client.user.tag}!`);
  
  try {
    // Enregistrement des commandes slash
    const { REST, Routes } = await import('discord.js');
    const rest = new REST({ version: '10' }).setToken(config.discord.token);
    
    // Enregistrement des commandes globales
    try {
      const commands = commandFiles.map(cmd => cmd.data);
      
      if (commands.length > 0) {
        await rest.put(
          Routes.applicationCommands(client.user.id),
          { body: commands }
        );
        console.log(`✅ ${commands.length} commande(s) enregistrée(s) avec succès!`);
      } else {
        console.warn('⚠️ Aucune commande valide à enregistrer');
      }
    } catch (error) {
      console.error('❌ Erreur lors de l\'enregistrement des commandes:', error);
    }
    
    // Mettre à jour les informations du bot dans la configuration
    await configManager.update('discord.clientId', client.user.id);
  } catch (error) {
    console.error('❌ Erreur lors de l\'enregistrement des commandes:', error);
  }
});

// Gestion des interactions
client.on('interactionCreate', async interaction => {
  // Vérifier si l'interaction est déjà traitée ou non valide
  if (!interaction || !interaction.guild) return;

  // Fonction utilitaire pour gérer les erreurs
  const handleError = async (error, interaction, context = 'interaction inconnue') => {
    console.error(`❌ Erreur lors du traitement de ${context}:`, error);
    
    // Si pas d'interaction, on ne peut rien faire
    if (!interaction) {
      console.log('Aucune interaction fournie, abandon de la gestion d\'erreur');
      return;
    }
    
    // Vérifier si l'interaction est toujours valide et reproductible
    const isRepliable = interaction.isRepliable?.();
    if (!isRepliable) {
      console.log('Interaction non reproductible, abandon de la gestion d\'erreur');
      return;
    }
    
    // Ignorer les erreurs d'interaction inconnue ou expirée
    if (error.code === 10062 || error.code === 'INTERACTION_EXPIRED' || 
        error.message?.includes('Unknown Interaction') || 
        error.message?.includes('interaction has already been acknowledged')) {
      console.log('Interaction expirée ou déjà traitée, abandon de la gestion d\'erreur');
      return;
    }
    
    try {
      const errorMessage = {
        content: '❌ Une erreur est survenue. Veuillez réessayer plus tard.',
        ephemeral: true
      };
      
      console.log(`Tentative d'envoi d'un message d'erreur pour ${context}`);
      
      // Essayer d'abord avec editReply si l'interaction est déjà différée
      if (interaction.deferred) {
        console.log('Utilisation de editReply');
        await interaction.editReply(errorMessage).catch(console.error);
      } 
      // Sinon essayer avec followUp si déjà répondu
      else if (interaction.replied) {
        console.log('Utilisation de followUp');
        await interaction.followUp(errorMessage).catch(console.error);
      } 
      // En dernier recours, essayer avec reply
      else {
        console.log('Utilisation de reply');
        await interaction.reply(errorMessage).catch(console.error);
      }
    } catch (nestedError) {
      console.error('❌ Impossible d\'envoyer le message d\'erreur:', nestedError);
    }
  };

  try {
    // Gestion des commandes slash
    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);
      
      if (!command) {
        console.error(`Aucune commande ${interaction.commandName} n'a été trouvée.`);
        return;
      }
      
      try {
        console.log(`Exécution de la commande: ${interaction.commandName}`);
        await command.execute(interaction);
      } catch (error) {
        console.error(`Erreur lors de l'exécution de la commande ${interaction.commandName}:`, error);
        await handleError(error, interaction, `la commande ${interaction.commandName}`);
      }
      return;
    }

    // Gestion des menus de sélection
    if (interaction.isStringSelectMenu()) {
      try {
        if (interaction.customId === 'setup_select') {
          return await setupHandler.handleInteraction?.(interaction);
        }
      } catch (error) {
        await handleError(error, 'le menu de sélection');
      }
      return;
    }

    // Gestion des modaux (confessions et réponses)
    if (interaction.isModalSubmit()) {
      console.log('Traitement du modal:', interaction.customId);
      
      try {
        // Pas de setTimeout, on traite immédiatement
        if (interaction.customId === 'submit_confession') {
          console.log('Appel de handleConfessionSubmit');
          await confessionHandler.handleConfessionSubmit(interaction);
        } else if (interaction.customId.startsWith('reply_')) {
          console.log('Appel de handleReplySubmit');
          await confessionHandler.handleReplySubmit(interaction);
        }
      } catch (error) {
        console.error('Erreur lors du traitement du modal:', error);
        await handleError(error, interaction, 'le formulaire modal');
      }
      
      return;
    }

    // Gestion des boutons (réponses aux confessions)
    if (interaction.isButton()) {
      console.log('Traitement du bouton:', interaction.customId);
      
      try {
        if (interaction.customId === 'open_modal') {
          console.log('Appel de execute (bouton open_modal)');
          await confessionHandler.execute(interaction);
        } else if (interaction.customId.startsWith('reply_')) {
          console.log('Appel de handleReplyButton');
          await confessionHandler.handleReplyButton(interaction);
        }
      } catch (error) {
        console.error('Erreur lors du traitement du bouton:', error);
        await handleError(error, interaction, 'le bouton');
      }
      
      return;
    }
    
  } catch (error) {
    await handleError(error, 'l\'interaction');
  }
});

// Gestion des erreurs non capturées
process.on('unhandledRejection', error => {
  console.error('❌ Erreur non gérée (promesse rejetée):', error);
});

process.on('uncaughtException', error => {
  console.error('❌ Erreur non capturée:', error);
});

// Connexion du bot
client.login(config.discord.token)
  .then(() => console.log('🔑 Connexion au serveur Discord établie avec succès!'))
  .catch(error => {
    console.error('❌ Échec de la connexion au serveur Discord:', error);
    process.exit(1);
  });
