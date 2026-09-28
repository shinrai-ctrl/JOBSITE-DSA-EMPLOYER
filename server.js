
const express = require('express');
const session = require('express-session');
const path = require('path');

const { db } = require('./database');
const { seedIfNeeded } = require('./seed');

const authRoutes = require('./authRoutes');
const jobRoutes = require('./jobRoutes');
const resumeRoutes = require('./resumeRoutes');
const referenceRoutes = require('./referenceRoutes');
const learningRoutes = require('./learningRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// Seed the database with skills/jobs/demo user if empty
seedIfNeeded(db);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Independent cookie/store so either role can log out without signing out the other.
app.use('/api/employers', session({
    name: 'jobpath.employer.sid',
    secret: process.env.SESSION_SECRET || 'jobpath-dev-secret-change-me',
    resave: false,
    saveUninitialized: false,
    cookie: { path: '/api/employers', maxAge: 86400000, httpOnly: true, sameSite: 'lax' },
}), require('./employerRoutes'));

app.use(session({
    secret: process.env.SESSION_SECRET || 'jobpath-dev-secret-change-me',
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 1000 * 60 * 60 * 24, // 1 day
        httpOnly: true,
    },
}));

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Database files now also contain employer credentials; never serve them as assets.
app.use((req, res, next) => {
    let pathname;
    try { pathname = decodeURIComponent(req.path); } catch { return res.sendStatus(400); }
    if (/\.(?:db|sqlite|sqlite3|sql)(?:-(?:wal|shm|journal))?$/i.test(pathname)) return res.sendStatus(404);
    next();
});
app.use(express.static(__dirname));

app.use('/api/auth', authRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/resume', resumeRoutes);
app.use('/api/reference', referenceRoutes);
app.use('/api/learning', learningRoutes);


app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
});

if (require.main === module) app.listen(PORT, () => {
    console.log(`[server] JobPath API running on http://localhost:${PORT}`);
});
module.exports = app;
