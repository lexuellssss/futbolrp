const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'transfer-red',
  aliases: ['red'],
  description: 'Transfer teklifini reddeder',
  usage: 'transfer-red <transfer_id>',

  async execute(message, args, db, client) {
    const config = client.config;
    const userId = message.author.id;

    if (!args[0]) {
      return message.reply(`❌ Kullanım: \`${config.prefix}transfer-red <transfer_id>\``);
    }

    const transferId = parseInt(args[0]);
    const transfer = db.prepare('SELECT * FROM transfers WHERE id = ? AND status = ?').get(transferId, 'beklemede');

    if (!transfer) {
      return message.reply('❌ Bekleyen transfer bulunamadı.');
    }

    const player = db.prepare('SELECT * FROM players WHERE id = ?').get(transfer.player_id);
    const user = db.prepare('SELECT * FROM users WHERE discord_id = ?').get(userId);

    let yetkili = false;

    if (transfer.from_team_id) {
      // Takımlı → mevcut takım yetkilisi
      if (user && user.team_id === transfer.from_team_id && ['td', 'baskan', 'admin'].includes(user.role)) {
        yetkili = true;
      }
    } else {
      // Serbest → kendisi veya admin
      const isim = message.member.displayName || message.author.username;
      if (player && (player.name === isim || player.name.includes(isim))) yetkili = true;
      if (message.member.permissions.has('Administrator')) yetkili = true;
    }

    if (!yetkili) {
      return message.reply('❌ Bu teklifi reddetme yetkin yok.');
    }

    db.prepare('UPDATE transfers SET status = ? WHERE id = ?').run('red', transferId);

    const embed = new EmbedBuilder()
      .setColor(0xFF0000)
      .setTitle('❌ Transfer Reddedildi')
      .setDescription(`**${player ? player.name : 'Oyuncu'}** için yapılan teklif reddedildi.`)
      .setTimestamp();

    await message.reply({ embeds: [embed] });
  }
};