import { 
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits
} from 'discord.js';
import { config } from '../config/config.js';

const statsCommand = {
  data: new SlashCommandBuilder()
    .setName('stats')
    .setDescription('Afficher les statistiques du bot')
    .setDefaultMemberPermissions(PermissionFlagsBits.SendMessages)
    .toJSON(),

  /**
   * Exécute la commande de statistiques
   * @param {import('discord.js').CommandInteraction} interaction - L'interaction de commande
   */
  async execute(interaction) {
    try {
      const embed = new EmbedBuilder()
        .setColor(config.discord.defaultColor || '#5865F2')
        .setTitle('📊 Statistiques du bot de confessions')
        .addFields(
          { name: 'Confessions', value: `**${config.stats.confessionCount || 0}** confessions publiées`, inline: true },
          { name: 'Version', value: '1.0.0', inline: true },
          { 
            name: 'Salons configurés', 
            value: [
              `• Confessions: ${config.channels.confession ? `<#${config.channels.confession}>` : '❌ Non configuré'}`,
              `• Logs: ${config.channels.logs ? `<#${config.channels.logs}>` : '❌ Non configuré'}`
            ].join('\n')
          }
        )
        .setFooter({ 
          text: `Demandé par ${interaction.user.tag}`,
          iconURL: interaction.user.displayAvatarURL()
        })
        .setTimestamp();

      await interaction.reply({ 
        embeds: [embed],
        ephemeral: true 
      });

    } catch (error) {
      console.error('Erreur dans la commande stats:', error);
      await interaction.reply({
        content: '❌ Une erreur est survenue lors de la récupération des statistiques.',
        ephemeral: true
      }).catch(console.error);
    }
  }
};

export default statsCommand;
