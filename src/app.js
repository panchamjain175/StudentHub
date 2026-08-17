const express = require('express');
const path = require('path');
const session = require('express-session');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const studentRoutes = require('./routes/students');
const recordRoutes = require('./routes/records');
const vaultRoutes = require('./routes/vault');
const noteRoutes = require('./routes/notes');
const importRoutes = require('./routes/import');
const adminRoutes = require('./routes/admin');
const { isAuthenticated, optionalAuth } = require('./middleware/auth');
const { db } = require('./config/db');

const app = express();
const PORT = process.env.PORT || 3000;

// VULNERABILITY: CORS Misconfiguration (Allow all origins with wildcard)
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'TRACE', 'OPTIONS'],
  allowedHeaders: ['*']
}));

// Express Body Parsing
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.json({ limit: '10mb' }));

// Cookie Parser Middleware (Basic custom extraction)
app.use((req, res, next) => {
  req.cookies = {};
  const rc = req.headers.cookie;
  if (rc) {
    rc.split(';').forEach(cookie => {
      const parts = cookie.split('=');
      req.cookies[parts[0].trim()] = decodeURIComponent(parts[1] ? parts[1].trim() : '');
    });
  }
  next();
});

// Session Middleware
// VULNERABILITY: Hardcoded/Predictable session secret and unhardened session settings
app.use(session({
  secret: process.env.SESSION_SECRET || 'supersecret_studenthub_key_2026',
  resave: false,
  saveUninitialized: true,
  cookie: {
    secure: false, // Sent over unencrypted HTTP
    httpOnly: false, // Vulnerable to DOM XSS session theft
    maxAge: 24 * 60 * 60 * 1000
  }
}));

// VULNERABILITY: Unnecessary HTTP Method TRACE Enabled
app.use((req, res, next) => {
  if (req.method === 'TRACE') {
    res.type('message/http');
    let echo = `${req.method} ${req.url} HTTP/${req.httpVersion}\r\n`;
    for (let header in req.headers) {
      echo += `${header}: ${req.headers[header]}\r\n`;
    }
    echo += '\r\n';
    return res.status(200).send(echo);
  }
  next();
});

// View Engine Setup (EJS)
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// VULNERABILITY: Static directory serving uploads without access control
app.use('/public', express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Routes Middleware
app.use('/auth', authRoutes);
app.use('/students', studentRoutes);
app.use('/records', recordRoutes);
app.use('/vault', vaultRoutes);
app.use('/notes', noteRoutes);
app.use('/import', importRoutes);
app.use('/admin', adminRoutes);

// Main Portal Dashboard Endpoint
app.get('/dashboard', isAuthenticated, async (req, res) => {
  try {
    const userId = req.session.user.id;
    const [students] = await db.query(`SELECT * FROM students WHERE user_id=${userId}`);
    const student = students[0] || null;

    // Fetch quick summary stats
    const [notes] = await db.query('SELECT * FROM notes ORDER BY created_at DESC LIMIT 5');
    const [recentStudents] = await db.query('SELECT s.*, u.email FROM students s JOIN users u ON s.user_id=u.id ORDER BY s.id DESC LIMIT 5');

    res.render('dashboard', {
      user: req.session.user,
      student,
      recentNotes: notes,
      recentStudents,
      error: null
    });
  } catch (err) {
    res.render('dashboard', {
      user: req.session.user,
      student: null,
      recentNotes: [],
      recentStudents: [],
      error: `Dashboard DB Error: ${err.message}`
    });
  }
});

// Root Landing Page redirect
app.get('/', optionalAuth, (req, res) => {
  if (req.session && req.session.user) {
    return res.redirect('/dashboard');
  }
  return res.redirect('/auth/login');
});

// Error handling middleware
// VULNERABILITY: Stack traces and verbose DB error responses returned to client
app.use((err, req, res, next) => {
  console.error('[UNHANDLED APP ERROR]:', err);
  res.status(500).render('error', {
    error: 'Internal Server Error (500)',
    message: err.message,
    stack: err.stack
  });
});

// Start Server
if (require.main === module || !process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`=======================================================`);
    console.log(` STUDENTHUB LAB — ISOLATED TRAINING USE ONLY`);
    console.log(`=======================================================`);
    console.log(` [!] StudentHub Security Lab Server active on port ${PORT}`);
    console.log(` [!] ENVIRONMENT: ${process.env.NODE_ENV || 'development'}`);
    console.log(` [!] WARNING: FOR LOCAL AUTHORIZED LAB TESTING ONLY`);
    console.log(` [!] DO NOT EXPOSE TO PUBLIC NETWORKS`);
    console.log(`=======================================================`);
  });
}

// Export Express app for Vercel serverless deployment
module.exports = app;

