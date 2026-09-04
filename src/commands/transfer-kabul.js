const { EmbedBuilder } = require('discord.js');
const { createContract } = require('../utils/contracts');

module.exports = {
  name: 'transfer-kabul',
  aliases: ['kabul'],
  description: 'Transfer teklifini kabul eder + sözleşme imzalar',
  usage: 'transfer-kabul <transfer_id>',

  async execute(message, args, db, client) {
    const config = client.config;
    const userId = message.author.id;

    if (!args[0]) {
      return message.reply(`❌ Kullanım: \`${config.prefix}transfer-kabul <transfer_id>\``);
    }

    const transferId = parseInt(args[0]);
    const transfer = db.prepare('SELECT * FROM transfers WHERE id = ? AND status = ?').get(transferId, 'beklemede');

    if (!transfer) {
      return message.reply('❌ Bekleyen transfer bulunamadı.');
    }

    const player = db.prepare('SELECT * FROM players WHERE id = ?').get(transfer.player_id);
    const toTeam = db.prepare('SELECT * FROM teams WHERE id = ?').get(transfer.to_team_id);
    const fromTeam = transfer.from_team_id
      ? db.prepare('SELECT * FROM teams WHERE id = ?').get(transfer.from_team_id)
      : null;

    const user = db.prepare('SELECT * FROM users WHERE discord_id = ?').get(userId);
    let yetkili = false;

    if (fromTeam) {
      if (user && user.team_id === fromTeam.id && ['td', 'baskan', 'admin'].includes(user.role)) {
        yetkili = true;
      }
    } else {
      const isim = message.member.displayName || message.author.username;
      if (player && (player.name === isim || player.name.includes(isim) || isim.includes(player.name))) {
        yetkili = true;
      }
      if (message.member.permissions.has('Administrator')) yetkili = true;
    }

    if (!yetkili) {
      return message.reply('❌ Bu teklifi kabul etme yetkin yok.');
    }

    if (toTeam.budget < transfer.offer_amount) {
      return message.reply('❌ Alıcı takımın bütçesi yetersiz kalmış.');
    }

    // Oyuncuyu taşı
    db.prepare('UPDATE players SET team_id = ? WHERE id = ?').run(transfer.to_team_id, transfer.player_id);

    // Para
    db.prepare('UPDATE teams SET budget = budget - ? WHERE id = ?').run(transfer.offer_amount, transfer.to_team_id);
    if (fromTeam) {
      db.prepare('UPDATE teams SET budget = budget + ? WHERE id = ?').run(transfer.offer_amount, transfer.from_team_id);
    }

    // Eski aktif sözleşmeyi bitir
    db.prepare(`UPDATE contracts SET status = 'bitti' WHERE player_id = ? AND status = 'aktif'`)
      .run(transfer.player_id);

    // Yeni sözleşme
    const seasons = transfer.seasons || 1;
    const wage = transfer.wage || 0;

    createContract(db, {
      playerId: transfer.player_id,
      teamId: transfer.to_team_id,
      seasons,
      wage,
      transferId: transfer.id
    });

    db.prepare('UPDATE transfers SET status = ? WHERE id = ?').run('kabul', transferId);

    const endYear = new Date().getFullYear() + seasons;

    const embed = new EmbedBuilder()
      .setColor(0x00FF00)
      .setTitle('✅ Transfer Gerçekleşti + Sözleşme İmzalandı!')
      .addFields(
        { name: 'Oyuncu', value: player.name, inline: true },
        { name: 'Eski Takım', value: fromTeam ? fromTeam.name : '🆓 Serbest', inline: true },
        { name: 'Yeni Takım', value: toTeam.name, inline: true },
        { name: 'Bonservis', value: `${transfer.offer_amount.toLocaleString('tr-TR')} €`, inline: true },
        { name: 'Sözleşme', value: `**${seasons} sezon** (→ ${endYear})`, inline: true },
        { name: 'Maaş', value: `**${wage.toLocaleString('tr-TR')} €**`, inline: true }
      )
      .setTimestamp();

    await message.reply({ embeds: [embed] });
  }
};