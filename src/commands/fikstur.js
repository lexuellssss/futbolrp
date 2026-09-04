const { AttachmentBuilder } = require('discord.js');
const { getFixturesByWeek, getCurrentWeek } = require('../utils/fixtureHelper');
const { drawFixtureCard } = require('../utils/canvasCards');

module.exports = {
  name: 'fikstur',
  aliases: ['fixture', 'maclar'],
  description: 'Haftalık fikstürü gösterir',
  usage: 'fikstur [hafta]',

  async execute(message, args, db, client) {
    let week = args[0] ? parseInt(args[0]) : getCurrentWeek(db);

    if (isNaN(week) || week < 1) {
      return message.reply('❌ Geçerli bir hafta numarası gir.');
    }

    const fixtures = getFixturesByWeek(db, week);

    if (fixtures.length === 0) {
      return message.reply(
        `❌ **Hafta ${week}** için maç yok.\n` +
        `Önce \`${client.config.prefix}fikstur-olustur\` ile fikstür oluştur.`
      );
    }

    try {
      const buffer = drawFixtureCard(week, fixtures);
      const file = new AttachmentBuilder(buffer, { name: `fikstur-hafta-${week}.png` });

      await message.reply({
        content: `📅 **Hafta ${week}** fikstürü`,
        files: [file]
      });
    } catch (err) {
      console.error('Fikstür canvas hatası:', err);
      // Canvas hata verirse embed yedek
      const lines = fixtures.map(f => {
        if (f.status === 'oynandi') {
          return `**${f.home_name}** ${f.home_score}-${f.away_score} **${f.away_name}**`;
        }
        return `**${f.home_name}** vs **${f.away_name}**`;
      }).join('\n');

      await message.reply(`📅 **Hafta ${week}**\n\n${lines}`);
    }
  }
};