import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { promises as fs } from 'fs';

// Configuration par défaut
const defaultConfig = {
  // Configuration Discord
  discord: {
    token: '', // Indiquez votre token de bot ici
    defaultColor: '#5865F2' // Couleur par défaut pour les embeds (facultatif)
  },

  // Configuration des salons
  channels: {
    confession: '', // Vous pouvez configurer ceci directement avec la commande /setup
    logs: ''  // Vous pouvez configurer ceci directement avec la commande /setup
  },

  // Statistiques
  stats: {
    confessionCount: 0,
    replyCount: 0
  },

  // Comportement
  behavior: {
    autoDeleteAfter: 0, // En secondes (0 pour désactiver)
    logLevel: 'info' // error, warn, info, debug
  },

  // Sécurité
  security: {
    adminIds: [''] // Indiquez votre ID Discord
  }
};

// Chemin vers le fichier de configuration
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const configPath = join(__dirname, '..', '..', 'data', 'config.json');

// Charger la configuration
let config = { ...defaultConfig };

// Gestionnaire de configuration
const configManager = {
  // Charger la configuration
  load: async () => {
    try {
      const data = await fs.readFile(configPath, 'utf8');
      const savedConfig = JSON.parse(data);
      
      // Fusionner avec la configuration par défaut
      config = {
        ...defaultConfig,
        ...savedConfig,
        discord: {
          ...defaultConfig.discord,
          ...(savedConfig.discord || {})
        },
        channels: {
          ...defaultConfig.channels,
          ...(savedConfig.channels || {})
        },
        stats: {
          ...defaultConfig.stats,
          ...(savedConfig.stats || {})
        },
        behavior: {
          ...defaultConfig.behavior,
          ...(savedConfig.behavior || {})
        },
        security: {
          ...defaultConfig.security,
          ...(savedConfig.security || {})
        }
      };
      
      console.log('✅ Configuration chargée avec succès');
      return config;
    } catch (error) {
      if (error.code === 'ENOENT') {
        // Le fichier n'existe pas, on le crée avec la config par défaut
        console.log('ℹ️ Fichier de configuration introuvable, création avec les valeurs par défaut...');
        await configManager.save();
        return config;
      }
      console.error('❌ Erreur lors du chargement de la configuration:', error);
      throw error;
    }
  },

  // Sauvegarder la configuration
  save: async () => {
    try {
      await fs.mkdir(dirname(configPath), { recursive: true });
      await fs.writeFile(configPath, JSON.stringify(config, null, 2), 'utf8');
      console.log('💾 Configuration sauvegardée avec succès');
    } catch (error) {
      console.error('❌ Erreur lors de la sauvegarde de la configuration:', error);
      throw error;
    }
  },

  // Mettre à jour une valeur dans la configuration
  update: async (key, value) => {
    const keys = key.split('.');
    let current = config;
    
    for (let i = 0; i < keys.length - 1; i++) {
      if (!current[keys[i]]) current[keys[i]] = {};
      current = current[keys[i]];
    }
    
    current[keys[keys.length - 1]] = value;
    await configManager.save();
  },

  // Incrémenter un compteur
  increment: async (key) => {
    const keys = key.split('.');
    let current = config;
    
    for (let i = 0; i < keys.length - 1; i++) {
      if (!current[keys[i]]) current[keys[i]] = {};
      current = current[keys[i]];
    }
    
    if (typeof current[keys[keys.length - 1]] !== 'number') {
      current[keys[keys.length - 1]] = 0;
    }
    
    current[keys[keys.length - 1]]++;
    await configManager.save();
    return current[keys[keys.length - 1]];
  },

  // Obtenir la configuration
  getConfig: () => config,

  // Obtenir une valeur spécifique
  get: (key, defaultValue = null) => {
    const keys = key.split('.');
    let current = config;
    
    for (const k of keys) {
      if (current[k] === undefined) return defaultValue;
      current = current[k];
    }
    
    return current;
  }
};

// Exporter la configuration et le gestionnaire
export { config, configManager };

export default {
  ...config,
  ...configManager
};
