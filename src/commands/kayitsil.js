const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  name: 'kayitsil',
  aliases: ['kayıtsil', 'kayit-sil', 'unregister'],
  description: 'Bir kişinin kaydını siler (Kayıt Yetkilisi)',
  usage: 'kayitsil @üye',

  async execute(message, args, db, client) {
    const config = client.config;

    // Yetki kontrolü
    const kayitRolAdi = config.roles?.kayitYetkilisi || 'Kayıt Yetkilisi';
    const kayitRolu = message.guild.roles.cache.find(r => r.name === kayitRolAdi);
    const hasKayitRolu = kayitRolu && message.member.roles.cache.has(kayitRolu.id);
    const isAdmin = message.member.permissions.has(PermissionFlagsBits.Administrator);

    if (!hasKayitRolu && !isAdmin) {
      return message.reply(`❌ Bu komutu sadece **${kayitRolAdi}** kullanabilir.`);
    }

    if (message.mentions.users.size === 0) {
      return message.reply(`❌ Kullanım: \`${config.prefix}kayitsil @üye\``);
    }

    const mentionedUser = message.mentions.users.first();
    const member = await message.guild.members.fetch(mentionedUser.id).catch(() => null);

    const user = db.prepare('SELECT * FROM users WHERE discord_id = ?').get(mentionedUser.id);
    if (!user) {
      return message.reply(`❌ ${mentionedUser} sistemde kayıtlı değil.`);
    }

    // Takım sahibi ise uyar (takım silinmez, sadece kişi ayrılır)
    let teamName = null;
    if (user.team_id) {
      const team = db.prepare('SELECT name, owner_id FROM teams WHERE id = ?').get(user.team_id);
      if (team) {
        teamName = team.name;
        // Owner ise team owner_id'yi temizleme, sadece kullanıcıyı çıkar
      }
    }

    // Kullanıcı kaydını sil
    db.prepare('DELETE FROM users WHERE discord_id = ?').run(mentionedUser.id);

    // Discord rollerini al
    if (member) {
      const baskanRole = message.guild.roles.cache.find(r => r.name === (config.roles?.baskan || 'Başkan'));
      const tdRole = message.guild.roles.cache.find(r => r.name === (config.roles?.td || 'Teknik Direktör'));
      const serbestRole = message.guild.roles.cache.find(r => r.name === (config.roles?.serbest || 'Serbest Oyuncu'));

      if (baskanRole) await member.roles.remove(baskanRole).catch(() => {});
      if (tdRole) await member.roles.remove(tdRole).catch(() => {});
      if (serbestRole) await member.roles.remove(serbestRole).catch(() => {});
    }

    const embed = new EmbedBuilder()
      .setColor(0xFF0000)
      .setTitle('🗑️ Kayıt Silindi')
      .setDescription(`${mentionedUser} sistemden çıkarıldı.`)
      .addFields(
        { name: 'Silen', value: `${message.author}`, inline: true },
        { name: 'Eski Takım', value: teamName || 'Yok (Serbest)', inline: true },
        { name: 'Eski Rol', value: user.role || '-', inline: true }
      )
      .setThumbnail(mentionedUser.displayAvatarURL({ dynamic: true }))
      .setTimestamp();

    await message.reply({ embeds: [embed] });
  }
};