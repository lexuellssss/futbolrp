const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  name: 'oyuncu-ekle',
  aliases: ['oyuncuekle', 'playeradd'],
  description: 'Oyuncu ekler (Admin) - hem etiketli hem etiketsiz isim destekler',
  usage: 'oyuncu-ekle [@üye | isim] <takım> <pozisyon> <overall> <değer> <yaş>',

  async execute(message, args, db, client) {
    if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return message.reply('❌ Bu komutu sadece Adminler kullanabilir.');
    }

    let isim;
    let mentionedUser = null;
    let cleanArgs;

    // ========== 1. ETİKETLİ KULLANIM (eski sistem) ==========
    if (message.mentions.users.size > 0) {
      mentionedUser = message.mentions.users.first();
      isim = mentionedUser.displayName || mentionedUser.username;

      // Mention'ı args'tan çıkar
      cleanArgs = args.filter(arg => !arg.includes(mentionedUser.id) && !arg.startsWith('<@'));
    } 
    // ========== 2. ETİKETSİZ KULLANIM (yeni sistem) ==========
    else {
      if (args.length < 6) {
        return message.reply(
          `❌ Kullanım:\n` +
          `• Etiketli: \`${client.config.prefix}oyuncu-ekle @üye <takım> <pozisyon> <overall> <değer> <yaş>\`\n` +
          `• Etiketsiz: \`${client.config.prefix}oyuncu-ekle <isim> <takım> <pozisyon> <overall> <değer> <yaş>\`\n\n` +
          `Örnekler:\n` +
          `\`${client.config.prefix}oyuncu-ekle @Ali Karadayilar FW 82 15000000 24\`\n` +
          `\`${client.config.prefix}oyuncu-ekle "Ali Karadayı" Karadayilar FW 82 15000000 24\``
        );
      }

      // İlk argüman isim olarak alınır
      isim = args[0];
      cleanArgs = args.slice(1);
    }

    // Geri kalan kontroller aynı
    if (cleanArgs.length < 5) {
      return message.reply(
        `❌ Eksik argüman!\n` +
        `Kullanım: \`${client.config.prefix}oyuncu-ekle [@üye <takım> <pozisyon> <overall> <değer> <yaş>\`\n` +
        `Pozisyon: GK, DF, MF, FW Örnek: !oyuncu-ekle @Ali Karadayilar FW 82 15000000 24`
      );
    }

    const takimAdi = cleanArgs[0];
    const pozisyon = cleanArgs[1].toUpperCase();
    const overall = parseInt(cleanArgs[2]);
    const deger = parseInt(cleanArgs[3]);
    const yas = parseInt(cleanArgs[4]);

    if (!['GK', 'DF', 'MF', 'FW'].includes(pozisyon)) {
      return message.reply('❌ Pozisyon **GK, DF, MF** veya **FW** olmalı.');
    }
    if (isNaN(overall) || overall < 1 || overall > 99) {
      return message.reply('❌ Overall 1-99 arasında olmalı.');
    }
    if (isNaN(deger) || deger < 100000) {
      return message.reply('❌ Değer en az 100000 olmalı.');
    }
    if (isNaN(yas) || yas < 16 || yas > 45) {
      return message.reply('❌ Yaş 16-45 arasında olmalı.');
    }

    // Takım var mı?
    const team = db.prepare('SELECT id, name FROM teams WHERE name = ?').get(takimAdi);
    if (!team) {
      return message.reply(`❌ **${takimAdi}** adında takım bulunamadı.`);
    }

    // Nitelikleri overall civarında ayarla
    const base = overall;
    const variation = () => Math.max(40, Math.min(99, base + Math.floor(Math.random() * 9) - 4));

    const result = db.prepare(`
      INSERT INTO players (name, team_id, position, overall, value, age, sut, pas, defans, hiz, fizik, top_kontrolu)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      isim,
      team.id,
      pozisyon,
      overall,
      deger,
      yas,
      variation(), variation(), variation(), variation(), variation(), variation()
    );

    // Embed oluştur
    const embed = new EmbedBuilder()
      .setColor(0x0099FF)
      .setTitle('⚽ Oyuncu Eklendi')
      .addFields(
        { name: 'İsim', value: isim, inline: true },
        { name: 'Pozisyon', value: pozisyon, inline: true },
        { name: 'Overall', value: `${overall}`, inline: true },
        { name: 'Değer', value: `${deger.toLocaleString('tr-TR')} €`, inline: true },
        { name: 'Yaş', value: `${yas}`, inline: true },
        { name: 'Takım', value: team.name, inline: true }
      )
      .setFooter({ text: `Oyuncu ID: ${result.lastInsertRowid}` })
      .setTimestamp();

    // Sadece etiketli kullanımda Discord bilgisi ve avatar ekle
    if (mentionedUser) {
      embed.setThumbnail(mentionedUser.displayAvatarURL({ dynamic: true }));
      embed.addFields({ name: 'Discord', value: `${mentionedUser}`, inline: true });
    }

    await message.reply({ embeds: [embed] });
  }
};