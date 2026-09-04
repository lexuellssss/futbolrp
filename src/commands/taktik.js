const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'taktik',
  aliases: ['tactic', 'formasyon'],
  description: 'Takım taktiğini ayarlar',
  usage: 'taktik <formasyon> <stil>',

  async execute(message, args, db, client) {
    const config = client.config;
    const userId = message.author.id;
    const user = db.prepare('SELECT * FROM users WHERE discord_id = ?').get(userId);

    if (!user || !user.team_id) {
      return message.reply(`❌ Önce bir takıma kayıt olmalısın (\`${config.prefix}kayit\`).`);
    }
    if (!['td', 'baskan', 'admin'].includes(user.role)) {
      return message.reply('❌ Sadece TD veya Başkan taktik belirleyebilir.');
    }

    if (args.length < 2) {
      return message.reply(
        `❌ Kullanım: \`${config.prefix}taktik <formasyon> <stil>\`\n` +
        `Formasyon: 4-3-3, 4-2-3-1, 4-4-2, 5-3-2, 3-5-2\n` +
        `Stil: hücum, dengeli, defans`
      );
    }

    const formasyon = args[0];
    const stil = args[1].toLowerCase();

    const gecerliFormasyon = ['4-3-3', '4-2-3-1', '4-4-2', '5-3-2', '3-5-2'];
    const gecerliStil = ['hücum', 'dengeli', 'defans'];

    if (!gecerliFormasyon.includes(formasyon)) {
      return message.reply(`❌ Geçersiz formasyon. Kullanılabilir: ${gecerliFormasyon.join(', ')}`);
    }
    if (!gecerliStil.includes(stil)) {
      return message.reply(`❌ Geçersiz stil. Kullanılabilir: ${gecerliStil.join(', ')}`);
    }

    db.prepare('UPDATE teams SET tactics = ?, style = ? WHERE id = ?')
      .run(formasyon, stil, user.team_id);

    const team = db.prepare('SELECT name FROM teams WHERE id = ?').get(user.team_id);

    const embed = new EmbedBuilder()
      .setColor(0x9B59B6)
      .setTitle('📐 Taktik Güncellendi')
      .setDescription(`**${team.name}** takımı için yeni taktik belirlendi.`)
      .addFields(
        { name: 'Formasyon', value: formasyon, inline: true },
        { name: 'Oyun Stili', value: stil.charAt(0).toUpperCase() + stil.slice(1), inline: true }
      )
      .setTimestamp();

    await message.reply({ embeds: [embed] });
  }
};