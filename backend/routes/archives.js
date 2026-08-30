const router    = require('express').Router();
const path      = require('path');
const { pool }  = require('../config/db');
const { requireAdmin } = require('../middleware/auth');
const { makeUploader, UPLOADS_ROOT } = require('../utils/upload');

const archiveUpload = makeUploader(() => path.join(UPLOADS_ROOT, 'archives'));

// GET /api/archives
router.get('/', requireAdmin, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT a.archive_id, a.title, a.original_filename, a.created_at, u.username AS uploaded_by_username
       FROM archives a LEFT JOIN users u ON u.user_id = a.uploaded_by
       ORDER BY a.archive_id DESC`
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/archives
router.post('/', requireAdmin, (req, res, next) => {
  archiveUpload.array('photos', 10)(req, res, err => {
    if (err) return res.status(400).json({ error: err.message });
    next();
  });
}, async (req, res) => {
  try {
    const files = req.files || [];
    if (!files.length) return res.status(400).json({ error: 'No files uploaded' });

    const title = req.body.title || null;
    const values = files.map(f => [
      title, `archives/${f.filename}`, f.originalname, req.session.userId || null,
    ]);
    await pool.query(
      `INSERT INTO archives (title, file_path, original_filename, uploaded_by) VALUES ${values.map(() => '(?,?,?,?)').join(',')}`,
      values.flat()
    );
    res.status(201).json({ ok: true, count: files.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/archives/:id/file
router.get('/:id/file', requireAdmin, async (req, res) => {
  try {
    const [[row]] = await pool.query('SELECT file_path FROM archives WHERE archive_id = ?', [req.params.id]);
    if (!row) return res.status(404).json({ error: 'Not found' });
    res.sendFile(path.join(UPLOADS_ROOT, row.file_path));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
