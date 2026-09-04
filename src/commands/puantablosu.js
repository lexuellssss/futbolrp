const { AttachmentBuilder } = require('discord.js');
const { getStandings } = require('../utils/fixtureHelper');
const { drawStandingsCard } = require('../utils/canvasCards');

module.exports = {
  name: 'puantablosu',
  aliases: ['puan', 'tablo', 'standings'],
  description: 'Puan tablosunu gösterir',
  usage: 'puantablosu',

  async execute(message, args, db, client) {
    const standings = getStandings(db);

    if (standings.length === 0) {
      return message.reply(
        `❌ Puan tablosu boş.\n` +
        `Önce \`${client.config.prefix}fikstur-olustur\` ile ligi başlat.`
      );
    }

    try {
      const buffer = drawStandingsCard(standings);
      const file = new AttachmentBuilder(buffer, { name: 'puan-tablosu.png' });

      await message.reply({
        content: '🏆 **Puan Tablosu**',
        files: [file]
      });
    } catch (err) {
      console.error('Puan tablosu canvas hatası:', err);

      const lines = standings.map((s, i) => {
        const gd = s.gd >= 0 ? `+${s.gd}` : s.gd;
        return `**${i + 1}.** ${s.team_name} — ${s.points}p | ${s.played}O ${s.won}G ${s.drawn}B ${s.lost}M | Av: ${gd}`;
      }).join('\n');

      await message.reply(`🏆 **Puan Tablosu**\n\n${lines}`);
    }
  }
};