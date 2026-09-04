const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { simulateMatch } = require('../utils/matchSimulator');

module.exports = {
  name: 'mac-oynat',
  aliases: ['macoynat', 'match', 'maç'],
  description: 'Canlı maç simülasyonu (Admin)',
  usage: 'mac-oynat <ev_sahibi> <deplasman>',

  async execute(message, args, db, client) {
    if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return message.reply('❌ Bu komutu sadece Adminler kullanabilir.');
    }

    if (args.length < 2) {
      return message.reply(`❌ Kullanım: \`${client.config.prefix}mac-oynat <ev_sahibi> <deplasman>\``);
    }

    const homeName = args[0];
    const awayName = args.slice(1).join(' ');

    const homeTeam = db.prepare('SELECT * FROM teams WHERE name = ?').get(homeName);
    const awayTeam = db.prepare('SELECT * FROM teams WHERE name = ?').get(awayName);

    if (!homeTeam || !awayTeam) return message.reply('❌ Takımlardan biri bulunamadı.');
    if (homeTeam.id === awayTeam.id) return message.reply('❌ Aynı takım kendisiyle maç oynayamaz.');

    const homePlayers = db.prepare('SELECT * FROM players WHERE team_id = ?').all(homeTeam.id);
    const awayPlayers = db.prepare('SELECT * FROM players WHERE team_id = ?').all(awayTeam.id);

    if (homePlayers.length < 2 || awayPlayers.length < 2) {
      return message.reply('❌ Her iki takımda da en az 2 oyuncu olmalı.');
    }

    const homeLineup = db.prepare('SELECT * FROM lineups WHERE team_id = ?').get(homeTeam.id);
    const awayLineup = db.prepare('SELECT * FROM lineups WHERE team_id = ?').get(awayTeam.id);

    // Simülasyonu önceden hesapla
    const result = simulateMatch(homeTeam, awayTeam, homePlayers, awayPlayers, homeLineup, awayLineup);

    db.prepare(`
      INSERT INTO matches (home_team_id, away_team_id, home_score, away_score, events, stats)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      homeTeam.id, awayTeam.id,
      result.homeScore, result.awayScore,
      JSON.stringify(result.events), JSON.stringify(result.stats)
    );

    // Fikstür + puan tablosu güncelle
    try {
      const { updateStandings, markFixturePlayed } = require('../utils/fixtureHelper');
      updateStandings(db, homeTeam.id, awayTeam.id, result.homeScore, result.awayScore);
      markFixturePlayed(db, homeTeam.id, awayTeam.id, result.homeScore, result.awayScore);
    } catch (e) {
      console.error('Fikstür/puan güncelleme hatası:', e.message);
    }

    // Kazanan takıma ödül
    const MAC_ODULU = 100000;
    let odulText = 'Beraberlik — ödül yok';
    if (result.homeScore > result.awayScore) {
      db.prepare('UPDATE teams SET budget = budget + ? WHERE id = ?')
        .run(MAC_ODULU, homeTeam.id);
      odulText = `**${homeName}** +${MAC_ODULU.toLocaleString('tr-TR')} € kazandı`;
    } else if (result.awayScore > result.homeScore) {
      db.prepare('UPDATE teams SET budget = budget + ? WHERE id = ?')
        .run(MAC_ODULU, awayTeam.id);
      odulText = `**${awayName}** +${MAC_ODULU.toLocaleString('tr-TR')} € kazandı`;
    }

    const wait = (ms) => new Promise(r => setTimeout(r, ms));

    // ========== 1) MAÇ BAŞLIYOR ==========
    let embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle(`🏟️ ${homeName} vs ${awayName}`)
      .setDescription('**Maç başlıyor...**\n\n⏳ Hakem düdüğü çalıyor!')
      .setFooter({ text: 'Canlı Maç' });

    const msg = await message.reply({ embeds: [embed] });
    await wait(2500);

    // Olayları yarıya böl
    const firstHalf = result.events.filter(e => e.minute <= 45);
    const secondHalf = result.events.filter(e => e.minute > 45);

    let tempHome = 0;
    let tempAway = 0;
    let liveText = '';

    // ========== 2) İLK YARI ==========
    embed.setColor(0x3498DB).setDescription(`**İlk Yarı Başladı**\n\n\`0' - 45'\``);
    await msg.edit({ embeds: [embed] });
    await wait(2000);

    for (const event of firstHalf) {
      const icon = event.type === 'gol' ? '⚽' : event.type === 'sari_kart' ? '🟨' : '🟥';
      const teamLabel = event.team === 'home' ? homeName : awayName;

      if (event.type === 'gol') {
        if (event.team === 'home') tempHome++;
        else tempAway++;
      }

      liveText += `\`${event.minute}'\` ${icon} **${event.player}** (${teamLabel})\n`;

      embed.setDescription(
        `**İlk Yarı**\n` +
        `### ${homeName} ${tempHome} - ${tempAway} ${awayName}\n\n` +
        liveText
      );
      await msg.edit({ embeds: [embed] });
      await wait(2000);
    }

    // ========== 3) DEVRE ARASI ==========
    embed.setColor(0xF1C40F).setDescription(
      `**⏸️ Devre Arası**\n\n` +
      `### ${homeName} ${tempHome} - ${tempAway} ${awayName}\n\n` +
      `İlk yarı sona erdi. Oyuncular soyunma odasına gidiyor...`
    );
    await msg.edit({ embeds: [embed] });
    await wait(3500);

    // ========== 4) İKİNCİ YARI ==========
    liveText = '';
    embed.setColor(0xE67E22).setDescription(`**İkinci Yarı Başladı**\n\n\`46' - 90'\``);
    await msg.edit({ embeds: [embed] });
    await wait(2000);

    for (const event of secondHalf) {
      const icon = event.type === 'gol' ? '⚽' : event.type === 'sari_kart' ? '🟨' : '🟥';
      const teamLabel = event.team === 'home' ? homeName : awayName;

      if (event.type === 'gol') {
        if (event.team === 'home') tempHome++;
        else tempAway++;
      }

      liveText += `\`${event.minute}'\` ${icon} **${event.player}** (${teamLabel})\n`;

      embed.setDescription(
        `**İkinci Yarı**\n` +
        `### ${homeName} ${tempHome} - ${tempAway} ${awayName}\n\n` +
        liveText
      );
      await msg.edit({ embeds: [embed] });
      await wait(2000);
    }

    // ========== 5) MAÇ BİTTİ ==========
    const finalColor = result.homeScore > result.awayScore ? 0x00FF00 :
                       result.homeScore < result.awayScore ? 0xFF0000 : 0xFFFF00;

    let allEvents = result.events.slice(0, 12).map(e => {
      const icon = e.type === 'gol' ? '⚽' : e.type === 'sari_kart' ? '🟨' : '🟥';
      const teamLabel = e.team === 'home' ? homeName : awayName;
      return `\`${e.minute}'\` ${icon} **${e.player}** (${teamLabel})`;
    }).join('\n');

    if (result.events.length > 12) {
      allEvents += `\n... +${result.events.length - 12} olay daha`;
    }

    embed
      .setColor(finalColor)
      .setTitle(`🏁 ${homeName} ${result.homeScore} - ${result.awayScore} ${awayName}`)
      .setDescription('**Maç Sona Erdi!**')
      .setFields(
        {
          name: '📊 Güç & Form',
          value: `**${homeName}**: Overall ${result.homeStrength} | Form ${homeTeam.form}\n**${awayName}**: Overall ${result.awayStrength} | Form ${awayTeam.form}`
        },
        {
          name: '⚽ Goller',
          value: `**${homeName}**: ${result.homeScorers.join(', ') || '-'}\n**${awayName}**: ${result.awayScorers.join(', ') || '-'}`
        },
        {
          name: '📈 İstatistikler',
          value:
            `**Top Hakimiyeti**: ${result.stats.home.possession}% - ${result.stats.away.possession}%\n` +
            `**Şutlar**: ${result.stats.home.shots} - ${result.stats.away.shots}\n` +
            `**İsabetli Şut**: ${result.stats.home.shotsOnTarget} - ${result.stats.away.shotsOnTarget}\n` +
            `**xG**: ${result.stats.home.xG} - ${result.stats.away.xG}`
        },
        {
          name: '💰 Maç Ödülü',
          value: odulText
        },
        {
          name: '📝 Tüm Olaylar',
          value: allEvents || 'Olay yok'
        }
      )
      .setFooter({ text: 'Form yüksek olan takım avantajlıdır' })
      .setTimestamp();

    await msg.edit({ embeds: [embed] });
  }
};