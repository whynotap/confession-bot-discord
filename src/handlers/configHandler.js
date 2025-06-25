import { 
  SlashCommandBuilder,
  ChannelType,
  PermissionFlagsBits,
  EmbedBuilder
} from 'discord.js';
import { config, configManager } from '../config/config.js';
import { checkAdminPermission } from '../utils/permissions.js';

const configCommand = {
  data: new SlashCommandBuilder()
    .setName('config')
    .setDescription('Configuration du bot de confessions')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(subcommand =>
      subcommand
        .setName('confession')
        .setDescription('Définir le salon des confessions')
        .addChannelOption(option =>
          option
            .setName('salon')
            .setDescription('Salon où les confessions seront publiées')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('logs')
        .setDescription('Définir le salon des logs')
        .addChannelOption(option =>
          option
            .setName('salon')
            .setDescription('Salon où les logs seront envoyés')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('afficher')
        .setDescription('Afficher la configuration actuelle')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('deploy')
        .setDescription('Mettre à jour les commandes du bot')
    )
    .toJSON(),

  async execute(interaction) {
    if (!interaction.guild) return;
    
    // Vérifier les permissions d'administration
    const hasPermission = await checkAdminPermission(interaction);
    if (!hasPermission) return;

    try {
      const subcommand = interaction.options.getSubcommand();
      
      switch (subcommand) {
        case 'confession':
          await this.setConfessionChannel(interaction);
          break;
        case 'logs':
          await this.setLogsChannel(interaction);
          break;
        case 'afficher':
          await this.showConfig(interaction);
          break;
        case 'deploy':
          await this.deployCommands(interaction);
          break;
      }
    } catch (error) {
      console.error('Erreur dans la commande config:', error);
      await interaction.reply({
        content: '❌ Une erreur est survenue lors de la configuration.',
        ephemeral: true
      }).catch(console.error);
    }
  },

  async setConfessionChannel(interaction) {
    const channel = interaction.options.getChannel('salon');
    
    if (channel.type !== ChannelType.GuildText) {
      return interaction.reply({
        content: '❌ Le salon doit être un salon textuel.',
        ephemeral: true
      });
    }

    await configManager.update('channels.confession', channel.id);
    
    await interaction.reply({
      content: `✅ Salon de confessions défini sur ${channel}`,
      ephemeral: true
    });
  },

  async setLogsChannel(interaction) {
    const channel = interaction.options.getChannel('salon');
    
    if (channel.type !== ChannelType.GuildText) {
      return interaction.reply({
        content: '❌ Le salon doit être un salon textuel.',
        ephemeral: true
      });
    }

    await configManager.update('channels.logs', channel.id);
    
    await interaction.reply({
      content: `✅ Salon des logs défini sur ${channel}`,
      ephemeral: true
    });
  },

  async showConfig(interaction) {
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
          value: `• ${config.stats.confessionCount || 0} confessions` 
        }
      )
      .setColor(config.discord.defaultColor || '#5865F2')
      .setTimestamp();

    await interaction.reply({
      embeds: [embed],
      ephemeral: true
    });
  },

  async deployCommands(interaction) {
    try {
      await interaction.deferReply({ ephemeral: true });
      
      const { REST, Routes } = await import('discord.js');
      const rest = new REST({ version: '10' }).setToken(interaction.client.token);

      // Préparer les commandes
      const commands = [
        this.data,
        (await import('./confessionHandler.js')).default.data,
        (await import('./statsHandler.js')).default.data
      ].filter(cmd => cmd);

      // Supprimer les commandes existantes
      const existingCommands = await rest.get(Routes.applicationCommands(interaction.client.user.id));
      const deletePromises = existingCommands.map(cmd => 
        rest.delete(Routes.applicationCommand(interaction.client.user.id, cmd.id))
      );
      await Promise.all(deletePromises);

      // Enregistrer les nouvelles commandes
      const data = await rest.put(
        Routes.applicationCommands(interaction.client.user.id),
        { body: commands },
      );

      await interaction.editReply({
        content: `✅ ${data.length} commande(s) ont été mises à jour avec succès !`,
        ephemeral: true
      });
    } catch (error) {
      console.error('Erreur lors du déploiement des commandes:', error);
      await interaction.editReply({
        content: '❌ Une erreur est survenue lors du déploiement des commandes.',
        ephemeral: true
      });
    }
  }
};

export default configCommand;
