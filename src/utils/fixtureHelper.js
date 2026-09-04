/**
 * Fikstür üretme + puan tablosu güncelleme
 */

function generateFixtures(db) {
    const teams = db.prepare('SELECT id, name FROM teams ORDER BY id').all();
    if (teams.length < 2) {
      return { ok: false, message: 'En az 2 takım gerekli.' };
    }
  
    // Eski fikstürü temizle
    db.prepare('DELETE FROM fixtures').run();
  
    // Standings sıfırla / oluştur
    db.prepare('DELETE FROM standings').run();
    for (const t of teams) {
      db.prepare(`
        INSERT INTO standings (team_id, played, won, drawn, lost, gf, ga, points)
        VALUES (?, 0, 0, 0, 0, 0, 0, 0)
      `).run(t.id);
    }
  
    // Tek devre: herkes herkesle bir kez
    const pairs = [];
    for (let i = 0; i < teams.length; i++) {
      for (let j = i + 1; j < teams.length; j++) {
        pairs.push([teams[i], teams[j]]);
      }
    }
  
    // Haftalara dağıt (basit round-robin)
    const n = teams.length;
    const weeksNeeded = n % 2 === 0 ? n - 1 : n;
    let week = 1;
    let matchCount = 0;
  
    const insert = db.prepare(`
      INSERT INTO fixtures (week, home_team_id, away_team_id, status)
      VALUES (?, ?, ?, 'planlandi')
    `);
  
    // Karışık sırala
    for (let i = pairs.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pairs[i], pairs[j]] = [pairs[j], pairs[i]];
    }
  
    for (const [home, away] of pairs) {
      insert.run(week, home.id, away.id);
      matchCount++;
      // Her haftaya yaklaşık takım sayısı / 2 maç
      if (matchCount % Math.max(1, Math.floor(n / 2)) === 0) {
        week++;
      }
    }
  
    const totalWeeks = db.prepare('SELECT MAX(week) as m FROM fixtures').get().m || 1;
  
    return {
      ok: true,
      teams: teams.length,
      matches: pairs.length,
      weeks: totalWeeks
    };
  }
  
  function updateStandings(db, homeTeamId, awayTeamId, homeScore, awayScore) {
    // Satır yoksa oluştur
    for (const tid of [homeTeamId, awayTeamId]) {
      const exists = db.prepare('SELECT team_id FROM standings WHERE team_id = ?').get(tid);
      if (!exists) {
        db.prepare(`
          INSERT INTO standings (team_id, played, won, drawn, lost, gf, ga, points)
          VALUES (?, 0, 0, 0, 0, 0, 0, 0)
        `).run(tid);
      }
    }
  
    const home = db.prepare('SELECT * FROM standings WHERE team_id = ?').get(homeTeamId);
    const away = db.prepare('SELECT * FROM standings WHERE team_id = ?').get(awayTeamId);
  
    let hW = 0, hD = 0, hL = 0, hP = 0;
    let aW = 0, aD = 0, aL = 0, aP = 0;
  
    if (homeScore > awayScore) {
      hW = 1; hP = 3;
      aL = 1;
    } else if (homeScore < awayScore) {
      aW = 1; aP = 3;
      hL = 1;
    } else {
      hD = 1; aD = 1;
      hP = 1; aP = 1;
    }
  
    db.prepare(`
      UPDATE standings SET
        played = played + 1,
        won = won + ?,
        drawn = drawn + ?,
        lost = lost + ?,
        gf = gf + ?,
        ga = ga + ?,
        points = points + ?
      WHERE team_id = ?
    `).run(hW, hD, hL, homeScore, awayScore, hP, homeTeamId);
  
    db.prepare(`
      UPDATE standings SET
        played = played + 1,
        won = won + ?,
        drawn = drawn + ?,
        lost = lost + ?,
        gf = gf + ?,
        ga = ga + ?,
        points = points + ?
      WHERE team_id = ?
    `).run(aW, aD, aL, awayScore, homeScore, aP, awayTeamId);
  }
  
  function getStandings(db) {
    return db.prepare(`
      SELECT s.*, t.name as team_name,
        (s.gf - s.ga) as gd
      FROM standings s
      JOIN teams t ON t.id = s.team_id
      ORDER BY s.points DESC, gd DESC, s.gf DESC
    `).all();
  }
  
  function getFixturesByWeek(db, week) {
    return db.prepare(`
      SELECT f.*,
        ht.name as home_name,
        at.name as away_name
      FROM fixtures f
      JOIN teams ht ON ht.id = f.home_team_id
      JOIN teams at ON at.id = f.away_team_id
      WHERE f.week = ?
      ORDER BY f.id
    `).all(week);
  }
  
  function getCurrentWeek(db) {
    const row = db.prepare(`
      SELECT MIN(week) as w FROM fixtures WHERE status = 'planlandi'
    `).get();
    if (row && row.w) return row.w;
    const max = db.prepare('SELECT MAX(week) as w FROM fixtures').get();
    return max?.w || 1;
  }
  
  function markFixturePlayed(db, homeTeamId, awayTeamId, homeScore, awayScore) {
    const fixture = db.prepare(`
      SELECT * FROM fixtures
      WHERE home_team_id = ? AND away_team_id = ? AND status = 'planlandi'
      LIMIT 1
    `).get(homeTeamId, awayTeamId);
  
    // Ters eşleşme de dene
    const fixture2 = fixture || db.prepare(`
      SELECT * FROM fixtures
      WHERE home_team_id = ? AND away_team_id = ? AND status = 'planlandi'
      LIMIT 1
    `).get(awayTeamId, homeTeamId);
  
    if (fixture2) {
      const isReversed = fixture2.home_team_id === awayTeamId;
      db.prepare(`
        UPDATE fixtures SET
          status = 'oynandi',
          home_score = ?,
          away_score = ?,
          played_at = ?
        WHERE id = ?
      `).run(
        isReversed ? awayScore : homeScore,
        isReversed ? homeScore : awayScore,
        new Date().toISOString(),
        fixture2.id
      );
    }
  }
  
  module.exports = {
    generateFixtures,
    updateStandings,
    getStandings,
    getFixturesByWeek,
    getCurrentWeek,
    markFixturePlayed
  };