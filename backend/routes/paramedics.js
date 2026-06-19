const router            = require('express').Router();
const bcrypt            = require('bcryptjs');
const { pool }          = require('../config/db');
const { requireLogin, requireAdmin } = require('../middleware/auth');
const { notify }        = require('../utils/notify');

// GET /api/paramedics — list all
router.get('/', requireLogin, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT user_id, username, title, first_name, last_name, cadre, grade_level, email, is_admin, status
       FROM users ORDER BY last_name, first_name`
    );
    res.json(rows.map(u => ({ ...u, is_admin: u.is_admin === 1 })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/paramedics/available — only Available paramedics (for dispatch dropdowns)
router.get('/available', requireLogin, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT user_id, username, title, first_name, last_name
       FROM users WHERE status = 'Available' ORDER BY last_name, first_name`
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/paramedics — add (admin only)
router.post('/', requireAdmin, async (req, res) => {
  const { username, email, password, title, first_name, last_name, cadre, grade_level, is_admin } = req.body;
  if (!username || !email || !password || !first_name || !last_name) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  try {
    const hash = await bcrypt.hash(password, 12);
    const [result] = await pool.query(
      `INSERT INTO users (username, email, password_hash, title, first_name, last_name, cadre, grade_level, is_admin)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [username, email, hash, title || null, first_name, last_name, cadre || null, grade_level || null, is_admin ? 1 : 0]
    );
    res.status(201).json({ user_id: result.insertId, username });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Username or email already exists' });
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/paramedics/:id — get one
router.get('/:id', requireLogin, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT user_id, username, title, first_name, last_name, cadre, grade_level, email, is_admin, status, unavailable_reason
       FROM users WHERE user_id = ?`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    const u = rows[0];
    res.json({ ...u, is_admin: u.is_admin === 1 });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/paramedics/:id — edit (admin only for admin flag; self can edit own status)
router.put('/:id', requireLogin, async (req, res) => {
  const targetId = parseInt(req.params.id);
  const isSelf   = req.session.userId === targetId;
  const isAdmin  = req.session.isAdmin;

  if (!isAdmin && !isSelf) return res.status(403).json({ error: 'Forbidden' });

  const { title, first_name, last_name, cadre, grade_level, email, status, unavailable_reason, is_admin: makeAdmin } = req.body;

  try {
    const updates = [];
    const values  = [];

    if (title       !== undefined) { updates.push('title = ?');       values.push(title); }
    if (first_name  !== undefined) { updates.push('first_name = ?');  values.push(first_name); }
    if (last_name   !== undefined) { updates.push('last_name = ?');   values.push(last_name); }
    if (cadre       !== undefined) { updates.push('cadre = ?');       values.push(cadre); }
    if (grade_level !== undefined) { updates.push('grade_level = ?'); values.push(grade_level); }
    if (email       !== undefined) { updates.push('email = ?');       values.push(email); }
    if (status      !== undefined) { updates.push('status = ?');      values.push(status); }
    if (status === 'Unavailable') {
      updates.push('unavailable_reason = ?');
      values.push(unavailable_reason || null);
    } else if (status && status !== 'Unavailable') {
      updates.push('unavailable_reason = NULL');
    }
    if (isAdmin && makeAdmin !== undefined) {
      updates.push('is_admin = ?');
      values.push(makeAdmin ? 1 : 0);
    }

    if (!updates.length) return res.status(400).json({ error: 'Nothing to update' });

    const adminGranted = isAdmin && makeAdmin === true;

    values.push(targetId);
    await pool.query(`UPDATE users SET ${updates.join(', ')} WHERE user_id = ?`, values);

    if (isAdmin && !isSelf) {
      if (adminGranted) {
        notify(targetId, 'admin_granted', 'Admin Access Granted',
          'You have been granted admin access by an administrator.').catch(() => {});
      } else {
        notify(targetId, 'info_change', 'Your Profile Was Updated',
          'An administrator has updated your profile information.').catch(() => {});
      }
    }

    res.json({ ok: true });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Email already in use' });
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/paramedics/:id — admin only
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    await pool.query('DELETE FROM users WHERE user_id = ?', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/paramedics/:id/password — change password (admin only)
router.post('/:id/password', requireAdmin, async (req, res) => {
  const { password } = req.body;
  if (!password) return res.status(400).json({ error: 'Password required' });
  try {
    const hash = await bcrypt.hash(password, 12);
    await pool.query('UPDATE users SET password_hash = ? WHERE user_id = ?', [hash, req.params.id]);
    notify(parseInt(req.params.id), 'password_change', 'Your Password Was Changed',
      `An administrator has changed your password. Your new password is: ${password}`).catch(() => {});
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/paramedics/me/password — change own password
router.post('/me/password', requireLogin, async (req, res) => {
  const { current_password, new_password } = req.body;
  if (!current_password || !new_password) return res.status(400).json({ error: 'Missing fields' });
  try {
    const [rows] = await pool.query('SELECT password_hash FROM users WHERE user_id = ?', [req.session.userId]);
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    const match = await bcrypt.compare(current_password, rows[0].password_hash);
    if (!match) return res.status(401).json({ error: 'Current password incorrect' });
    const hash = await bcrypt.hash(new_password, 12);
    await pool.query('UPDATE users SET password_hash = ? WHERE user_id = ?', [hash, req.session.userId]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
