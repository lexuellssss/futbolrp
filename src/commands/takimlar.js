const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'takimlar',
  aliases: ['takımlar', 'teams', 'klupler'],
  description: 'Kayıtlı tüm takımları listeler',
  usage: 'takimlar',

  async execute(message, args, db, client) {
    const teams = db.prepare(`
      SELECT t.*, 
        (SELECT COUNT(*) FROM players WHERE team_id = t.id) as player_count
      FROM teams t
      ORDER BY t.name ASC
    `).all();

    if (teams.length === 0) {
      return message.reply('❌ Henüz hiç takım oluşturulmamış.');
    }

    const list = teams.map((t, i) => {
      const owner = t.owner_id ? `<@${t.owner_id}>` : 'Bilinmiyor';
      return (
        `**${i + 1}. ${t.name}**\n` +
        `└ 👤 ${owner} • 👥 ${t.player_count} oyuncu • 💪 Form: ${t.form} • 💰 ${t.budget.toLocaleString('tr-TR')}€`
      );
    }).join('\n\n');

    const embed = new EmbedBuilder()
      .setColor(0x1ABC9C)
      .setTitle('🏟️ Kayıtlı Takımlar')
      .setDescription(list)
      .setFooter({ text: `Toplam ${teams.length} takım` })
      .setTimestamp();

    await message.reply({ embeds: [embed] });
  }
};