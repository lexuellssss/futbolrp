const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  name: 'kayit',
  aliases: ['kayıt', 'takimolustur'],
  description: 'Takım oluşturur veya serbest oyuncu kaydeder (Kayıt Yetkilisi)',
  usage: 'kayit <takım> <baskan|td> @üye  |  kayit @üye',

  async execute(message, args, db, client) {
    const config = client.config;

    // ========== YETKİ KONTROLÜ ==========
    const kayitKey = config.roles?.kayitYetkilisi || 'Kayıt Yetkilisi';
    const kayitRolu = await findRole(message.guild, kayitKey);
    const hasKayitRolu = kayitRolu && message.member.roles.cache.has(kayitRolu.id);
    const isAdmin = message.member.permissions.has(PermissionFlagsBits.Administrator);

    if (!hasKayitRolu && !isAdmin) {
      return message.reply(`❌ Bu komutu sadece **${kayitKey}** rolüne sahip kişiler kullanabilir.`);
    }

    // Mention yoksa hata
    if (message.mentions.users.size === 0) {
      return message.reply(
        `❌ Kullanım:\n` +
        `• Takım kurmak: \`${config.prefix}kayit <takım> <baskan|td> @üye\`\n` +
        `• Serbest oyuncu: \`${config.prefix}kayit @üye\``
      );
    }

    const mentionedUser = message.mentions.users.first();
    const member = await message.guild.members.fetch(mentionedUser.id).catch(() => null);
    if (!member) {
      return message.reply('❌ Kullanıcı sunucuda bulunamadı.');
    }

    // Mention dışındaki argümanlar
    const cleanArgs = args.filter(arg => !arg.includes(mentionedUser.id) && !arg.startsWith('<@'));

    // ========== SERBEST OYUNCU KAYDI ==========
    if (cleanArgs.length === 0) {
      const existing = db.prepare('SELECT * FROM users WHERE discord_id = ?').get(mentionedUser.id);
      if (existing && existing.team_id) {
        return message.reply(`❌ ${mentionedUser} zaten bir takıma kayıtlı.`);
      }

      db.prepare(`
        INSERT OR REPLACE INTO users (discord_id, team_id, role)
        VALUES (?, NULL, 'serbest')
      `).run(mentionedUser.id);

      await giveRole(member, config.roles?.serbest || 'Serbest Oyuncu', message);

      const embed = new EmbedBuilder()
        .setColor(0x95A5A6)
        .setTitle('🆓 Serbest Oyuncu Kaydı')
        .setDescription(`${mentionedUser} **Serbest Oyuncu** olarak kaydedildi.`)
        .addFields(
          { name: 'Yetkili', value: `${message.author}`, inline: true },
          { name: 'Rol', value: '🆓 Serbest Oyuncu', inline: true }
        )
        .setThumbnail(mentionedUser.displayAvatarURL({ dynamic: true }))
        .setTimestamp();

      return message.reply({ embeds: [embed] });
    }

    // ========== TAKIM KURMA ==========
    if (cleanArgs.length < 2) {
      return message.reply(
        `❌ Kullanım: \`${config.prefix}kayit <takım adı> <baskan|td> @üye\`\n` +
        `Örnek: \`${config.prefix}kayit Karadayilar baskan @Ali\``
      );
    }

    const rol = cleanArgs.pop().toLowerCase();
    const takimAdi = cleanArgs.join(' ');

    if (!['baskan', 'td', 'başkan'].includes(rol)) {
      return message.reply('❌ Rol `baskan` veya `td` olmalı.');
    }

    const finalRol = rol === 'başkan' ? 'baskan' : rol;

    const existingUser = db.prepare('SELECT * FROM users WHERE discord_id = ?').get(mentionedUser.id);
    if (existingUser && existingUser.team_id) {
      return message.reply(`❌ ${mentionedUser} zaten bir takıma kayıtlı!`);
    }

    const teamExists = db.prepare('SELECT * FROM teams WHERE name = ?').get(takimAdi);
    if (teamExists) {
      return message.reply(`❌ **${takimAdi}** adında bir takım zaten var.`);
    }

    const budget = config.startingBudget || 50000000;
    const form = config.formBase || 50;

    const result = db.prepare(`
      INSERT INTO teams (name, owner_id, budget, form, training_count)
      VALUES (?, ?, ?, ?, 0)
    `).run(takimAdi, mentionedUser.id, budget, form);

    const teamId = result.lastInsertRowid;

    db.prepare(`
      INSERT OR REPLACE INTO users (discord_id, team_id, role)
      VALUES (?, ?, ?)
    `).run(mentionedUser.id, teamId, finalRol);

    // Discord rolü ver
    const roleKey = finalRol === 'baskan'
      ? (config.roles?.baskan || 'Başkan')
      : (config.roles?.td || 'Teknik Direktör');

    await giveRole(member, roleKey, message);

    // Serbest oyuncu rolü varsa kaldır
    const serbestRole = await findRole(message.guild, config.roles?.serbest || 'Serbest Oyuncu');
    if (serbestRole && member.roles.cache.has(serbestRole.id)) {
      await member.roles.remove(serbestRole).catch(() => {});
    }

    const embed = new EmbedBuilder()
      .setColor(config.colors?.success || 0x00FF00)
      .setTitle('✅ Takım Oluşturuldu!')
      .setDescription(`**${takimAdi}** takımı başarıyla kuruldu.`)
      .addFields(
        { name: 'Yetkili', value: `${message.author}`, inline: true },
        { name: 'Atanan Kişi', value: `${mentionedUser}`, inline: true },
        { name: 'Rol', value: finalRol === 'baskan' ? '👑 Başkan' : '🧠 Teknik Direktör', inline: true },
        { name: 'Bütçe', value: `${budget.toLocaleString('tr-TR')} €`, inline: true },
        { name: 'Form', value: `${form}/100`, inline: true }
      )
      .setThumbnail(mentionedUser.displayAvatarURL({ dynamic: true }))
      .setFooter({ text: `Discord rolü verildi` })
      .setTimestamp();

    await message.reply({ embeds: [embed] });
  }
};

// ========== ROL YARDIMCILARI ==========

async function findRole(guild, idOrName) {
  if (!idOrName) return null;
  const key = String(idOrName).trim();

  // Cache boşsa doldur
  if (guild.roles.cache.size <= 1) {
    await guild.roles.fetch().catch(() => {});
  }

  // ID ise
  if (/^\d{17,20}$/.test(key)) {
    let role = guild.roles.cache.get(key);
    if (!role) {
      role = await guild.roles.fetch(key).catch(() => null);
    }
    return role;
  }

  // İsim ise
  return guild.roles.cache.find(r => r.name.toLowerCase() === key.toLowerCase()) || null;
}

async function giveRole(member, idOrName, message) {
  try {
    const role = await findRole(message.guild, idOrName);

    if (!role) {
      console.error('Rol bulunamadı:', idOrName);
      await message.channel.send(
        `⚠️ Rol bulunamadı: \`${idOrName}\`\nConfig'deki ID/ismi kontrol et.`
      ).catch(() => {});
      return;
    }

    const botMember = message.guild.members.me;
    if (botMember && role.position >= botMember.roles.highest.position) {
      await message.channel.send(
        `⚠️ \`${role.name}\` bot rolünden yukarıda. Bot rolünü daha üste taşı.`
      ).catch(() => {});
      return;
    }

    await member.roles.add(role);
  } catch (err) {
    console.error('Rol verme hatası:', err.message);
    await message.channel.send(`⚠️ Rol verilemedi: \`${err.message}\``).catch(() => {});
  }
}