'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const Database = require('better-sqlite3');

test('E1 migration preserves every existing row and is idempotent', async () => {
    const { migrateEmployers } = require('../employerMigration');
    const source = new Database(path.join(__dirname, '..', 'jobpath.db'), { readonly: true });
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'jobpath-migration-'));
    let copy;
    try {
        await source.backup(path.join(dir, 'copy.db'));
        copy = new Database(path.join(dir, 'copy.db'));
        copy.pragma('foreign_keys = ON');
        const tables = source.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'").all();
        const before = tables.map(({ name }) => ({ name, rows: copy.prepare(`SELECT * FROM "${name}" ORDER BY rowid`).all() }));
        migrateEmployers(copy);
        const schema = copy.prepare('SELECT * FROM sqlite_master ORDER BY name').all();
        migrateEmployers(copy);
        assert.deepEqual(copy.prepare('SELECT * FROM sqlite_master ORDER BY name').all(), schema);
        for (const { name, rows } of before) {
            const after = copy.prepare(`SELECT * FROM "${name}" ORDER BY rowid`).all();
            assert.equal(after.length, rows.length, name);
            rows.forEach((row, i) => {
                for (const key of Object.keys(row)) assert.deepEqual(after[i][key], row[key], `${name}.${key}`);
            });
        }
        assert.deepEqual(copy.pragma('foreign_key_check'), []);
        assert.equal(require('../employerMigration').employerOwnerColumn(copy), 'employer_id');
        const owner = copy.prepare("INSERT INTO employers (full_name, company_name, email, password_hash) VALUES ('Test', 'Test', 'migration@example.com', 'test')").run().lastInsertRowid;
        copy.prepare("INSERT INTO jobs (title, employer_id) VALUES ('Legacy E1 compatibility', ?)").run(owner);
        assert.throws(() => copy.prepare("INSERT INTO jobs (title, employer_id) VALUES ('Invalid owner', -1)").run(), { code: 'SQLITE_CONSTRAINT_FOREIGNKEY' });
        console.log(`Preserved ${before.find(t => t.name === 'jobs').rows.length} existing jobs and all other existing table data.`);
    } finally {
        source.close();
        copy?.close();
        fs.rmSync(dir, { recursive: true, force: true });
    }
});

