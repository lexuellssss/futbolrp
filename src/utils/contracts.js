/**
 * Sözleşme yardımcı fonksiyonları
 */

function createContract(db, { playerId, teamId, seasons, wage, transferId = null }) {
    const start = new Date();
    const end = new Date(start);
    end.setFullYear(end.getFullYear() + seasons); // 1 sezon ≈ 1 yıl
  
    const result = db.prepare(`
      INSERT INTO contracts (player_id, team_id, seasons, wage, start_date, end_date, status, transfer_id)
      VALUES (?, ?, ?, ?, ?, ?, 'aktif', ?)
    `).run(
      playerId,
      teamId,
      seasons,
      wage,
      start.toISOString(),
      end.toISOString(),
      transferId
    );
  
    return result.lastInsertRowid;
  }
  
  function getActiveContract(db, playerId) {
    return db.prepare(`
      SELECT c.*, t.name as team_name, p.name as player_name
      FROM contracts c
      JOIN teams t ON t.id = c.team_id
      JOIN players p ON p.id = c.player_id
      WHERE c.player_id = ? AND c.status = 'aktif'
      ORDER BY c.id DESC LIMIT 1
    `).get(playerId);
  }
  
  function getTeamContracts(db, teamId) {
    return db.prepare(`
      SELECT c.*, p.name as player_name, p.position, p.overall
      FROM contracts c
      JOIN players p ON p.id = c.player_id
      WHERE c.team_id = ? AND c.status = 'aktif'
      ORDER BY c.wage DESC
    `).all(teamId);
  }
  
  function expireContract(db, contractId) {
    db.prepare(`UPDATE contracts SET status = 'bitti' WHERE id = ?`).run(contractId);
  }
  
  function expireOldContracts(db) {
    const now = new Date().toISOString();
    const expired = db.prepare(`
      SELECT * FROM contracts WHERE status = 'aktif' AND end_date < ?
    `).all(now);
  
    for (const c of expired) {
      db.prepare(`UPDATE contracts SET status = 'bitti' WHERE id = ?`).run(c.id);
      // Oyuncuyu serbest bırak
      db.prepare(`UPDATE players SET team_id = NULL WHERE id = ?`).run(c.player_id);
    }
  
    return expired.length;
  }
  
  module.exports = {
    createContract,
    getActiveContract,
    getTeamContracts,
    expireContract,
    expireOldContracts
  };