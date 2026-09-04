const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  name: 'sistemres',
  aliases: ['sistemsıfırla', 'dbreset', 'reset'],
  description: 'Tüm veritabanını temizler (Admin)',
  usage: 'sistemres onay',

  async execute(message, args, db, client) {
    // Sadece Admin
    if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return message.reply('❌ Bu komutu sadece **Administrator** kullanabilir.');
    }

    // Yanlışlıkla çalışmasın diye onay iste
    if (!args[0] || args[0].toLowerCase() !== 'onay') {
      return message.reply(
        `⚠️ **DİKKAT!** Bu komut tüm verileri siler:\n` +
        `• Takımlar\n• Oyuncular\n• Kullanıcı kayıtları\n• Transferler\n• Sözleşmeler\n• Maçlar\n• Kadrolar\n• Fikstür\n• Puan tablosu\n\n` +
        `Devam etmek için: \`${client.config.prefix}sistemres onay\``
      );
    }

    try {
      // Sıralı silme (foreign key hataları olmasın)
      db.exec(`
        DELETE FROM contracts;
        DELETE FROM transfers;
        DELETE FROM matches;
        DELETE FROM lineups;
        DELETE FROM fixtures;
        DELETE FROM standings;
        DELETE FROM players;
        DELETE FROM users;
        DELETE FROM teams;
      `);

      // Auto-increment sayaçlarını da sıfırla (SQLite)
      try {
        db.exec(`
          DELETE FROM sqlite_sequence WHERE name IN 
          ('teams', 'players', 'transfers', 'matches', 'contracts', 'fixtures');
        `);
      } catch (_) {}

      const embed = new EmbedBuilder()
        .setColor(0xFF0000)
        .setTitle('🔄 Sistem Sıfırlandı')
        .setDescription(
          'Tüm veriler başarıyla silindi.\n' +
          'Oyun sıfırdan başlayabilir.'
        )
        .addFields(
          { name: 'Silen', value: `${message.author}`, inline: true },
          { name: 'Tarih', value: new Date().toLocaleString('tr-TR'), inline: true }
        )
        .setFooter({ text: 'Takımlar, oyuncular, fikstür ve puan tablosu temizlendi' })
        .setTimestamp();

      await message.reply({ embeds: [embed] });
    } catch (error) {
      console.error('Sistem reset hatası:', error);
      await message.reply('❌ Sıfırlama sırasında bir hata oluştu. Konsolu kontrol et.');
    }
  }
};