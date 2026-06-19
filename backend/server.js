const path    = require('path');
const express = require('express');
const session = require('express-session');
const mysql2  = require('mysql2');
const MySQLStore = require('express-mysql-session')(session);
require('dotenv').config({ path: path.join(__dirname, '.env') });

const dbOptions = {
  host:     process.env.DB_HOST     || 'localhost',
  port:     parseInt(process.env.DB_PORT) || 3306,
  user:     process.env.DB_USER     || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME     || 'lasambus_db',
};

// Callback-style pool for the session store
const sessionPool = mysql2.createPool(dbOptions);

const sessionStore = new MySQLStore(
  {
    createDatabaseTable: true,
    expiration:          365 * 24 * 60 * 60 * 1000, // 1 year
    checkExpirationInterval: 24 * 60 * 60 * 1000,   // check daily
    schema: { tableName: 'sessions' },
  },
  sessionPool
);

const isProd = process.env.NODE_ENV === 'production';

const app = express();
app.set('trust proxy', 1); // required when running behind Railway / Netlify reverse proxies
app.use(express.json());

app.use(session({
  secret:            process.env.SESSION_SECRET || 'lasambus-dev-secret-change-in-prod',
  resave:            false,
  saveUninitialized: false,
  store:             sessionStore,
  cookie: {
    httpOnly: true,
    sameSite: isProd ? 'none' : 'lax',
    secure:   isProd,
    maxAge:   365 * 24 * 60 * 60 * 1000, // 1 year — persist until logout
  },
}));

// ── API routes ────────────────────────────────────────
app.use('/api/auth',          require('./routes/auth'));
app.use('/api/cases',         require('./routes/cases'));
app.use('/api/paramedics',    require('./routes/paramedics'));
app.use('/api/ambulances',    require('./routes/ambulances'));
app.use('/api/dashboard',     require('./routes/dashboard'));
app.use('/api/report',        require('./routes/report'));
app.use('/api/export',        require('./routes/export'));
app.use('/api/notifications', require('./routes/notifications'));

// ── Static frontend ───────────────────────────────────
app.use(express.static(path.join(__dirname, '../frontend')));

// Fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/pages/login.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\nLASAMBUS running at  http://localhost:${PORT}`);
  console.log(`Dashboard:           http://localhost:${PORT}/pages/dashboard.html\n`);
});
