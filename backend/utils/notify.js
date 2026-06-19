const { pool } = require('../config/db');

async function notify(user_id, type, title, message, case_id = null) {
  try {
    await pool.query(
      `INSERT INTO notifications (user_id, type, title, message, case_id) VALUES (?, ?, ?, ?, ?)`,
      [user_id, type, title, message, case_id || null]
    );
  } catch (err) {
    console.error('Notification error:', err.message);
  }
}

async function notifyMany(userIds, type, title, message, case_id = null) {
  if (!userIds || !userIds.length) return;
  try {
    const placeholders = userIds.map(() => '(?,?,?,?,?)').join(',');
    const values = userIds.flatMap(id => [id, type, title, message, case_id || null]);
    await pool.query(
      `INSERT INTO notifications (user_id, type, title, message, case_id) VALUES ${placeholders}`,
      values
    );
  } catch (err) {
    console.error('Bulk notification error:', err.message);
  }
}

module.exports = { notify, notifyMany };
