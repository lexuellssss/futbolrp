const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'yardim',
  aliases: ['help', 'komutlar', 'yardım'],
  description: 'Bot komutlarını gösterir',
  usage: 'yardim',

  async execute(message, args, db, client) {
    const p = client.config.prefix;

    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle('⚽ Futbol RP Bot - Yardım')
      .setDescription(`Prefix: \`${p}\``)
      .addFields(
        {
          name: '📝 Kayıt Sistemi (Kayıt Yetkilisi)',
          value:
            `\`${p}kayit <takım> <baskan|td> @üye\` → Takım kur + rol ver\n` +
            `\`${p}kayit @üye\` → Serbest oyuncu kaydet\n` +
            `\`${p}kayitsil @üye\` → Kişinin kaydını sil\n` +
            `\`${p}takimsil <takım>\` → Takımı sil\n` +
            `\`${p}takimlar\` → Tüm takımları listele`
        },
        {
          name: '⚽ Oyuncu İşlemleri (Admin)',
          value:
            `\`${p}oyuncu-ekle @üye <takım> <pozisyon> <overall> <değer> <yaş>\`\n` +
            `\`${p}oyuncu-sil @üye <sebep>\`\n` +
            `\`${p}oyuncular [takım]\` → Kadro listesi`
        },
        {
          name: '🏋️ Antrenman (Oyuncular)',
          value:
            `\`${p}antrenman <nitelik>\` → Kendi niteliğini geliştir\n` +
            `Nitelikler: \`sut\` \`pas\` \`defans\` \`hiz\` \`fizik\` \`top_kontrolu\``
        },
        {
          name: '📋 Kadro & Taktik (TD / Başkan)',
          value:
            `\`${p}kadro kaleci @oyuncu defans @... orta @... forvet @...\`\n` +
            `\`${p}taktik <formasyon> <stil>\`\n` +
            `Formasyon: \`4-3-3\` \`4-2-3-1\` \`4-4-2\` \`5-3-2\` \`3-5-2\`\n` +
            `Stil: \`hücum\` \`dengeli\` \`defans\``
        },
        {
          name: '💼 Transfer & Sözleşme (TD / Başkan)',
          value:
            `\`${p}transfer-teklif @oyuncu <bonservis> <sezon> <maaş>\`\n` +
            `\`${p}transfer-kabul <id>\` → Kabul et\n` +
            `\`${p}transfer-red <id>\` → Reddet\n` +
            `\`${p}sozlesmeler [@oyuncu|takım]\` → Sözleşmeleri gör`
        },
        {
          name: '📅 Lig & Fikstür',
          value:
            `\`${p}fikstur-olustur\` → Fikstür oluştur (Admin)\n` +
            `\`${p}fikstur [hafta]\` → Haftalık fikstür kartı\n` +
            `\`${p}puantablosu\` → Puan tablosu kartı\n` +
            `\`${p}mac-oynat <ev> <dep>\` → Canlı maç (Admin)`
        },
        {
          name: '🛠️ Sistem (Admin)',
          value: `\`${p}sistemres onay\` → Tüm veriyi sıfırla`
        }
      )
      .setFooter({ text: 'Daha fazla antrenman = Daha yüksek form = Daha yüksek kazanma şansı' })
      .setTimestamp();

    await message.reply({ embeds: [embed] });
  }
};