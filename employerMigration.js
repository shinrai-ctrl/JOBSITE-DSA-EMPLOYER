'use strict';

// Current main reserves employer_id for users; older E1 databases reference employers.
function employerOwnerColumn(db) {
    return db.pragma('foreign_key_list(jobs)').some(key => key.from === 'employer_id' && key.table === 'users')
        ? 'employer_account_id' : 'employer_id';
}

// Run for both existing and new databases; never reset or reseed user data.
function migrateEmployers(db) {
    db.transaction(() => {
        db.exec(`CREATE TABLE IF NOT EXISTS employers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            full_name TEXT NOT NULL,
            company_name TEXT NOT NULL,
            email TEXT NOT NULL UNIQUE COLLATE NOCASE,
            password_hash TEXT NOT NULL,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        )`);
        const columns = new Set(db.pragma('table_info(jobs)').map(column => column.name));
        const ownerColumn = employerOwnerColumn(db);
        const additions = {
            [ownerColumn]: 'INTEGER REFERENCES employers(id)',
            responsibilities: 'TEXT', qualifications: 'TEXT', work_schedule: 'TEXT',
            benefits: 'TEXT', application_requirements: 'TEXT', application_deadline: 'TEXT',
            how_to_apply: 'TEXT', contact_information: 'TEXT', posted_at: 'TEXT',
        };
        for (const [name, type] of Object.entries(additions)) {
            if (!columns.has(name)) db.exec(`ALTER TABLE jobs ADD COLUMN ${name} ${type}`);
        }
        db.exec(`CREATE INDEX IF NOT EXISTS jobs_${ownerColumn} ON jobs(${ownerColumn})`);
    })();
}

module.exports = { migrateEmployers, employerOwnerColumn };
