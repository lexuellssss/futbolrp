const { createCanvas } = require('@napi-rs/canvas');

/**
 * Fikstür kartı
 */
function drawFixtureCard(week, fixtures) {
  const width = 700;
  const rowH = 52;
  const headerH = 70;
  const padding = 24;
  const height = headerH + padding + fixtures.length * rowH + padding;

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // Arka plan
  roundRect(ctx, 0, 0, width, height, 24, '#0f0f13');
  // Kenar glow
  ctx.strokeStyle = '#2a2a35';
  ctx.lineWidth = 2;
  roundRectStroke(ctx, 1, 1, width - 2, height - 2, 23);

  // Başlık
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 28px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`HAFTA ${week}`, width / 2, 45);

  // Alt çizgi
  ctx.strokeStyle = '#3b82f6';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(width / 2 - 40, 55);
  ctx.lineTo(width / 2 + 40, 55);
  ctx.stroke();

  // Maçlar
  fixtures.forEach((f, i) => {
    const y = headerH + padding / 2 + i * rowH;

    // Satır arka plan
    ctx.fillStyle = i % 2 === 0 ? '#16161d' : '#1a1a22';
    roundRect(ctx, 16, y, width - 32, rowH - 8, 12, ctx.fillStyle);

    const home = f.home_name || '?';
    const away = f.away_name || '?';
    const played = f.status === 'oynandi';

    ctx.textAlign = 'right';
    ctx.font = 'bold 18px sans-serif';
    ctx.fillStyle = '#e5e7eb';
    ctx.fillText(home, width / 2 - 70, y + 30);

    ctx.textAlign = 'left';
    ctx.fillText(away, width / 2 + 70, y + 30);

    // Skor veya VS
    ctx.textAlign = 'center';
    if (played) {
      ctx.fillStyle = '#22c55e';
      ctx.font = 'bold 20px sans-serif';
      ctx.fillText(`${f.home_score} - ${f.away_score}`, width / 2, y + 30);
    } else {
      ctx.fillStyle = '#6b7280';
      ctx.font = 'bold 16px sans-serif';
      ctx.fillText('VS', width / 2, y + 30);
    }
  });

  return canvas.toBuffer('image/png');
}

/**
 * Puan tablosu kartı
 */
function drawStandingsCard(standings) {
  const width = 780;
  const rowH = 44;
  const headerH = 70;
  const colHeaderH = 36;
  const padding = 20;
  const height = headerH + colHeaderH + standings.length * rowH + padding;

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  roundRect(ctx, 0, 0, width, height, 24, '#0f0f13');
  ctx.strokeStyle = '#2a2a35';
  ctx.lineWidth = 2;
  roundRectStroke(ctx, 1, 1, width - 2, height - 2, 23);

  // Başlık
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 26px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('PUAN TABLOSU', width / 2, 42);

  ctx.strokeStyle = '#a855f7';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(width / 2 - 50, 52);
  ctx.lineTo(width / 2 + 50, 52);
  ctx.stroke();

  // Kolon başlıkları
  const cols = [
    { x: 40, label: '#', align: 'center' },
    { x: 70, label: 'TAKIM', align: 'left' },
    { x: 380, label: 'O', align: 'center' },
    { x: 430, label: 'G', align: 'center' },
    { x: 480, label: 'B', align: 'center' },
    { x: 530, label: 'M', align: 'center' },
    { x: 590, label: 'Av', align: 'center' },
    { x: 660, label: 'P', align: 'center' }
  ];

  const colY = headerH + 8;
  ctx.font = 'bold 14px sans-serif';
  ctx.fillStyle = '#9ca3af';
  for (const c of cols) {
    ctx.textAlign = c.align;
    ctx.fillText(c.label, c.x, colY + 18);
  }

  // Satırlar
  standings.forEach((s, i) => {
    const y = headerH + colHeaderH + i * rowH;

    // İlk 3 vurgu
    if (i === 0) ctx.fillStyle = '#14532d';
    else if (i === 1) ctx.fillStyle = '#1e3a5f';
    else if (i === 2) ctx.fillStyle = '#3b2f1a';
    else ctx.fillStyle = i % 2 === 0 ? '#16161d' : '#1a1a22';

    roundRect(ctx, 12, y, width - 24, rowH - 6, 10, ctx.fillStyle);

    const gd = s.gd >= 0 ? `+${s.gd}` : `${s.gd}`;
    const values = [
      { x: 40, text: `${i + 1}`, align: 'center', color: '#fff' },
      { x: 70, text: s.team_name, align: 'left', color: '#f3f4f6' },
      { x: 380, text: `${s.played}`, align: 'center', color: '#d1d5db' },
      { x: 430, text: `${s.won}`, align: 'center', color: '#86efac' },
      { x: 480, text: `${s.drawn}`, align: 'center', color: '#fde68a' },
      { x: 530, text: `${s.lost}`, align: 'center', color: '#fca5a5' },
      { x: 590, text: gd, align: 'center', color: '#c4b5fd' },
      { x: 660, text: `${s.points}`, align: 'center', color: '#fff' }
    ];

    ctx.font = i < 3 ? 'bold 16px sans-serif' : '16px sans-serif';
    for (const v of values) {
      ctx.textAlign = v.align;
      ctx.fillStyle = v.color;
      ctx.fillText(v.text, v.x, y + 28);
    }
  });

  return canvas.toBuffer('image/png');
}

// Yardımcılar
function roundRect(ctx, x, y, w, h, r, fill) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
}

function roundRectStroke(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
  ctx.stroke();
}

module.exports = { drawFixtureCard, drawStandingsCard };