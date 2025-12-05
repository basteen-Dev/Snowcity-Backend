const { pool } = require('../config/db');

async function listForAttraction(attractionId) {
  if (!attractionId) return [];
  const { rows } = await pool.query(
    `SELECT hh_id, attraction_id, start_time, end_time, discount_percent
     FROM happy_hours
     WHERE attraction_id = $1
     ORDER BY start_time ASC`,
    [Number(attractionId)]
  );
  return rows || [];
}

module.exports = {
  listForAttraction,
};
