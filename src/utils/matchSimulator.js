function calculateTeamStrength(team, players, lineup) {
  if (!players || players.length === 0) {
    return { attack: 50, defense: 50, avgOverall: 50, formMultiplier: 1 };
  }

  let activePlayers = players;

  // Yeni pozisyon bazlı kadro formatını destekle
  if (lineup && lineup.starters) {
    try {
      const startersData = JSON.parse(lineup.starters);

      // Yeni format: { GK: [...], DF: [...], MF: [...], FW: [...] }
      if (startersData.GK || startersData.DF || startersData.MF || startersData.FW) {
        const allIds = [
          ...(startersData.GK || []),
          ...(startersData.DF || []),
          ...(startersData.MF || []),
          ...(startersData.FW || [])
        ];
        activePlayers = players.filter(p => allIds.includes(p.id));
      }
      // Eski format: [1, 2, 3, ...]
      else if (Array.isArray(startersData)) {
        activePlayers = players.filter(p => startersData.includes(p.id));
      }
    } catch (e) {}
  }

  if (activePlayers.length === 0) activePlayers = players;

  const avgOverall = activePlayers.reduce((sum, p) => sum + p.overall, 0) / activePlayers.length;
  const avgSut = activePlayers.reduce((sum, p) => sum + p.sut, 0) / activePlayers.length;
  const avgPas = activePlayers.reduce((sum, p) => sum + p.pas, 0) / activePlayers.length;
  const avgDef = activePlayers.reduce((sum, p) => sum + p.defans, 0) / activePlayers.length;
  const avgHiz = activePlayers.reduce((sum, p) => sum + p.hiz, 0) / activePlayers.length;
  const avgFizik = activePlayers.reduce((sum, p) => sum + p.fizik, 0) / activePlayers.length;

  const formMultiplier = 0.8 + (team.form / 100) * 0.4;

  let tacticsBonus = 1.0;
  if (team.tactics === '4-3-3') tacticsBonus = 1.05;
  if (team.tactics === '5-3-2') tacticsBonus = 0.95;
  if (team.tactics === '4-2-3-1') tacticsBonus = 1.02;
  if (team.tactics === '4-4-2') tacticsBonus = 1.0;
  if (team.tactics === '3-5-2') tacticsBonus = 1.03;

  if (team.style === 'hücum') tacticsBonus *= 1.08;
  if (team.style === 'defans') tacticsBonus *= 0.92;

  const attack = (avgSut * 0.4 + avgPas * 0.3 + avgHiz * 0.2 + avgOverall * 0.1) * formMultiplier * tacticsBonus;
  const defense = (avgDef * 0.5 + avgFizik * 0.3 + avgOverall * 0.2) * formMultiplier;

  return { attack, defense, avgOverall, formMultiplier };
}

function simulateMatch(homeTeam, awayTeam, homePlayers, awayPlayers, homeLineup, awayLineup) {
  const home = calculateTeamStrength(homeTeam, homePlayers, homeLineup);
  const away = calculateTeamStrength(awayTeam, awayPlayers, awayLineup);

  const homeXG = Math.max(0.3, (home.attack / away.defense) * 1.4);
  const awayXG = Math.max(0.3, (away.attack / home.defense) * 1.2);

  function randomGoals(xg) {
    const r = Math.random();
    if (r < 0.25) return Math.max(0, Math.floor(xg - 1 + Math.random()));
    if (r < 0.55) return Math.floor(xg + Math.random() * 1.5);
    if (r < 0.85) return Math.floor(xg + 1 + Math.random());
    return Math.floor(xg + 2 + Math.random() * 2);
  }

  let homeScore = Math.min(7, Math.max(0, randomGoals(homeXG)));
  let awayScore = Math.min(7, Math.max(0, randomGoals(awayXG)));

  const events = [];
  const homeScorers = [];
  const awayScorers = [];

  // Gol atanları mümkünse forvet / orta sahadan seç
  function pickScorer(players, lineup) {
    if (!players.length) return 'Bilinmeyen';

    let preferred = players;
    if (lineup && lineup.starters) {
      try {
        const data = JSON.parse(lineup.starters);
        if (data.FW || data.MF) {
          const attackIds = [...(data.FW || []), ...(data.MF || [])];
          const attackers = players.filter(p => attackIds.includes(p.id));
          if (attackers.length > 0) preferred = attackers;
        }
      } catch (e) {}
    }

    const scorer = preferred[Math.floor(Math.random() * preferred.length)];
    return scorer ? scorer.name : 'Bilinmeyen';
  }

  for (let i = 0; i < homeScore; i++) {
    const minute = Math.floor(Math.random() * 90) + 1;
    const scorerName = pickScorer(homePlayers, homeLineup);
    homeScorers.push(scorerName);
    events.push({ minute, type: 'gol', team: 'home', player: scorerName });
  }

  for (let i = 0; i < awayScore; i++) {
    const minute = Math.floor(Math.random() * 90) + 1;
    const scorerName = pickScorer(awayPlayers, awayLineup);
    awayScorers.push(scorerName);
    events.push({ minute, type: 'gol', team: 'away', player: scorerName });
  }

  // Kartlar
  const yellowCount = Math.floor(Math.random() * 5);
  for (let i = 0; i < yellowCount; i++) {
    const minute = Math.floor(Math.random() * 90) + 1;
    const isHome = Math.random() > 0.5;
    const players = isHome ? homePlayers : awayPlayers;
    const player = players[Math.floor(Math.random() * players.length)];
    events.push({
      minute,
      type: 'sari_kart',
      team: isHome ? 'home' : 'away',
      player: player ? player.name : 'Bilinmeyen'
    });
  }

  if (Math.random() < 0.15) {
    const minute = Math.floor(Math.random() * 90) + 1;
    const isHome = Math.random() > 0.5;
    const players = isHome ? homePlayers : awayPlayers;
    const player = players[Math.floor(Math.random() * players.length)];
    events.push({
      minute,
      type: 'kirmizi_kart',
      team: isHome ? 'home' : 'away',
      player: player ? player.name : 'Bilinmeyen'
    });
  }

  events.sort((a, b) => a.minute - b.minute);

  const stats = {
    home: {
      xG: homeXG.toFixed(2),
      possession: Math.floor(45 + (home.attack - away.attack) * 0.3 + Math.random() * 15),
      shots: Math.floor(homeXG * 3 + Math.random() * 5),
      shotsOnTarget: homeScore + Math.floor(Math.random() * 3),
      corners: Math.floor(Math.random() * 8) + 2,
      fouls: Math.floor(Math.random() * 12) + 5
    },
    away: {
      xG: awayXG.toFixed(2),
      possession: 0,
      shots: Math.floor(awayXG * 3 + Math.random() * 5),
      shotsOnTarget: awayScore + Math.floor(Math.random() * 3),
      corners: Math.floor(Math.random() * 8) + 2,
      fouls: Math.floor(Math.random() * 12) + 5
    }
  };
  stats.away.possession = 100 - stats.home.possession;

  return {
    homeScore,
    awayScore,
    events,
    stats,
    homeScorers,
    awayScorers,
    homeStrength: home.avgOverall.toFixed(1),
    awayStrength: away.avgOverall.toFixed(1)
  };
}

module.exports = { simulateMatch, calculateTeamStrength };