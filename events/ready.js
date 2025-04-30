const { ActivityType } = require('discord.js');
const config = require('../config.json');

module.exports = {
  name: 'ready',
  once: true,
  async execute(client) {
    console.log(`${client.user.tag} Adıyla Giriş Yaptım!`);

    const statusTypes = {
      'dnd': 'dnd',
      'idle': 'idle',
      'online': 'online',
      'invisible': 'invisible',
    };

    const cfgType = (config.status || '').toLowerCase();
    const statusType = statusTypes[cfgType];

    const activityType = ActivityType[config.type.charAt(0).toUpperCase() + config.type.slice(1)];

    console.log('config.status:', config.status);
    console.log('config.type:', config.type);
    console.log('activityType:', activityType);

    if (typeof activityType !== 'number') {
      console.error(`config.json ==> yanlış tip: ${config.type}. Mevcut activityTypes: ${JSON.stringify(ActivityType)}`);
      return;
    }

    try {
      await client.user.setPresence({
        activities: [{ name: config.activity, type: activityType }],
        status: statusType || "idle",
      });
      console.log('Durum Başarıyla Ayarlandı.');
    } catch (error) {
      console.error('Durum Ayarlanırken Hata Oluştur:', error);
    }
  }
};
