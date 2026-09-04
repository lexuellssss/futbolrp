const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { generateFixtures } = require('../utils/fixtureHelper');

module.exports = {
  name: 'fikstur-olustur',
  aliases: ['fiksturolustur', 'fixtureolustur'],
  description: 'Haftalık fikstür oluşturur (Admin)',
  usage: 'fikstur-olustur',

  async execute(message, args, db, client) {
    if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return message.reply('❌ Bu komutu sadece Adminler kullanabilir.');
    }

    const result = generateFixtures(db);

    if (!result.ok) {
      return message.reply(`❌ ${result.message}`);
    }

    const embed = new EmbedBuilder()
      .setColor(0x3B82F6)
      .setTitle('📅 Fikstür Oluşturuldu')
      .setDescription('Tüm takımlar için tek devre fikstür hazırlandı.')
      .addFields(
        { name: 'Takım', value: `${result.teams}`, inline: true },
        { name: 'Maç', value: `${result.matches}`, inline: true },
        { name: 'Hafta', value: `${result.weeks}`, inline: true }
      )
      .setFooter({ text: `${client.config.prefix}fikstur yazarak görüntüle` })
      .setTimestamp();

    await message.reply({ embeds: [embed] });
  }
};