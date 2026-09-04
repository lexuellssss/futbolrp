const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  name: 'oyuncu-sil',
  aliases: ['oyuncusil', 'playerdel'],
  description: 'Oyuncuyu siler (Admin)',
  usage: 'oyuncu-sil @üye <sebep>',

  async execute(message, args, db, client) {
    if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return message.reply('❌ Bu komutu sadece Adminler kullanabilir.');
    }

    if (message.mentions.users.size === 0) {
      return message.reply(
        `❌ Kullanım: \`${client.config.prefix}oyuncu-sil @üye <sebep>\`\n` +
        `Örnek: \`${client.config.prefix}oyuncu-sil @Ali Performans yetersiz\``
      );
    }

    const mentionedUser = message.mentions.users.first();
    const isim = mentionedUser.displayName || mentionedUser.username;

    const cleanArgs = args.filter(arg => !arg.includes(mentionedUser.id) && !arg.startsWith('<@'));
    const sebep = cleanArgs.length > 0 ? cleanArgs.join(' ') : 'Belirtilmedi';

    // İsme göre oyuncuyu bul
    let player = db.prepare('SELECT * FROM players WHERE name = ?').get(isim);
    if (!player) {
      player = db.prepare('SELECT * FROM players WHERE name LIKE ?').get(`%${isim}%`);
    }

    if (!player) {
      return message.reply(`❌ **${isim}** adında bir oyuncu bulunamadı.`);
    }

    // Bağlı kayıtları önce sil (foreign key)
    db.prepare('DELETE FROM contracts WHERE player_id = ?').run(player.id);
    db.prepare('DELETE FROM transfers WHERE player_id = ?').run(player.id);

    // lineups içinde bu oyuncu varsa temizle (opsiyonel, hata vermesin)
    try {
      const lineups = db.prepare('SELECT * FROM lineups').all();
      for (const lu of lineups) {
        let changed = false;
        let starters = lu.starters;
        let substitutes = lu.substitutes;

        try {
          const s = JSON.parse(starters || '[]');
          if (Array.isArray(s) && s.includes(player.id)) {
            starters = JSON.stringify(s.filter(id => id !== player.id));
            changed = true;
          } else if (s && typeof s === 'object') {
            // Pozisyon formatı { GK: [], DF: [], ... }
            for (const key of Object.keys(s)) {
              if (Array.isArray(s[key]) && s[key].includes(player.id)) {
                s[key] = s[key].filter(id => id !== player.id);
                changed = true;
              }
            }
            if (changed) starters = JSON.stringify(s);
          }
        } catch (_) {}

        try {
          const sub = JSON.parse(substitutes || '[]');
          if (Array.isArray(sub) && sub.includes(player.id)) {
            substitutes = JSON.stringify(sub.filter(id => id !== player.id));
            changed = true;
          }
        } catch (_) {}

        if (changed) {
          db.prepare('UPDATE lineups SET starters = ?, substitutes = ? WHERE team_id = ?')
            .run(starters, substitutes, lu.team_id);
        }
      }
    } catch (_) {}

    // Oyuncuyu sil
    db.prepare('DELETE FROM players WHERE id = ?').run(player.id);

    const embed = new EmbedBuilder()
      .setColor(0xFF0000)
      .setTitle('🗑️ Oyuncu Silindi')
      .setThumbnail(mentionedUser.displayAvatarURL({ dynamic: true }))
      .addFields(
        { name: 'Oyuncu', value: player.name, inline: true },
        { name: 'Discord', value: `${mentionedUser}`, inline: true },
        { name: 'ID', value: `${player.id}`, inline: true },
        { name: 'Sebep', value: sebep, inline: false },
        { name: 'Silen', value: `${message.author}`, inline: true }
      )
      .setTimestamp();

    await message.reply({ embeds: [embed] });
  }
};