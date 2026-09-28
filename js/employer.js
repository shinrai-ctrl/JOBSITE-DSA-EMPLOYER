'use strict';

const element = id => document.getElementById(id);
let employer;
let registering = false;
let skills = [];
const detailFields = {
    description: 'Description', responsibilities: 'Responsibilities', qualifications: 'Qualifications / requirements',
    work_schedule: 'Work schedule', benefits: 'Benefits', application_requirements: 'Application requirements',
    application_deadline: 'Application deadline', how_to_apply: 'How to apply', contact_information: 'Contact information',
};

async function api(url, method = 'GET', body) {
    const response = await fetch(url, {
        method, credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: method === 'POST' ? JSON.stringify(body || {}) : undefined,
    });
    const data = await response.json();
    if (!response.ok) {
        const error = new Error(data.error || 'Unable to complete the request. Please try again.');
        error.status = response.status;
        throw error;
    }
    return data;
}

function status(id, message, error = false) {
    element(id).textContent = message;
    element(id).classList.toggle('is-error', error);
}

function showAuth() {
    employer = null;
    element('auth-section').hidden = false;
    element('dashboard').hidden = true;
    element('logout').hidden = true;
    element('job-list').replaceChildren();
}

function node(tag, text) {
    const result = document.createElement(tag);
    result.textContent = text;
    return result;
}

function renderJobs(jobs) {
    element('job-list').replaceChildren();
    status('listings-status', jobs.length ? `${jobs.length} published ${jobs.length === 1 ? 'job' : 'jobs'}` : 'No jobs posted yet. Post your first opportunity to help someone take their next step.');
    for (const job of jobs) {
        const article = document.createElement('article');
        article.className = 'employer-job';
        article.append(node('h3', job.title), node('p', [job.company, job.location, job.employment_type, job.salary].filter(Boolean).join(' · ')));
        const details = document.createElement('details');
        details.append(node('summary', 'View posting details'));
        const list = document.createElement('dl');
        list.append(node('dt', 'Required skills'), node('dd', job.requiredSkills.join(', ')));
        for (const [key, label] of Object.entries(detailFields)) {
            if (job[key]) list.append(node('dt', label), node('dd', job[key]));
        }
        details.append(list);
        article.append(details);
        element('job-list').append(article);
    }
}

async function loadJobs() {
    status('listings-status', 'Loading your listings…');
    element('retry-listings').hidden = true;
    try {
        renderJobs((await api('/api/employers/jobs')).jobs);
    } catch (error) {
        status('listings-status', error.message, true);
        element('retry-listings').hidden = false;
        if (error.status === 401) {
            showAuth();
            status('page-status', 'Your employer session expired. Log in again to continue.', true);
        }
    }
}

function showDashboard(account) {
    employer = account;
    element('auth-section').hidden = true;
    element('dashboard').hidden = false;
    element('logout').hidden = false;
    element('employer-identity').textContent = `${account.company_name} · ${account.full_name} · ${account.email}`;
    element('posting-company').value = account.company_name;
    element('posting-section').hidden = true;
    element('listings-section').hidden = false;
    element('post-job').hidden = false;
    loadJobs();
}

element('auth-switch').addEventListener('click', () => {
    registering = !registering;
    element('registration-fields').hidden = !registering;
    for (const input of element('registration-fields').querySelectorAll('input')) {
        input.disabled = !registering;
        input.required = registering;
    }
    element('auth-title').textContent = registering ? 'Create an employer account' : 'Employer login';
    element('auth-help').textContent = registering ? 'Start with your details and company name.' : 'Welcome back. Sign in to see your listings.';
    element('auth-submit').textContent = registering ? 'Create account' : 'Log in';
    element('auth-switch').textContent = registering ? 'Already registered? Log in' : 'New here? Create an employer account';
    element('auth-form').elements.password.autocomplete = registering ? 'new-password' : 'current-password';
    status('page-status', '');
});

