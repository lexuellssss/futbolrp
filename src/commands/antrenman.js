const { EmbedBuilder } = require('discord.js');
const { updateTeamForm } = require('../database/db');

module.exports = {
  name: 'antrenman',
  aliases: ['antreman', 'train'],
  description: 'Kendi oyuncunu antrenman yaptırır',
  usage: 'antrenman <nitelik>',

  async execute(message, args, db, client) {
    const config = client.config;

    if (args.length < 1) {
      return message.reply(
        `❌ Kullanım: \`${config.prefix}antrenman <nitelik>\`\n` +
        `Nitelikler: **sut, pas, defans, hiz, fizik, top_kontrolu**`
      );
    }

    const nitelik = args[0].toLowerCase();
    const gecerliNitelikler = ['sut', 'pas', 'defans', 'hiz', 'fizik', 'top_kontrolu'];

    if (!gecerliNitelikler.includes(nitelik)) {
      return message.reply(`❌ Geçersiz nitelik.\nKullanılabilir: ${gecerliNitelikler.join(', ')}`);
    }

    // Kullanıcının ismine göre oyuncuyu bul
    const isim = message.member.displayName || message.author.username;
    let player = db.prepare('SELECT * FROM players WHERE name = ?').get(isim);

    // Tam eşleşme yoksa benzer isim dene
    if (!player) {
      player = db.prepare('SELECT * FROM players WHERE name LIKE ?').get(`%${isim}%`);
    }

    if (!player) {
      return message.reply('❌ Sistemde kayıtlı bir oyuncun bulunamadı. Önce admin tarafından eklenmelisin.');
    }

    // Takımı var mı?
    if (!player.team_id) {
      return message.reply('❌ Henüz bir takıma ait değilsin.');
    }

    // Günlük limit kontrolü
    const today = new Date().toISOString().slice(0, 10);
    const maxTrain = config.maxTrainingPerDay || 2;

    if (player.last_training === today && player.training_today >= maxTrain) {
      return message.reply(`❌ Bugün zaten **${maxTrain}** antrenman yaptın. Yarın tekrar dene.`);
    }

    // Nitelik artır
    const minGain = config.trainingGainMin || 1;
    const maxGain = config.trainingGainMax || 3;
    const gain = Math.floor(Math.random() * (maxGain - minGain + 1)) + minGain;

    const current = player[nitelik];
    const newValue = Math.min(99, current + gain);
    const newOverall = Math.min(99, player.overall + (gain >= 3 ? 1 : 0));
    const trainingToday = (player.last_training === today) ? player.training_today + 1 : 1;

    db.prepare(`
      UPDATE players 
      SET ${nitelik} = ?, overall = ?, last_training = ?, training_today = ?
      WHERE id = ?
    `).run(newValue, newOverall, today, trainingToday, player.id);

    // Takım formunu artır
    db.prepare('UPDATE teams SET training_count = training_count + 1 WHERE id = ?').run(player.team_id);
    updateTeamForm(player.team_id);

    const team = db.prepare('SELECT name, form, training_count FROM teams WHERE id = ?').get(player.team_id);

    const nitelikIsimleri = {
      sut: 'Şut',
      pas: 'Pas',
      defans: 'Defans',
      hiz: 'Hız',
      fizik: 'Fizik',
      top_kontrolu: 'Top Kontrolü'
    };

    const embed = new EmbedBuilder()
      .setColor(0x00FF99)
      .setTitle('🏋️ Antrenman Tamamlandı!')
      .setDescription(`**${player.name}** antrenman yaptı.`)
      .addFields(
        { name: 'Gelişen Nitelik', value: `${nitelikIsimleri[nitelik]}: ${current} → **${newValue}** (+${gain})`, inline: false },
        { name: 'Yeni Overall', value: `${newOverall}`, inline: true },
        { name: 'Takım', value: team.name, inline: true },
        { name: 'Takım Formu', value: `${team.form}/100`, inline: true },
        { name: 'Toplam Antrenman', value: `${team.training_count}`, inline: true }
      )
      .setFooter({ text: 'Daha fazla antrenman = Daha yüksek form = Daha yüksek kazanma şansı' })
      .setTimestamp();

    await message.reply({ embeds: [embed] });
  }
};