const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  name: 'takimsil',
  aliases: ['takımsil', 'teamsil', 'klupsil'],
  description: 'Bir takımı siler (Kayıt Yetkilisi)',
  usage: 'takimsil <takım adı>',

  async execute(message, args, db, client) {
    const config = client.config;

    const kayitRolAdi = config.roles?.kayitYetkilisi || 'Kayıt Yetkilisi';
    const kayitRolu = message.guild.roles.cache.find(r => r.name === kayitRolAdi);
    const hasKayitRolu = kayitRolu && message.member.roles.cache.has(kayitRolu.id);
    const isAdmin = message.member.permissions.has(PermissionFlagsBits.Administrator);

    if (!hasKayitRolu && !isAdmin) {
      return message.reply(`❌ Bu komutu sadece **${kayitRolAdi}** kullanabilir.`);
    }

    if (args.length < 1) {
      return message.reply(`❌ Kullanım: \`${config.prefix}takimsil <takım adı>\``);
    }

    const takimAdi = args.join(' ');
    const team = db.prepare('SELECT * FROM teams WHERE name = ?').get(takimAdi);

    if (!team) {
      return message.reply(`❌ **${takimAdi}** adında takım bulunamadı.`);
    }

    const teamUsers = db.prepare('SELECT discord_id, role FROM users WHERE team_id = ?').all(team.id);

    // Sıralı silme — foreign key hatası olmasın
    db.prepare('DELETE FROM contracts WHERE team_id = ?').run(team.id);
    db.prepare('DELETE FROM contracts WHERE player_id IN (SELECT id FROM players WHERE team_id = ?)').run(team.id);

    db.prepare('DELETE FROM transfers WHERE from_team_id = ? OR to_team_id = ?').run(team.id, team.id);
    db.prepare('DELETE FROM transfers WHERE player_id IN (SELECT id FROM players WHERE team_id = ?)').run(team.id);

    db.prepare('DELETE FROM fixtures WHERE home_team_id = ? OR away_team_id = ?').run(team.id, team.id);
    db.prepare('DELETE FROM matches WHERE home_team_id = ? OR away_team_id = ?').run(team.id, team.id);
    db.prepare('DELETE FROM standings WHERE team_id = ?').run(team.id);
    db.prepare('DELETE FROM lineups WHERE team_id = ?').run(team.id);

    // Oyuncuları serbest bırak (silme, takımsız yap)
    db.prepare('UPDATE players SET team_id = NULL WHERE team_id = ?').run(team.id);

    // Kullanıcıları serbest yap
    db.prepare('UPDATE users SET team_id = NULL, role = ? WHERE team_id = ?').run('serbest', team.id);

    // Son olarak takımı sil
    db.prepare('DELETE FROM teams WHERE id = ?').run(team.id);

    // Discord rolleri
    for (const u of teamUsers) {
      try {
        const member = await message.guild.members.fetch(u.discord_id).catch(() => null);
        if (!member) continue;

        const baskanRole = message.guild.roles.cache.find(r => r.name === (config.roles?.baskan || 'Başkan'));
        const tdRole = message.guild.roles.cache.find(r => r.name === (config.roles?.td || 'Teknik Direktör'));
        const serbestRole = message.guild.roles.cache.find(r => r.name === (config.roles?.serbest || 'Serbest Oyuncu'));

        if (baskanRole) await member.roles.remove(baskanRole).catch(() => {});
        if (tdRole) await member.roles.remove(tdRole).catch(() => {});
        if (serbestRole) await member.roles.add(serbestRole).catch(() => {});
      } catch (_) {}
    }

    const embed = new EmbedBuilder()
      .setColor(0xFF0000)
      .setTitle('🗑️ Takım Silindi')
      .setDescription(`**${takimAdi}** takımı başarıyla silindi.`)
      .addFields(
        { name: 'Silen', value: `${message.author}`, inline: true },
        { name: 'Etkilenen Üye', value: `${teamUsers.length} kişi`, inline: true }
      )
      .setFooter({ text: 'Oyuncular serbest • Fikstür/puan/sözleşme temizlendi' })
      .setTimestamp();

    await message.reply({ embeds: [embed] });
  }
};