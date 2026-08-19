function requireLogin(req, res, next) {
  if (!req.session.userId) return res.status(401).json({ error: 'Not authenticated' });
  next();
}

function requireAdmin(req, res, next) {
  if (!req.session.userId) return res.status(401).json({ error: 'Not authenticated' });
  if (!req.session.isAdmin) return res.status(403).json({ error: 'Admin access required' });
  next();
}

// Usage: requireRole('Admin', 'Dispatcher')
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.session.userId) return res.status(401).json({ error: 'Not authenticated' });
    if (!roles.includes(req.session.role)) return res.status(403).json({ error: 'Access denied' });
    next();
  };
}

module.exports = { requireLogin, requireAdmin, requireRole };
