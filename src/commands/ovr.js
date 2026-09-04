const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'ovr',
  aliases: ['overall', 'oyuncu', 'player'],
  description: 'Oyuncunun tüm bilgilerini gösterir',
  usage: 'ovr [@üye | isim]',

  async execute(message, args, db, client) {
    let isim;
    let mentionedUser = null;

    // ========== 1. ETİKETLİ KULLANIM ==========
    if (message.mentions.users.size > 0) {
      mentionedUser = message.mentions.users.first();
      isim = mentionedUser.displayName || mentionedUser.username;
    }
    // ========== 2. ETİKETSİZ KULLANIM ==========
    else {
      if (args.length === 0) {
        return message.reply(
          `❌ Kullanım:\n` +
          `• Etiketli: \`${client.config.prefix}ovr @üye\`\n` +
          `• Etiketsiz: \`${client.config.prefix}ovr <isim>\`\n\n` +
          `Örnek: \`${client.config.prefix}ovr Ali\``
        );
      }
      isim = args.join(' '); // boşluklu isim desteği
    }

    // Oyuncuyu bul (önce tam eşleşme, yoksa benzer)
    let player = db.prepare(`
      SELECT p.*, t.name as team_name 
      FROM players p 
      LEFT JOIN teams t ON p.team_id = t.id 
      WHERE p.name = ?
    `).get(isim);

    if (!player) {
      player = db.prepare(`
        SELECT p.*, t.name as team_name 
        FROM players p 
        LEFT JOIN teams t ON p.team_id = t.id 
        WHERE p.name LIKE ?
      `).get(`%${isim}%`);
    }

    if (!player) {
      return message.reply(`❌ **${isim}** adında bir oyuncu bulunamadı.`);
    }

    // Embed
    const embed = new EmbedBuilder()
      .setColor(0x00FF88)
      .setTitle(`⚽ ${player.name}`)
      .addFields(
        { name: 'Takım', value: player.team_name || 'Takımsız', inline: true },
        { name: 'Pozisyon', value: player.position, inline: true },
        { name: 'Yaş', value: `${player.age}`, inline: true },
        { name: 'Overall', value: `**${player.overall}**`, inline: true },
        { name: 'Değer', value: `${player.value.toLocaleString('tr-TR')} €`, inline: true },
        { name: 'ID', value: `${player.id}`, inline: true },
        { name: '\u200B', value: '**─── Nitelikler ───**', inline: false },
        { name: 'Şut', value: `${player.sut}`, inline: true },
        { name: 'Pas', value: `${player.pas}`, inline: true },
        { name: 'Defans', value: `${player.defans}`, inline: true },
        { name: 'Hız', value: `${player.hiz}`, inline: true },
        { name: 'Fizik', value: `${player.fizik}`, inline: true },
        { name: 'Top Kontrolü', value: `${player.top_kontrolu}`, inline: true }
      )
      .setFooter({ text: `Oyuncu ID: ${player.id}` })
      .setTimestamp();

    // Etiketli kullanımda avatar ekle
    if (mentionedUser) {
      embed.setThumbnail(mentionedUser.displayAvatarURL({ dynamic: true }));
      embed.addFields({ name: 'Discord', value: `${mentionedUser}`, inline: false });
    }

    await message.reply({ embeds: [embed] });
  }
};