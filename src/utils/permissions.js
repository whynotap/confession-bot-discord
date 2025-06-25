import { PermissionFlagsBits } from 'discord.js';
import { config } from '../config/config.js';

/**
 * Vérifie si un utilisateur est un administrateur autorisé
 * @param {import('discord.js').GuildMember} member - Le membre à vérifier
 * @param {boolean} [ownerOnly=false] - Si vrai, seul le propriétaire et les adminIds sont autorisés
 * @returns {boolean} True si l'utilisateur est un administrateur autorisé
 */
export function isAuthorizedAdmin(member, ownerOnly = false) {
  // Le propriétaire du serveur a toujours les droits
  if (member.id === member.guild.ownerId) {
    return true;
  }
  
  // Vérifier si l'utilisateur est dans la liste des administrateurs autorisés
  const isInAdminList = config.security?.adminIds?.includes(member.id) || false;
  
  // Si ownerOnly est vrai, seul le propriétaire et les adminIds sont autorisés
  if (ownerOnly) {
    return isInAdminList;
  }
  
  // Sinon, les administrateurs Discord sont aussi autorisés s'ils sont dans la liste
  const isDiscordAdmin = member.permissions.has(PermissionFlagsBits.Administrator);
  
  return isInAdminList && isDiscordAdmin;
}

/**
 * Vérifie les permissions d'un utilisateur pour une commande admin
 * @param {import('discord.js').CommandInteraction} interaction - L'interaction de commande
 * @param {Object} [options] - Options supplémentaires
 * @param {boolean} [options.ownerOnly=false] - Si vrai, seul le propriétaire et les adminIds sont autorisés
 * @returns {Promise<boolean>} True si l'utilisateur a la permission
 */
export async function checkAdminPermission(interaction, { ownerOnly = false } = {}) {
  if (!interaction.guild) return false;
  
  try {
    // Récupérer le membre avec les permissions à jour
    const member = await interaction.guild.members.fetch(interaction.user.id);
    
    if (!isAuthorizedAdmin(member, ownerOnly)) {
      const message = ownerOnly
        ? '❌ Seul le propriétaire du serveur et les administrateurs autorisés peuvent utiliser cette commande.'
        : '❌ Vous n\'avez pas la permission d\'utiliser cette commande.';
      
      await interaction.reply({
        content: message,
        ephemeral: true
      });
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Erreur lors de la vérification des permissions:', error);
    await interaction.reply({
      content: '❌ Une erreur est survenue lors de la vérification de vos permissions.',
      ephemeral: true
    });
    return false;
  }
}
