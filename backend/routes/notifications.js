const router           = require('express').Router();
const { pool }         = require('../config/db');
const { requireLogin } = require('../middleware/auth');

// GET /api/notifications
router.get('/', requireLogin, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT notification_id, type, title, message, case_id, is_read, created_at
       FROM notifications WHERE user_id = ?
       ORDER BY created_at DESC LIMIT 100`,
      [req.session.userId]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/notifications/unread-count
router.get('/unread-count', requireLogin, async (req, res) => {
  try {
    const [[{ count }]] = await pool.query(
      `SELECT COUNT(*) AS count FROM notifications WHERE user_id = ? AND is_read = 0`,
      [req.session.userId]
    );
    res.json({ count: parseInt(count) || 0 });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/notifications/:id/read
router.post('/:id/read', requireLogin, async (req, res) => {
  try {
    await pool.query(
      `UPDATE notifications SET is_read = 1 WHERE notification_id = ? AND user_id = ?`,
      [req.params.id, req.session.userId]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/notifications/read-all
router.post('/read-all', requireLogin, async (req, res) => {
  try {
    await pool.query(
      `UPDATE notifications SET is_read = 1 WHERE user_id = ?`,
      [req.session.userId]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
