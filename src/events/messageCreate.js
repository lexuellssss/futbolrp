const { Events } = require('discord.js');
const { db } = require('../database/db');

module.exports = {
  name: Events.MessageCreate,
  async execute(message, client) {
    if (message.author.bot || !message.guild) return;

    const prefix = client.config.prefix;
    if (!message.content.startsWith(prefix)) return;

    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const commandName = args.shift().toLowerCase();

    const command = client.commands.get(commandName);
    if (!command) return;

    try {
      await command.execute(message, args, db, client);
    } catch (error) {
      console.error(`[HATA] Komut: ${commandName}`, error);
      message.reply('❌ Bu komutu çalıştırırken bir hata oluştu!').catch(() => {});
    }
  }
};