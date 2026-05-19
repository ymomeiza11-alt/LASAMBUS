const router  = require('express').Router();
const bcrypt  = require('bcryptjs');
const { pool } = require('../config/db');

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { identifier, password } = req.body || {};
  if (!identifier || !password) return res.status(400).json({ error: 'Missing fields' });

  try {
    const [rows] = await pool.query(
      'SELECT * FROM users WHERE username = ? OR email = ? LIMIT 1',
      [identifier, identifier]
    );
    if (!rows.length) return res.status(401).json({ error: 'Invalid credentials' });

    const user  = rows[0];
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) return res.status(401).json({ error: 'Invalid credentials' });

    req.session.userId  = user.user_id;
    req.session.isAdmin = user.is_admin === 1;

    res.json({
      user_id:    user.user_id,
      username:   user.username,
      first_name: user.first_name,
      last_name:  user.last_name,
      is_admin:   user.is_admin === 1,
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/auth/change-password (admin only)
router.post('/change-password', async (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: 'Not authenticated' });

  const { current_password, new_password } = req.body || {};
  if (!current_password || !new_password)
    return res.status(400).json({ error: 'Missing fields' });
  if (new_password.length < 8)
    return res.status(400).json({ error: 'New password must be at least 8 characters' });

  try {
    const [rows] = await pool.query(
      'SELECT password_hash, is_admin FROM users WHERE user_id = ?',
      [req.session.userId]
    );
    if (!rows.length) return res.status(401).json({ error: 'Not authenticated' });
    if (!rows[0].is_admin) return res.status(403).json({ error: 'Admin only' });

    const match = await bcrypt.compare(current_password, rows[0].password_hash);
    if (!match) return res.status(401).json({ error: 'Current password is incorrect' });

    const hash = await bcrypt.hash(new_password, 12);
    await pool.query('UPDATE users SET password_hash = ? WHERE user_id = ?', [hash, req.session.userId]);
    res.json({ ok: true });
  } catch (err) {
    console.error('Change password error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

// GET /api/auth/me
router.get('/me', async (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: 'Not authenticated' });
  try {
    const [rows] = await pool.query(
      'SELECT user_id, username, first_name, last_name, title, cadre, grade_level, email, is_admin, status FROM users WHERE user_id = ?',
      [req.session.userId]
    );
    if (!rows.length) return res.status(401).json({ error: 'Not authenticated' });
    const u = rows[0];
    res.json({ ...u, is_admin: u.is_admin === 1 });
  } catch (err) {
    console.error('Me error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
