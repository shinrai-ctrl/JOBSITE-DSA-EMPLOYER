'use strict';

const express = require('express');
const bcrypt = require('bcryptjs');
const { db } = require('./database');
const ownerColumn = require('./employerMigration').employerOwnerColumn(db);
const router = express.Router();
const publicEmployer = db.prepare('SELECT id, full_name, company_name, email FROM employers WHERE id = ?');
const employmentTypes = ['Full-time', 'Part-time', 'Contract', 'Temporary', 'Internship', 'Freelance'];

function badRequest(message) {
    const error = new Error(message);
    error.status = 400;
    throw error;
}

function text(body, key, max, required = false) {
    const value = body[key] ?? '';
    if (typeof value !== 'string') badRequest(`${key} must be text.`);
    const clean = value.trim().replace(/\r\n?/g, '\n');
    if (required && !clean) badRequest(`${key} is required.`);
    if (clean.length > max) badRequest(`${key} must be at most ${max} characters.`);
    return clean;
}

function credentials(body) {
    const email = text(body, 'email', 254, true).toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) badRequest('Enter a valid email address.');
    const password = body.password;
    if (typeof password !== 'string' || password.length < 8 || Buffer.byteLength(password, 'utf8') > 72) {
        badRequest('Password must be at least 8 characters and at most 72 UTF-8 bytes.');
    }
    return { email, password };
}

function signIn(req, res, id, status = 200) {
    req.session.regenerate(error => {
        if (error) return fail(error, req, res);
        req.session.employerId = id;
        req.session.save(error => {
            if (error) return fail(error, req, res);
            if (status === 201) res.location('/api/employers/me');
            res.status(status).json({ employer: publicEmployer.get(id) });
        });
    });
}

// JSON-only writes prevent cross-site HTML form submissions to employer endpoints.
router.use((req, res, next) => {
    if (req.method === 'POST' && !req.is('application/json')) return res.status(415).json({ error: 'Send application/json.' });
    if (req.method === 'POST' && req.get('Sec-Fetch-Site') === 'cross-site') return res.status(403).json({ error: 'Cross-site request rejected.' });
    next();
});

router.post('/register', (req, res) => {
    const body = req.body || {};
    const { email, password } = credentials(body);
    const fullName = text(body, 'fullName', 120, true);
    const companyName = text(body, 'companyName', 160, true);
    if (db.prepare('SELECT id FROM employers WHERE email = ?').get(email)) return res.status(409).json({ error: 'An employer account with that email already exists.' });
    const result = db.prepare('INSERT INTO employers (full_name, company_name, email, password_hash) VALUES (?, ?, ?, ?)')
        .run(fullName, companyName, email, bcrypt.hashSync(password, 10));
    signIn(req, res, result.lastInsertRowid, 201);
});

router.post('/login', (req, res) => {
    const { email, password } = credentials(req.body || {});
    const employer = db.prepare('SELECT id, password_hash FROM employers WHERE email = ?').get(email);
    if (!employer || !bcrypt.compareSync(password, employer.password_hash)) return res.status(401).json({ error: 'Invalid email or password.' });
    signIn(req, res, employer.id);
});

router.post('/logout', (req, res) => {
    req.session.destroy(error => {
        if (error) return fail(error, req, res);
        res.clearCookie('jobpath.employer.sid', { path: '/api/employers' });
        res.json({ success: true });
    });
});

router.use((req, res, next) => {
    const employer = req.session.employerId && publicEmployer.get(req.session.employerId);
    if (!employer) return res.status(401).json({ error: 'Log in as an employer to continue.' });
    req.employer = employer;
    next();
});

router.get('/me', (req, res) => res.json({ employer: req.employer }));

router.get('/jobs', (req, res) => {
    const jobs = db.prepare(`SELECT *, ${ownerColumn} AS employer_id FROM jobs WHERE ${ownerColumn} = ? ORDER BY id DESC`).all(req.employer.id);
    const skills = db.prepare('SELECT s.name FROM job_skills js JOIN skills s ON s.id = js.skill_id WHERE js.job_id = ? ORDER BY s.name');
    for (const job of jobs) job.requiredSkills = skills.all(job.id).map(skill => skill.name);
    res.json({ jobs });
});

router.post('/jobs', (req, res) => {
    const body = req.body || {};
    const fields = {
        title: [160, true], description: [10000, true], salary: [200, true], location: [200, true], employment_type: [30, true],
        responsibilities: [10000], qualifications: [10000], work_schedule: [1000], benefits: [5000],
        application_requirements: [5000], application_deadline: [10], how_to_apply: [3000, true], contact_information: [1000, true],
    };
    const allowed = new Set([...Object.keys(fields), 'skillIds']);
    for (const key of Object.keys(body)) if (!allowed.has(key)) badRequest(`Unexpected field: ${key}. Company and ownership come from your account.`);
    const job = {};
    for (const [key, [max, required]] of Object.entries(fields)) job[key] = text(body, key, max, required);
    const type = employmentTypes.find(value => value.toLowerCase() === job.employment_type.toLowerCase());
    if (!type) badRequest('Choose a supported employment type.');
    job.employment_type = type;
    if (job.application_deadline) {
        const date = new Date(job.application_deadline + 'T00:00:00Z');
        if (!/^\d{4}-\d{2}-\d{2}$/.test(job.application_deadline) || !Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== job.application_deadline) badRequest('Enter a valid application deadline (YYYY-MM-DD).');
        if (job.application_deadline < new Date().toISOString().slice(0, 10)) badRequest('Application deadline cannot be in the past (UTC).');
    }
    if (!Array.isArray(body.skillIds) || !body.skillIds.length || body.skillIds.length > 100 || body.skillIds.some(id => !Number.isSafeInteger(id) || id <= 0)) badRequest('Select between 1 and 100 valid skill IDs.');
    const skillIds = [...new Set(body.skillIds)];
    const id = db.transaction(() => {
        const exists = db.prepare('SELECT id FROM skills WHERE id = ?');
        if (skillIds.some(skillId => !exists.get(skillId))) badRequest('One or more selected skills do not exist. Reload the skills and try again.');
        const keys = Object.keys(job);
        const result = db.prepare(`INSERT INTO jobs (${keys.join(', ')}, company, ${ownerColumn}, posted_at) VALUES (${keys.map(() => '?').join(', ')}, ?, ?, CURRENT_TIMESTAMP)`)
            .run(...Object.values(job), req.employer.company_name, req.employer.id);
        const link = db.prepare('INSERT INTO job_skills (job_id, skill_id, required) VALUES (?, ?, 1)');
        for (const skillId of skillIds) link.run(result.lastInsertRowid, skillId);
        return result.lastInsertRowid;
    })();
    res.location(`/api/jobs/${id}`).status(201).json({ job: db.prepare(`SELECT *, ${ownerColumn} AS employer_id FROM jobs WHERE id = ?`).get(id) });
});

// Keep unknown employer URLs inside this session boundary.
router.use((req, res) => res.status(404).json({ error: 'Employer endpoint not found.' }));
function fail(error, req, res, next) {
    if (error.status === 400) return res.status(400).json({ error: error.message });
    console.error('[employers]', error);
    res.status(500).json({ error: 'Unable to complete the request. Please try again.' });
}
router.use(fail);
module.exports = router;
