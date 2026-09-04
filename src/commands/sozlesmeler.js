const { EmbedBuilder } = require('discord.js');
const { getActiveContract, getTeamContracts } = require('../utils/contracts');

module.exports = {
  name: 'sozlesmeler',
  aliases: ['sözleşmeler', 'contracts'],
  description: 'Aktif sözleşmeleri listeler',
  usage: 'sozlesmeler [@oyuncu | takım adı]',

  async execute(message, args, db, client) {
    const config = client.config;

    // @oyuncu verilmişse
    if (message.mentions.users.size > 0) {
      const mentioned = message.mentions.users.first();
      const isim = mentioned.displayName || mentioned.username;
      let player = db.prepare('SELECT * FROM players WHERE name = ?').get(isim);
      if (!player) player = db.prepare('SELECT * FROM players WHERE name LIKE ?').get(`%${isim}%`);

      if (!player) {
        return message.reply(`❌ **${isim}** oyuncu olarak bulunamadı.`);
      }

      const contract = getActiveContract(db, player.id);
      if (!contract) {
        return message.reply(`❌ **${player.name}** için aktif sözleşme yok.`);
      }

      const embed = new EmbedBuilder()
        .setColor(0x9B59B6)
        .setTitle(`📄 ${player.name} — Sözleşme`)
        .addFields(
          { name: 'Takım', value: contract.team_name, inline: true },
          { name: 'Süre', value: `${contract.seasons} sezon`, inline: true },
          { name: 'Maaş', value: `${contract.wage.toLocaleString('tr-TR')} €`, inline: true },
          { name: 'Başlangıç', value: contract.start_date.slice(0, 10), inline: true },
          { name: 'Bitiş', value: contract.end_date.slice(0, 10), inline: true },
          { name: 'Durum', value: contract.status, inline: true }
        )
        .setTimestamp();

      return message.reply({ embeds: [embed] });
    }

    // Takım adı veya kendi takımı
    let team;
    if (args.length > 0) {
      team = db.prepare('SELECT * FROM teams WHERE name = ?').get(args.join(' '));
    } else {
      const user = db.prepare('SELECT * FROM users WHERE discord_id = ?').get(message.author.id);
      if (!user || !user.team_id) {
        return message.reply(`❌ Takım belirt veya bir takıma kayıt ol.\n\`${config.prefix}sozlesmeler <takım>\` veya \`${config.prefix}sozlesmeler @oyuncu\``);
      }
      team = db.prepare('SELECT * FROM teams WHERE id = ?').get(user.team_id);
    }

    if (!team) {
      return message.reply('❌ Takım bulunamadı.');
    }

    const contracts = getTeamContracts(db, team.id);
    if (contracts.length === 0) {
      return message.reply(`❌ **${team.name}** takımında aktif sözleşme yok.`);
    }

    const list = contracts.map((c, i) =>
      `**${i + 1}. ${c.player_name}** (${c.position}) — ${c.seasons} sezon | Maaş: ${c.wage.toLocaleString('tr-TR')}€ | Bitiş: ${c.end_date.slice(0, 10)}`
    ).join('\n');

    const embed = new EmbedBuilder()
      .setColor(0x9B59B6)
      .setTitle(`📄 ${team.name} — Aktif Sözleşmeler`)
      .setDescription(list)
      .setFooter({ text: `Toplam ${contracts.length} sözleşme` })
      .setTimestamp();

    await message.reply({ embeds: [embed] });
  }
};