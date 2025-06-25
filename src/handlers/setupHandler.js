import { 
  SlashCommandBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ChannelType,
  PermissionFlagsBits,
  EmbedBuilder
} from 'discord.js';
import { config, configManager } from '../config/config.js';
import { checkAdminPermission } from '../utils/permissions.js';

const setupCommand = {
  data: new SlashCommandBuilder()
    .setName('setup')
    .setDescription('Configurer le bot de confessions (Propriétaire uniquement)')
    .setDefaultMemberPermissions(0) // 0 signifie aucune permission requise, nous gérons les permissions nous-mêmes
    .setDMPermission(false) // Désactive la commande en MP
    .toJSON(),

  /**
   * Exécute la commande de configuration
   * @param {import('discord.js').CommandInteraction} interaction - L'interaction de commande
   */
  async execute(interaction) {
    if (!interaction.guild) return;
    
    // Vérifier les permissions d'administration (uniquement propriétaire et adminIds)
    const hasPermission = await checkAdminPermission(interaction, { ownerOnly: true });
    if (!hasPermission) return;

    try {
      // Créer le menu de sélection
      const row = new ActionRowBuilder()
        .addComponents(
          new StringSelectMenuBuilder()
            .setCustomId('setup_select')
            .setPlaceholder('Sélectionnez une option de configuration')
            .addOptions([
              {
                label: 'Salon des confessions',
                description: 'Définir le salon où les confessions seront publiées',
                value: 'set_confession_channel',
              },
              {
                label: 'Salon des logs',
                description: 'Définir le salon où les logs seront envoyés',
                value: 'set_logs_channel',
              },
              {
                label: 'Afficher la configuration',
                description: 'Voir la configuration actuelle',
                value: 'show_config',
              },
            ]),
        );

      await interaction.reply({
        content: '🔧 **Configuration du bot de confessions**\nSélectionnez une option ci-dessous :',
        components: [row],
        ephemeral: true
      });

    } catch (error) {
      console.error('Erreur dans la commande setup:', error);
      await interaction.reply({
        content: '❌ Une erreur est survenue lors de la configuration.',
        ephemeral: true
      }).catch(console.error);
    }
  },

  /**
   * Gère les interactions du menu de sélection
   * @param {import('discord.js').StringSelectMenuInteraction} interaction - L'interaction du menu de sélection
   */
  async handleInteraction(interaction) {
    if (!interaction.isStringSelectMenu()) return;

    // Répondre immédiatement à l'interaction
    const reply = await interaction.deferUpdate().catch(console.error);
    if (!reply) return;

    try {
      const [action] = interaction.values;

      switch (action) {
        case 'set_confession_channel':
          await this.showChannelSelect(interaction, 'confession');
          break;
        case 'set_logs_channel':
          await this.showChannelSelect(interaction, 'logs');
          break;
        case 'show_config':
          await this.showConfig(interaction);
          break;
      }
    } catch (error) {
      console.error('Erreur dans handleInteraction setup:', error);
      try {
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp({
            content: '❌ Une erreur est survenue lors du traitement de votre demande.',
            ephemeral: true
          });
        } else {
          await interaction.reply({
            content: '❌ Une erreur est survenue lors du traitement de votre demande.',
            ephemeral: true
          });
        }
      } catch (e) {
        console.error('Impossible d\'envoyer le message d\'erreur:', e);
      }
    }
  },

  /**
   * Affiche le sélecteur de salon
   * @param {import('discord.js').StringSelectMenuInteraction} interaction - L'interaction du menu de sélection
   * @param {string} channelType - Le type de salon à configurer ('confession' ou 'logs')
   */
  async showChannelSelect(interaction, channelType) {
    const channelTypeName = channelType === 'confession' ? 'des confessions' : 'des logs';
    
    try {
      // Mettre à jour le message d'origine avec deferUpdate
      await interaction.editReply({
        content: `#️⃣ Veuillez mentionner le salon ${channelTypeName} ou son ID :`,
        components: []
      });

      // Attendre la réponse de l'utilisateur
      const filter = m => m.author.id === interaction.user.id;
      let collected;
      try {
        collected = await interaction.channel.awaitMessages({
          filter,
          max: 1,
          time: 30000,
          errors: ['time']
        });
      } catch (error) {
        if (error.name === 'TimeoutError') {
          throw new Error('timeout');
        }
        throw error;
      }

      const message = collected.first();
      if (!message) {
        throw new Error('Aucun message reçu');
      }

      const channel = message.mentions.channels.first() || 
                     interaction.guild.channels.cache.get(message.content);

      if (!channel || channel.type !== ChannelType.GuildText) {
        throw new Error('invalid_channel');
      }

      // Mettre à jour la configuration
      await configManager.update(`channels.${channelType}`, channel.id);
      
      // Supprimer le message de l'utilisateur
      await message.delete().catch(console.error);
      
      // Utiliser editReply pour mettre à jour le message d'origine
      await interaction.editReply({
        content: `✅ Salon ${channelTypeName} défini sur ${channel}`,
        components: []
      });

    } catch (error) {
      console.error('Erreur dans showChannelSelect:', error);
      
      let errorMessage = '❌ Une erreur est survenue lors de la configuration du salon.';
      if (error.message === 'timeout' || error.name === 'TimeoutError') {
        errorMessage = '❌ Temps écoulé. Veuillez réessayer.';
      } else if (error.message === 'invalid_channel') {
        errorMessage = '❌ Salon invalide. Veuillez mentionner un salon textuel valide.';
      }
      
      try {
        if (interaction.replied || interaction.deferred) {
          await interaction.editReply({
            content: errorMessage,
            components: []
          });
        } else {
          await interaction.reply({
            content: errorMessage,
            ephemeral: true
          });
        }
      } catch (e) {
        console.error('Impossible d\'envoyer le message d\'erreur:', e);
      }
    }
  },

  /**
   * Affiche la configuration actuelle
   * @param {import('discord.js').StringSelectMenuInteraction} interaction - L'interaction du menu de sélection
   */
  async showConfig(interaction) {
    try {
      const confessionChannel = config.channels.confession 
        ? `<#${config.channels.confession}>` 
        : '❌ Non défini';
        
      const logsChannel = config.channels.logs 
        ? `<#${config.channels.logs}>` 
        : '❌ Non défini';

      const embed = new EmbedBuilder()
        .setTitle('⚙️ Configuration actuelle')
        .addFields(
          { name: 'Salon des confessions', value: confessionChannel, inline: true },
          { name: 'Salon des logs', value: logsChannel, inline: true },
          { 
            name: 'Statistiques', 
            value: `• ${config.stats.confessionCount || 0} confessions\n• ${config.stats.replyCount || 0} réponses` 
          }
        )
        .setColor(config.discord.defaultColor || '#5865F2')
        .setTimestamp();

      // Utiliser editReply pour mettre à jour le message d'origine
      await interaction.editReply({
        content: null,
        embeds: [embed],
        components: []
      });
    } catch (error) {
      console.error('Erreur dans showConfig:', error);
      try {
        if (interaction.replied || interaction.deferred) {
          await interaction.editReply({
            content: '❌ Une erreur est survenue lors de la récupération de la configuration.',
            components: []
          });
        } else {
          await interaction.reply({
            content: '❌ Une erreur est survenue lors de la récupération de la configuration.',
            ephemeral: true
          });
        }
      } catch (e) {
        console.error('Impossible d\'envoyer le message d\'erreur:', e);
      }
    }
  }
};

export default setupCommand;
