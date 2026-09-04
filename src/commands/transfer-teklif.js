const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'transfer-teklif',
  aliases: ['transfer', 'teklif'],
  description: 'Transfer teklifi gönderir (bonservis + sezon + maaş)',
  usage: 'transfer-teklif @oyuncu <bonservis> <sezon> <maaş>',

  async execute(message, args, db, client) {
    const config = client.config;
    const userId = message.author.id;
    const user = db.prepare('SELECT * FROM users WHERE discord_id = ?').get(userId);

    if (!user || !user.team_id) {
      return message.reply('❌ Önce bir takıma kayıt olmalısın.');
    }
    if (!['td', 'baskan', 'admin'].includes(user.role)) {
      return message.reply('❌ Sadece TD veya Başkan transfer yapabilir.');
    }

    if (message.mentions.users.size === 0) {
      return message.reply(
        `❌ Kullanım: \`${config.prefix}transfer-teklif @oyuncu <bonservis> <sezon> <maaş>\`\n` +
        `Örnek: \`${config.prefix}transfer-teklif @Ali 15000000 2 50000\`\n` +
        `Maaş: min 1.000 — max 1.000.000`
      );
    }

    const mentionedUser = message.mentions.users.first();
    const cleanArgs = args.filter(arg => !arg.includes(mentionedUser.id) && !arg.startsWith('<@'));

    if (cleanArgs.length < 3) {
      return message.reply(
        `❌ Eksik parametre.\n` +
        `Kullanım: \`${config.prefix}transfer-teklif @oyuncu <bonservis> <sezon> <maaş>\`\n` +
        `Örnek: \`${config.prefix}transfer-teklif @Ali 15000000 2 50000\``
      );
    }

    const bonservis = parseInt(cleanArgs[0]);
    const seasons = parseInt(cleanArgs[1]);
    const wage = parseInt(cleanArgs[2]);

    if (isNaN(bonservis) || bonservis < 100000) {
      return message.reply('❌ Bonservis en az 100.000€ olmalı.');
    }
    if (isNaN(seasons) || seasons < 1 || seasons > 5) {
      return message.reply('❌ Sözleşme süresi 1-5 sezon arasında olmalı.');
    }
    if (isNaN(wage) || wage < 1000 || wage > 1000000) {
      return message.reply('❌ Maaş **1.000** ile **1.000.000** arasında olmalı.');
    }

    const myTeam = db.prepare('SELECT * FROM teams WHERE id = ?').get(user.team_id);
    if (myTeam.budget < bonservis) {
      return message.reply(`❌ Yetersiz bütçe. Mevcut: **${myTeam.budget.toLocaleString('tr-TR')} €**`);
    }

    const isim = mentionedUser.displayName || mentionedUser.username;
    let player = db.prepare('SELECT * FROM players WHERE name = ?').get(isim);
    if (!player) {
      player = db.prepare('SELECT * FROM players WHERE name LIKE ?').get(`%${isim}%`);
    }

    const targetUser = db.prepare('SELECT * FROM users WHERE discord_id = ?').get(mentionedUser.id);

    if (!player && !targetUser) {
      return message.reply(`❌ **${isim}** sistemde kayıtlı değil.`);
    }

    if (player && player.team_id === user.team_id) {
      return message.reply('❌ Kendi oyuncuna teklif gönderemezsin.');
    }
    if (targetUser && targetUser.team_id === user.team_id) {
      return message.reply('❌ Bu kişi zaten senin takımında.');
    }

    let fromTeamId = null;
    let fromTeamName = 'Serbest';
    let playerId = player ? player.id : null;
    let playerName = player ? player.name : isim;

    if (player && player.team_id) {
      fromTeamId = player.team_id;
      const t = db.prepare('SELECT name FROM teams WHERE id = ?').get(player.team_id);
      fromTeamName = t ? t.name : 'Bilinmiyor';
    } else if (targetUser && targetUser.team_id) {
      fromTeamId = targetUser.team_id;
      const t = db.prepare('SELECT name FROM teams WHERE id = ?').get(targetUser.team_id);
      fromTeamName = t ? t.name : 'Bilinmiyor';
    }

    // Serbest ve players kaydı yoksa oluştur
    if (!playerId) {
      const r = db.prepare(`
        INSERT INTO players (name, team_id, position, overall, value, age, sut, pas, defans, hiz, fizik, top_kontrolu)
        VALUES (?, NULL, 'MF', 70, ?, 22, 70, 70, 70, 70, 70, 70)
      `).run(playerName, bonservis);
      playerId = r.lastInsertRowid;
    }

    // transfers tablosuna seasons + wage da yazacağız (kolon yoksa offer notuna gömelim)
    // Basit çözüm: transfers'a ek kolon yoksa JSON gibi tutmuyoruz, kabulde args'ı tekrar istememek için
    // transfers tablosuna seasons ve wage kolonları eklenmeli — db'de varsa kullan
    try {
      db.exec(`ALTER TABLE transfers ADD COLUMN seasons INTEGER DEFAULT 1`);
    } catch (_) {}
    try {
      db.exec(`ALTER TABLE transfers ADD COLUMN wage INTEGER DEFAULT 0`);
    } catch (_) {}

    const transferResult = db.prepare(`
      INSERT INTO transfers (player_id, from_team_id, to_team_id, offer_amount, offered_by, seasons, wage)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(playerId, fromTeamId, user.team_id, bonservis, userId, seasons, wage);

    const durum = fromTeamId
      ? `Mevcut takım (${fromTeamName}) kabul/red edecek`
      : `Serbest oyuncu kendisi kabul/red edebilir`;

    const embed = new EmbedBuilder()
      .setColor(0x3498DB)
      .setTitle('💼 Transfer Teklifi Gönderildi')
      .setThumbnail(mentionedUser.displayAvatarURL({ dynamic: true }))
      .addFields(
        { name: 'Oyuncu', value: playerName, inline: true },
        { name: 'Discord', value: `${mentionedUser}`, inline: true },
        { name: 'Durum', value: fromTeamId ? `🏟️ ${fromTeamName}` : '🆓 Serbest', inline: true },
        { name: 'Bonservis', value: `**${bonservis.toLocaleString('tr-TR')} €**`, inline: true },
        { name: 'Sözleşme', value: `**${seasons} sezon**`, inline: true },
        { name: 'Maaş', value: `**${wage.toLocaleString('tr-TR')} €**`, inline: true },
        { name: 'Hedef Takım', value: myTeam.name, inline: true },
        { name: 'Transfer ID', value: `\`${transferResult.lastInsertRowid}\``, inline: true }
      )
      .setFooter({ text: `${durum} → ${config.prefix}transfer-kabul ${transferResult.lastInsertRowid}` })
      .setTimestamp();

    await message.reply({ embeds: [embed] });
  }
};