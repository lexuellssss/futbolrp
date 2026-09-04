const { Events, ActivityType } = require('discord.js');

module.exports = {
  name: Events.ClientReady,
  once: true,
  execute(client) {
    console.log(`✅ Bot hazır! Giriş yapıldı: ${client.user.tag}`);
    console.log(`📊 Yüklü komut sayısı: ${client.commands.size}`);
    console.log(`🔧 Prefix: ${client.config.prefix}`);

    client.user.setActivity(`Futbol RP | ${client.config.prefix}yardim`, {
      type: ActivityType.Playing
    });
  }
};