test('E1 employer API, seeker regression, ownership, atomicity and matching', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'jobpath-e1-'));
    process.env.JOBPATH_DB_PATH = path.join(dir, 'test.db');
    const app = require('../server');
    const { db } = require('../database');
    const server = app.listen(0, '127.0.0.1');
    await new Promise(resolve => server.once('listening', resolve));
    const base = `http://127.0.0.1:${server.address().port}`;
    const client = () => {
        const cookies = new Map();
        return async (url, method = 'GET', body) => {
            const response = await fetch(base + url, {
                method, headers: { 'Content-Type': 'application/json', Cookie: [...cookies].map(([k, v]) => `${k}=${v}`).join('; ') },
                body: body === undefined ? undefined : JSON.stringify(body),
            });
            for (const cookie of response.headers.getSetCookie()) {
                const pair = cookie.split(';')[0];
                const at = pair.indexOf('=');
                cookies.set(pair.slice(0, at), pair.slice(at + 1));
            }
            const data = response.headers.get('content-type')?.includes('application/json') ? await response.json() : await response.text();
            return { status: response.status, data, location: response.headers.get('location') };
        };
    };
    const anon = client(), a = client(), b = client();
    const account = { fullName: 'Hiring Manager', companyName: 'E1 Test Company', email: ' OWNER@EXAMPLE.COM ', password: 'test-password-123' };
    try {
        assert.equal((await anon('/api/employers/me')).status, 401);
        assert.equal((await anon('/api/employers/jobs')).status, 401);
        assert.equal((await anon('/api/employers/jobs', 'POST', {})).status, 401);
        assert.equal((await anon('/jobpath.db')).status, 404);
        assert.equal((await a('/api/employers/register', 'POST', { ...account, email: [], password: [] })).status, 400);
        const registered = await a('/api/employers/register', 'POST', account);
        assert.equal(registered.status, 201);
        assert.equal(registered.data.employer.email, 'owner@example.com');
        assert.equal(JSON.stringify(registered.data).includes('password'), false);
        assert.equal((await b('/api/employers/register', 'POST', account)).status, 409);
        assert.equal((await a('/api/auth/me')).status, 401);
        assert.equal((await a('/api/jobs/recommended')).status, 401);
        assert.equal((await a('/api/employers/me')).status, 200);
        const second = await b('/api/employers/register', 'POST', { ...account, email: 'second@example.com' });
        assert.equal(second.status, 201);
        // A main-branch user-owned job must not become an E1 account's job when IDs overlap.
        const legacyJob = db.prepare("INSERT INTO jobs (title, employer_id) VALUES ('Main ownership', ?)").run(registered.data.employer.id).lastInsertRowid;
        assert.deepEqual((await a('/api/employers/jobs')).data.jobs, []);
        const skills = (await anon('/api/auth/skills')).data.skills.slice(0, 2);
        const posting = {
            title: ' E1 Engineer ', description: 'Build useful products.', location: 'Remote', salary: 'PHP 30,000–45,000 / month',
            employment_type: 'Full-time', responsibilities: 'Build and test.', qualifications: 'Relevant experience.',
            work_schedule: 'Weekdays', benefits: 'Paid leave', application_requirements: 'Resume and portfolio',
            application_deadline: '2099-12-31', how_to_apply: 'Email your resume.', contact_information: 'careers@example.com',
            skillIds: [skills[0].id, skills[1].id, skills[0].id],
        };
        const count = () => db.prepare('SELECT COUNT(*) n FROM jobs').get().n;
        const initial = count();
        for (const invalid of [
            { title: ' ' }, { description: {} }, { skillIds: [] }, { skillIds: [999999999] }, { skillIds: ['1'] },
            { employment_type: 'invalid' }, { application_deadline: '2027-02-30' }, { application_deadline: '2000-01-01' },
            { employer_id: second.data.employer.id }, { company: 'Someone else' }, { salary: 'x'.repeat(201) },
        ]) {
            assert.equal((await a('/api/employers/jobs', 'POST', { ...posting, ...invalid })).status, 400, JSON.stringify(invalid));
        }
        assert.equal(count(), initial);
        // A DB-level failure after the job INSERT must roll back the entire posting.
        db.exec(`CREATE TEMP TRIGGER fail_e1_skill BEFORE INSERT ON job_skills WHEN NEW.skill_id = ${skills[1].id} BEGIN SELECT RAISE(ABORT, 'test rollback'); END`);
        assert.equal((await a('/api/employers/jobs', 'POST', posting)).status, 500);
        assert.equal(count(), initial);
        db.exec('DROP TRIGGER fail_e1_skill');
        const created = await a('/api/employers/jobs', 'POST', posting);
        assert.equal(created.status, 201);
        const job = created.data.job;
        assert.equal(created.location, `/api/jobs/${job.id}`);
        assert.equal(job.company, account.companyName);
        assert.equal(job.employer_id, registered.data.employer.id);
        const stored = db.prepare('SELECT employer_id, employer_account_id FROM jobs WHERE id = ?').get(job.id);
        assert.equal(stored.employer_id, null, 'current main user ownership is not repurposed');
        assert.equal(stored.employer_account_id, registered.data.employer.id);
        assert.equal(db.pragma('foreign_keys', { simple: true }), 1);
        assert.throws(() => db.prepare('UPDATE jobs SET employer_account_id = ? WHERE id = ?').run(999999999, job.id), { code: 'SQLITE_CONSTRAINT_FOREIGNKEY' });
        assert.throws(() => db.prepare('UPDATE jobs SET employer_id = ? WHERE id = ?').run(999999999, job.id), { code: 'SQLITE_CONSTRAINT_FOREIGNKEY' });
        assert.equal(job.title, 'E1 Engineer');
        for (const key of ['responsibilities', 'qualifications', 'work_schedule', 'benefits', 'application_requirements', 'application_deadline', 'how_to_apply', 'contact_information']) assert.equal(job[key], posting[key]);
        assert.equal(db.prepare('SELECT COUNT(*) n FROM job_skills WHERE job_id = ? AND required = 1').get(job.id).n, 2);
        assert.deepEqual((await b('/api/employers/jobs?employer_id=' + job.employer_id)).data.jobs, []);
        assert.equal((await a('/api/employers/jobs')).data.jobs[0].id, job.id);
        // Identical independently posted jobs must both remain discoverable.
        const duplicate = await b('/api/employers/jobs', 'POST', posting);
        assert.equal(duplicate.status, 201);
        const found = (await anon('/api/jobs?q=E1%20Engineer')).data.jobs;
        assert.deepEqual(new Set(found.map(j => j.id)), new Set([job.id, duplicate.data.job.id]));
        assert.equal((await anon(`/api/jobs/${job.id}`)).status, 200);
        assert.equal((await b(`/api/employers/jobs/${job.id}`, 'DELETE')).status, 404);
        const seeker = { fullName: 'E1 Seeker', email: 'seeker@example.com', password: 'seeker123', confirmPassword: 'seeker123', education: 'College', degree: 'BSCS', targetJob: 'Engineer', location: 'Remote' };
        assert.equal((await a('/api/auth/register', 'POST', seeker)).status, 200);
        assert.equal((await a('/api/auth/profile/skills', 'PUT', { skillIds: [skills[0].id] })).status, 200);
        const matched = (await a(`/api/jobs/${job.id}`)).data;
        assert.equal(matched.matchScore, 50);
        assert.deepEqual(matched.matchingSkills, [skills[0].name]);
        assert.deepEqual(matched.missingSkills, [skills[1].name]);
        assert.equal((await a('/api/jobs/recommended')).data.jobs.find(j => j.id === job.id).matchScore, 50);
        assert.equal((await a('/api/jobs?q=E1%20Engineer&minMatch=50')).data.jobs.length, 2);
        assert.equal((await a(`/api/jobs/saved/${job.id}`, 'POST')).status, 200);
        assert.equal((await a('/api/jobs/saved')).data.jobs[0].id, job.id);
        assert.equal((await a('/api/employers/logout', 'POST')).status, 200);
        assert.equal((await a('/api/employers/me')).status, 401);
        assert.equal((await a('/api/auth/me')).status, 200);
        assert.equal((await a('/api/employers/login', 'POST', { email: account.email, password: 'wrong-password' })).status, 401);
        assert.equal((await a('/api/employers/login', 'POST', account)).status, 200);
        assert.equal((await a('/api/auth/logout', 'POST')).status, 200);
        assert.equal((await a('/api/employers/me')).status, 200);
        assert.equal((await a('/api/auth/login', 'POST', seeker)).status, 200);
        assert.equal((await a('/api/auth/me')).status, 200);
        const reopened = new Database(process.env.JOBPATH_DB_PATH, { readonly: true });
        assert.equal(reopened.prepare('SELECT company FROM jobs WHERE id = ?').get(job.id).company, account.companyName);
        reopened.close();
        assert.equal(count(), initial + 2);
        assert.equal(db.prepare('SELECT employer_id FROM jobs WHERE id = ?').get(legacyJob).employer_id, registered.data.employer.id);
        assert.deepEqual(db.pragma('foreign_key_check'), []);
        await new Promise(resolve => server.close(resolve));
        db.close();
        // Boot the real app again in a fresh process, reapplying migration and seed sync.
        const restart = spawnSync(process.execPath, ['-e', `
            const assert = require('node:assert/strict');
            const app = require('./server');
            const { db } = require('./database');
            const server = app.listen(0, '127.0.0.1', async () => {
                try {
                    const base = 'http://127.0.0.1:' + server.address().port;
                    const login = await fetch(base + '/api/employers/login', {
                        method: 'POST', headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(${JSON.stringify(account)})
                    });
                    assert.equal(login.status, 200);
                    const cookie = login.headers.getSetCookie()[0].split(';')[0];
                    const response = await fetch(base + '/api/employers/jobs', { headers: { Cookie: cookie } });
                    assert.equal(response.status, 200);
                    const jobs = (await response.json()).jobs;
                    assert.equal(jobs.length, 1);
                    assert.equal(jobs[0].id, ${job.id});
                    assert.equal(jobs[0].requiredSkills.length, 2);
                    const detail = await fetch(base + '/api/jobs/${job.id}');
                    assert.equal(detail.status, 200);
                    console.log('Fresh-process restart: account, posting and skills persisted.');
                } catch (error) {
                    console.error(error);
                    process.exitCode = 1;
                } finally {
                    server.close(() => db.close());
                }
            });
        `], { cwd: path.join(__dirname, '..'), env: process.env, encoding: 'utf8', timeout: 60000 });
        assert.equal(restart.status, 0, restart.stderr || restart.error?.message || restart.stdout);
        console.log(restart.stdout.trim());
    } finally {
        await new Promise(resolve => server.close(resolve));
        if (db.open) db.close();
        fs.rmSync(dir, { recursive: true, force: true });
        delete process.env.JOBPATH_DB_PATH;
    }
});
