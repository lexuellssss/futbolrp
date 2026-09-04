const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'kadro',
  aliases: ['lineup'],
  description: 'Pozisyonlara göre kadro ayarlar',
  usage: 'kadro kaleci @oyuncu defans @oyuncu1 @oyuncu2 ... orta ... forvet ...',

  async execute(message, args, db, client) {
    const config = client.config;
    const userId = message.author.id;
    const user = db.prepare('SELECT * FROM users WHERE discord_id = ?').get(userId);

    if (!user || !user.team_id) {
      return message.reply('❌ Önce bir takıma kayıt olmalısın.');
    }
    if (!['td', 'baskan', 'admin'].includes(user.role)) {
      return message.reply('❌ Sadece TD veya Başkan kadro ayarlayabilir.');
    }

    if (args.length < 2) {
      return message.reply(
        `❌ Kullanım:\n` +
        `\`${config.prefix}kadro kaleci @Ali defans @Mehmet @Can @Burak @Emre orta @Yusuf @Kerem @Okan forvet @Arda @Barış @Deniz\`\n\n` +
        `Kısaltmalar: \`gk\` \`df\` \`mf\` \`fw\``
      );
    }

    // Pozisyon anahtar kelimeleri
    const posMap = {
      kaleci: 'GK', gk: 'GK',
      defans: 'DF', df: 'DF',
      orta: 'MF', mf: 'MF', ortasaha: 'MF',
      forvet: 'FW', fw: 'FW', for: 'FW'
    };

    // Argümanları parse et
    const positions = { GK: [], DF: [], MF: [], FW: [] };
    let currentPos = null;

    // Mention ID'lerini sırayla al
    const mentionRegex = /<@!?(\d+)>/g;
    const content = message.content;
    const tokens = content.slice(content.indexOf(args[0])).split(/\s+/);

    for (const token of tokens) {
      const lower = token.toLowerCase().replace(/[.,]/g, '');

      // Pozisyon anahtarı mı?
      if (posMap[lower]) {
        currentPos = posMap[lower];
        continue;
      }

      // Mention mı?
      const mentionMatch = token.match(/^<@!?(\d+)>$/);
      if (mentionMatch && currentPos) {
        positions[currentPos].push(mentionMatch[1]);
      }
    }

    // Toplam oyuncu sayısı
    const total = positions.GK.length + positions.DF.length + positions.MF.length + positions.FW.length;

    if (total === 0) {
      return message.reply('❌ Hiç oyuncu etiketlemedin. Pozisyon yazıp etiketlemelisin.');
    }

    if (total !== 11) {
      return message.reply(`❌ Toplam **11 oyuncu** seçmelisin. Şu an: **${total}** oyuncu seçildi.`);
    }

    if (positions.GK.length !== 1) {
      return message.reply('❌ Tam **1 kaleci** seçmelisin.');
    }

    // Oyuncuları veritabanından bul ve kontrol et
    const allPlayers = [];
    const result = { GK: [], DF: [], MF: [], FW: [] };

    for (const [pos, ids] of Object.entries(positions)) {
      for (const id of ids) {
        const member = await message.guild.members.fetch(id).catch(() => null);
        if (!member) {
          return message.reply(`❌ <@${id}> sunucuda bulunamadı.`);
        }

        const isim = member.displayName || member.user.username;
        let player = db.prepare('SELECT * FROM players WHERE name = ?').get(isim);
        if (!player) {
          player = db.prepare('SELECT * FROM players WHERE name LIKE ?').get(`%${isim}%`);
        }

        if (!player) {
          return message.reply(`❌ **${isim}** sistemde oyuncu olarak kayıtlı değil.`);
        }
        if (player.team_id !== user.team_id) {
          return message.reply(`❌ **${isim}** senin takımında değil.`);
        }

        // Aynı oyuncu birden fazla seçilmiş mi?
        if (allPlayers.find(p => p.id === player.id)) {
          return message.reply(`❌ **${isim}** birden fazla kez seçilmiş.`);
        }

        allPlayers.push(player);
        result[pos].push(player);
      }
    }

    // Kaydet (starters = tüm 11, pozisyon bilgisiyle)
    const startersData = {
      GK: result.GK.map(p => p.id),
      DF: result.DF.map(p => p.id),
      MF: result.MF.map(p => p.id),
      FW: result.FW.map(p => p.id)
    };

    db.prepare(`
      INSERT INTO lineups (team_id, starters, substitutes)
      VALUES (?, ?, ?)
      ON CONFLICT(team_id) DO UPDATE SET 
        starters = excluded.starters, 
        substitutes = excluded.substitutes
    `).run(
      user.team_id,
      JSON.stringify(startersData),
      JSON.stringify([]) // şimdilik yedek yok, istersen sonra ekleriz
    );

    // Embed oluştur
    const formatPos = (list) => list.map(p => `**${p.name}**`).join(', ') || '-';

    const embed = new EmbedBuilder()
      .setColor(0xFFD700)
      .setTitle('📋 Kadro Ayarlandı')
      .addFields(
        { name: '🧤 Kaleci', value: formatPos(result.GK), inline: false },
        { name: '🛡️ Defans', value: formatPos(result.DF), inline: false },
        { name: '⚙️ Orta Saha', value: formatPos(result.MF), inline: false },
        { name: '⚽ Forvet', value: formatPos(result.FW), inline: false }
      )
      .setFooter({ text: `Toplam 11 oyuncu • ${result.DF.length} DF - ${result.MF.length} MF - ${result.FW.length} FW` })
      .setTimestamp();

    await message.reply({ embeds: [embed] });
  }
};