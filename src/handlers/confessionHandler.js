import { 
  SlashCommandBuilder, 
  ModalBuilder, 
  TextInputBuilder, 
  TextInputStyle, 
  ActionRowBuilder,
  EmbedBuilder,
  PermissionFlagsBits
} from 'discord.js';
import { config, configManager } from '../config/config.js';

const confessionCommand = {
  data: new SlashCommandBuilder()
    .setName('confession')
    .setDescription('Faire une confession anonyme')
    .setDefaultMemberPermissions(PermissionFlagsBits.SendMessages)
    .toJSON(),

  /**
   * Exécute la commande de confession
   * @param {import('discord.js').CommandInteraction} interaction - L'interaction de commande
   */
  async execute(interaction) {
    // Vérifier si l'interaction est toujours valide
    if (!interaction?.isCommand?.()) {
      console.log('Interaction invalide dans execute');
      return;
    }

    // Vérifier si le salon de confessions est configuré
    if (!config.channels?.confession) {
      return interaction.reply({
        content: '❌ Le salon des confessions n\'est pas configuré. Un administrateur doit d\'abord configurer le bot avec la commande `/setup`.',
        ephemeral: true
      }).catch(console.error);
    }

    // Vérifier si la commande est utilisée dans le bon salon
    if (interaction.channelId !== config.channels.confession) {
      // Essayer d'obtenir la mention du salon de confessions
      let confessionChannelMention = 'le salon de confessions';
      try {
        const channel = await interaction.guild.channels.fetch(config.channels.confession);
        if (channel) {
          confessionChannelMention = channel.toString();
        }
      } catch (error) {
        console.error('Erreur lors de la récupération du salon de confessions:', error);
      }

      return interaction.reply({
        content: `❌ Cette commande ne peut être utilisée que dans ${confessionChannelMention}.`,
        ephemeral: true
      }).catch(console.error);
    }

    try {
      // Créer le modal de soumission de confession
      const modal = new ModalBuilder()
        .setCustomId('submit_confession')
        .setTitle('Faire une confession');

      // Ajouter les champs de texte
      const confessionInput = new TextInputBuilder()
        .setCustomId('confession')
        .setLabel('Votre confession (max 1500 caractères)')
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true)
        .setMinLength(10)
        .setMaxLength(1500)
        .setPlaceholder('Écrivez votre confession ici...');

      const row = new ActionRowBuilder().addComponents(confessionInput);
      modal.addComponents(row);

      try {
        // Afficher directement le modal sans répondre d'abord
        await interaction.showModal(modal);
        console.log('Modal affiché avec succès');
      } catch (error) {
        console.error('Erreur lors de l\'affichage du modal:', error);
        
        // Ne pas essayer de répondre si l'interaction a déjà été traitée
        if (error.code === 10062 || error.code === 40060) return;
        
        try {
          if (interaction.replied || interaction.deferred) {
            await interaction.followUp({
              content: '❌ Impossible d\'afficher le formulaire. Veuillez réessayer.',
              ephemeral: true
            });
          } else {
            await interaction.reply({
              content: '❌ Impossible d\'afficher le formulaire. Veuillez réessayer.',
              ephemeral: true
            });
          }
        } catch (e) {
          console.error('Impossible d\'envoyer le message d\'erreur:', e);
        }
      }
      
    } catch (error) {
      console.error('Erreur inattendue dans la commande confession:', error);
      
      // Ne pas essayer de répondre si l'interaction a déjà été traitée
      if (error.code === 10062 || error.code === 40060) return;
      
      try {
        if (!interaction.replied && !interaction.deferred) {
          await interaction.reply({
            content: '❌ Une erreur est survenue lors de l\'affichage du formulaire. Veuillez réessayer.',
            ephemeral: true
          });
        } else if (interaction.deferred) {
          await interaction.editReply({
            content: '❌ Une erreur est survenue lors de l\'affichage du formulaire. Veuillez réessayer.'
          });
        }
      } catch (e) {
        console.error('Impossible d\'envoyer le message d\'erreur:', e);
      }
    }
  },

  /**
   * Gère les interactions du gestionnaire de confessions
   * @param {import('discord.js').Interaction} interaction - L'interaction à gérer
   */
  async handleInteraction(interaction) {
    // Gestion de la soumission du modal de confession
    if (interaction.isModalSubmit() && interaction.customId === 'submit_confession') {
      return this.handleConfessionSubmit(interaction);
    }
  },

  /**
   * Traite la soumission d'une confession
   * @param {import('discord.js').ModalSubmitInteraction} interaction - L'interaction de soumission du modal
   */
  async handleConfessionSubmit(interaction) {
    console.log('Traitement de la soumission de confession');
    
    // Vérifier si l'interaction est valide
    if (!interaction?.isModalSubmit?.()) {
      console.log('Interaction de modal invalide, abandon');
      return;
    }

    // Vérifier si l'interaction a déjà été traitée
    if (interaction.replied || interaction.deferred) {
      console.log('Interaction déjà traitée, abandon');
      return;
    }

    // Répondre immédiatement à l'interaction
    await interaction.deferReply({ ephemeral: true });
    
    try {
      const confessionText = interaction.fields.getTextInputValue('confession');
      
      // Vérifier si le salon de confession est configuré
      if (!config.channels?.confession) {
        console.error('Aucun salon de confession configuré');
        await interaction.editReply({
          content: '❌ Le salon des confessions n\'est pas configuré. Veuillez contacter un administrateur.'
        });
        return;
      }
      
      // Récupérer le salon de confession
      console.log('Récupération du salon de confession:', config.channels.confession);
      let confessionChannel;
      try {
        confessionChannel = await interaction.guild.channels.fetch(config.channels.confession);
        if (!confessionChannel) throw new Error('Salon de confession introuvable');
        
        // Vérifier les permissions d'envoi dans le salon
        if (!confessionChannel.permissionsFor(interaction.guild.members.me).has('SendMessages')) {
          throw new Error('Pas la permission d\'envoyer des messages dans le salon de confessions');
        }
      } catch (error) {
        console.error('Erreur lors de la récupération du salon de confession:', error);
        await interaction.editReply({
          content: '❌ Impossible de publier la confession. ' +
                 'Veuillez vérifier que le salon est accessible et que le bot a les permissions nécessaires.'
        });
        return;
      }
      
      // Incrémenter le compteur de confessions
      console.log('Incrémentation du compteur de confessions');
      let confessionNumber;
      try {
        confessionNumber = await configManager.increment('stats.confessionCount');
      } catch (error) {
        console.error('Erreur lors de l\'incrémentation du compteur:', error);
        confessionNumber = '?';
        // On continue même si l'incrémentation échoue
      }
      
      // Créer et envoyer la confession
      try {
        // Créer l'embed de la confession
        const embed = new EmbedBuilder()
          .setColor('#9C27B0')
          .setTitle(`Confession #${confessionNumber}`)
          .setDescription(confessionText)
          .setTimestamp();
        
        // Envoyer la confession dans le salon dédié
        await confessionChannel.send({ embeds: [embed] });
        console.log(`Confession #${confessionNumber} publiée avec succès`);
        
        // Confirmer à l'utilisateur
        await interaction.editReply({
          content: '✅ Votre confession a été publiée avec succès!',
          ephemeral: true
        });
        
        // Enregistrer dans les logs
        if (config.channels.logs) {
          try {
            await this.logAction(
              interaction,
              'Nouvelle confession',
              `Confession #${confessionNumber} publiée dans ${confessionChannel}`
            );
            console.log('Confession enregistrée dans les logs');
          } catch (error) {
            console.error('Erreur lors de l\'enregistrement dans les logs:', error);
            // On continue même si l'enregistrement des logs échoue
          }
        }
        
      } catch (error) {
        console.error('Erreur lors de la publication de la confession:', error);
        
        // Message d'erreur détaillé pour la console
        const errorMessage = error.code === 50013 
          ? 'Erreur de permissions. Vérifiez les permissions du bot.'
          : error.message || 'Erreur inconnue';
        
        console.error('Détails de l\'erreur:', {
          code: error.code,
          message: errorMessage,
          stack: error.stack
        });
        
        // Message utilisateur adapté
        let userMessage = '❌ Une erreur est survenue lors du traitement de votre confession. ';
        if (error.code === 50013) {
          userMessage += 'Le bot n\'a pas les permissions nécessaires pour effectuer cette action.';
        } else {
          userMessage += 'Veuillez réessayer plus tard.';
        }
        
        // Envoyer le message d'erreur à l'utilisateur
        try {
          if (interaction.replied || interaction.deferred) {
            await interaction.editReply({ content: userMessage });
          } else {
            await interaction.reply({ 
              content: userMessage,
              ephemeral: true 
            });
          }
        } catch (replyError) {
          console.error('Impossible d\'envoyer le message d\'erreur:', replyError);
        }
        
        // Journaliser l'erreur
        try {
          await this.logAction(
            interaction,
            'Erreur de soumission de confession',
            `Erreur lors de la soumission d'une confession: ${errorMessage}`
          );
        } catch (logError) {
          console.error('Échec de la journalisation de l\'erreur:', logError);
        }
      }
    } catch (error) {
      console.error('Erreur critique lors du traitement de la confession:', error);
      
      // Message d'erreur détaillé pour la console
      const errorMessage = error.code === 50013 
        ? 'Erreur de permissions. Vérifiez les permissions du bot.'
        : error.message || 'Erreur inconnue';
      
      console.error('Détails de l\'erreur critique:', {
        code: error.code,
        message: errorMessage,
        stack: error.stack
      });
      
      // Message utilisateur adapté
      let userMessage = '❌ Une erreur critique est survenue lors du traitement de votre confession. ';
      if (error.code === 50013) {
        userMessage += 'Le bot n\'a pas les permissions nécessaires pour effectuer cette action.';
      } else if (error.code === 10062) {
        userMessage += 'L\'interaction a expiré. Veuillez réessayer en créant une nouvelle confession.';
      } else {
        userMessage += 'Veuillez contacter un administrateur si le problème persiste.';
      }
      
      // Envoyer le message d'erreur à l'utilisateur
      try {
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp({ 
            content: userMessage,
            ephemeral: true 
          });
        } else {
          await interaction.reply({ 
            content: userMessage,
            ephemeral: true,
            fetchReply: true
          });
        }
      } catch (replyError) {
        console.error('Impossible d\'envoyer le message d\'erreur critique à l\'utilisateur:', replyError);
      }
      
      // Journaliser l'erreur critique
      try {
        await this.logAction(
          interaction,
          'ERREUR CRITIQUE - Soumission de confession',
          `Une erreur critique est survenue lors du traitement d'une confession:\n` +
          `**Code:** ${error.code || 'N/A'}\n` +
          `**Message:** ${errorMessage}\n` +
          `**Utilisateur:** ${interaction.user?.tag || 'Inconnu'} (${interaction.user?.id || 'N/A'})`
        );
      } catch (logError) {
        console.error('Échec de la journalisation de l\'erreur critique:', logError);
      }
    }
  },

  /**
   * Journalise une action dans les logs
   * @param {import('discord.js').Interaction} interaction - L'interaction qui a déclenché l'action
   * @param {string} title - Le titre du log
   * @param {string} description - La description du log
   * @returns {Promise<boolean>} True si le log a été enregistré avec succès
   */
  async logAction(interaction, title, description) {
    // Vérifier si les logs sont activés
    if (!config.channels?.logs) {
      console.log('Journalisation désactivée: aucun salon de logs configuré');
      return false;
    }

    try {
      // Récupérer le salon de logs
      const logsChannel = await interaction.guild.channels.fetch(config.channels.logs);
      if (!logsChannel) {
        console.error('Salon de logs introuvable');
        return false;
      }

      // Vérifier les permissions
      if (!logsChannel.permissionsFor(interaction.guild.members.me).has('SendMessages')) {
        console.error('Pas la permission d\'envoyer des messages dans le salon de logs');
        return false;
      }

      // Créer l'embed de log
      const logEmbed = new EmbedBuilder()
        .setColor('#3498db')
        .setTitle(title)
        .setDescription(description)
        .setTimestamp()
        .setFooter({ 
          text: `Action effectuée par ${interaction.user.tag}`,
          iconURL: interaction.user.displayAvatarURL()
        });

      // Ajouter des informations supplémentaires si disponibles
      if (interaction.channel) {
        logEmbed.addFields(
          { name: 'Salon', value: `${interaction.channel}`, inline: true },
          { name: 'ID du salon', value: interaction.channelId, inline: true }
        );
      }

      // Envoyer le log
      await logsChannel.send({ embeds: [logEmbed] });
      console.log(`Action journalisée: ${title}`);
      return true;

    } catch (error) {
      console.error('Erreur lors de la journalisation:', error);
      return false;
    }
  },

  /**
   * Vérifie si une chaîne est vide ou non définie
   * @param {string} str - La chaîne à vérifier
   * @returns {boolean} True si la chaîne est vide ou non définie
   */
  isEmpty(str) {
    return !str || str.trim() === '';
  }
};

export default confessionCommand;
