const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'oyuncular',
  aliases: ['kadro-liste', 'players'],
  description: 'Takımın oyuncularını listeler',
  usage: 'oyuncular [takım adı]',

  async execute(message, args, db, client) {
    const config = client.config;
    const userId = message.author.id;
    let teamName = args.length > 0 ? args.join(' ') : null;

    let team;
    if (teamName) {
      team = db.prepare('SELECT * FROM teams WHERE name = ?').get(teamName);
    } else {
      const user = db.prepare('SELECT * FROM users WHERE discord_id = ?').get(userId);
      if (!user || !user.team_id) {
        return message.reply(`❌ Takım belirt veya önce kayıt ol (\`${config.prefix}kayit\`).`);
      }
      team = db.prepare('SELECT * FROM teams WHERE id = ?').get(user.team_id);
    }

    if (!team) return message.reply('❌ Takım bulunamadı.');

    const players = db.prepare('SELECT * FROM players WHERE team_id = ? ORDER BY overall DESC').all(team.id);

    if (players.length === 0) {
      return message.reply(`**${team.name}** takımında henüz oyuncu yok.`);
    }

    const list = players.map(p =>
      `\`#${p.id}\` **${p.name}** (${p.position}) - OVR **${p.overall}** | ${p.value.toLocaleString('tr-TR')}€`
    ).join('\n');

    const description = list.length > 4000 ? list.slice(0, 4000) + '\n...' : list;

    const embed = new EmbedBuilder()
      .setColor(0x1ABC9C)
      .setTitle(`👥 ${team.name} Kadrosu`)
      .setDescription(description)
      .addFields(
        { name: 'Form', value: `${team.form}/100`, inline: true },
        { name: 'Bütçe', value: `${team.budget.toLocaleString('tr-TR')} €`, inline: true },
        { name: 'Antrenman', value: `${team.training_count}`, inline: true }
      )
      .setFooter({ text: `Toplam ${players.length} oyuncu` })
      .setTimestamp();

    await message.reply({ embeds: [embed] });
  }
};