element('auth-form').addEventListener('submit', async event => {
    event.preventDefault();
    element('auth-submit').disabled = true;
    element('auth-switch').disabled = true;
    status('page-status', registering ? 'Creating your account…' : 'Logging in…');
    try {
        const result = await api(`/api/employers/${registering ? 'register' : 'login'}`, 'POST', Object.fromEntries(new FormData(event.target)));
        element('auth-form').reset();
        showDashboard(result.employer);
        element('post-job').focus();
        status('page-status', '');
    } catch (error) {
        status('page-status', error.message, true);
    } finally {
        element('auth-submit').disabled = false;
        element('auth-switch').disabled = false;
    }
});

element('logout').addEventListener('click', async () => {
    element('logout').disabled = true;
    try {
        await api('/api/employers/logout', 'POST');
        element('posting-form').reset();
        showAuth();
        element('auth-form').elements.email.focus();
        status('page-status', 'You have logged out of your employer account.');
    } catch (error) {
        status('page-status', error.message, true);
    } finally {
        element('logout').disabled = false;
    }
});

function updateSkills() {
    const query = element('skill-search').value.trim().toLowerCase();
    let visible = 0;
    for (const label of element('skill-options').children) {
        label.hidden = !label.textContent.toLowerCase().includes(query);
        if (!label.hidden) visible++;
    }
    const count = element('skill-options').querySelectorAll('input:checked').length;
    status('skill-count', `${count} selected · ${visible} skills shown${visible ? '' : ' — try another search'}`);
}

async function loadSkills() {
    element('publish-job').disabled = true;
    element('retry-skills').hidden = true;
    status('skill-count', 'Loading skills…');
    try {
        if (!skills.length) skills = (await api('/api/auth/skills')).skills;
        if (!skills.length) throw new Error('No skills are available. Contact the site administrator.');
        if (!element('skill-options').children.length) {
            for (const skill of skills) {
                const label = document.createElement('label');
                const input = document.createElement('input');
                input.type = 'checkbox';
                input.value = skill.id;
                label.append(input, document.createTextNode(skill.name));
                element('skill-options').append(label);
            }
        }
        updateSkills();
        element('publish-job').disabled = false;
    } catch (error) {
        status('skill-count', error.message, true);
        element('retry-skills').hidden = false;
    }
}

element('skill-search').addEventListener('input', updateSkills);
element('skill-options').addEventListener('change', updateSkills);
element('retry-skills').addEventListener('click', loadSkills);
element('retry-listings').addEventListener('click', loadJobs);
element('post-job').addEventListener('click', () => {
    element('posting-section').hidden = false;
    element('listings-section').hidden = true;
    element('post-job').hidden = true;
    element('posting-form').elements.application_deadline.min = new Date().toISOString().slice(0, 10);
    element('posting-form').elements.title.focus();
    loadSkills();
});
element('cancel-post').addEventListener('click', () => {
    element('posting-section').hidden = true;
    element('listings-section').hidden = false;
    element('post-job').hidden = false;
    element('post-job').focus();
});

element('posting-form').addEventListener('submit', async event => {
    event.preventDefault();
    const body = Object.fromEntries(new FormData(event.target));
    body.skillIds = [...element('skill-options').querySelectorAll('input:checked')].map(input => Number(input.value));
    if (!body.skillIds.length) {
        status('posting-status', 'Select at least one required skill before publishing.', true);
        element('skill-search').focus();
        return;
    }
    element('publish-job').disabled = true;
    element('cancel-post').disabled = true;
    status('posting-status', 'Publishing your job…');
    try {
        const { job } = await api('/api/employers/jobs', 'POST', body);
        event.target.reset();
        element('posting-company').value = employer.company_name;
        status('posting-status', '');
        element('posting-section').hidden = true;
        element('listings-section').hidden = false;
        element('post-job').hidden = false;
        status('page-status', `“${job.title}” is published. Job seekers can now find it in job search.`);
        await loadJobs();
        element('post-job').focus();
    } catch (error) {
        status('posting-status', error.status === 401 ? 'Your session expired. Log in again in another tab, then retry; your draft is still here.' : error.message, true);
    } finally {
        element('publish-job').disabled = false;
        element('cancel-post').disabled = false;
    }
});

api('/api/employers/me').then(({ employer: account }) => {
    status('page-status', '');
    showDashboard(account);
}).catch(error => {
    showAuth();
    status('page-status', error.status === 401 ? '' : 'Unable to check your session. Try logging in or reload the page.', error.status !== 401);
});
