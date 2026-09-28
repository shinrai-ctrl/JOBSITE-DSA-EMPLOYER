'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

test('seeker cards escape employer text and keep distinct employer postings', () => {
    // A small DOM recorder exercises the shipped renderer without a browser dependency.
    const node = () => ({
        children: [], dataset: {},
        setAttribute() {}, addEventListener() {}, insertAdjacentElement() {}, scrollIntoView() {},
        appendChild(child) { this.children.push(child); },
        set innerHTML(value) { this.html = value; this.children = []; },
        get innerHTML() { return this.html || ''; },
    });
    const grid = node();
    const elements = { '#resultsSection': node(), '#resultsGrid': grid, '#resultsTitle': node() };
    const context = {
        document: {
            querySelector: selector => elements[selector] || null,
            querySelectorAll: () => [],
            createElement: node,
            createDocumentFragment: node,
            addEventListener() {},
        },
        window: { location: { search: '' } }, URLSearchParams, console,
    };
    const source = fs.readFileSync(path.join(__dirname, '..', 'js', 'jobs.js'), 'utf8')
        .replace('export function initJobs()', 'function initJobs()')
        .replace('    loadInitialJobs();', '    globalThis.renderForTest = renderJobs;');
    vm.runInNewContext(source + '\ninitJobs();', context);
    const attack = '<img src=x onerror="alert(1)"> & <script>bad()</script>';
    const job = { id: 10, employer_id: 1, title: attack, company: attack, location: attack, salary: attack, employment_type: 'Full-time' };
    context.renderForTest([job, { ...job, id: 11, employer_id: 2 }], 'Test', false);
    const cards = grid.children[0].children;
    assert.equal(cards.length, 2);
    for (const card of cards) {
        assert.doesNotMatch(card.innerHTML, /<img|<script/);
        assert.equal((card.innerHTML.match(/&lt;img/g) || []).length, 4);
        assert.match(card.innerHTML, /&quot;alert\(1\)&quot;/);
        assert.match(card.innerHTML, /&amp;/);
    }
    context.renderForTest([{ ...job, employer_id: null, employer_account_id: 1 }, { ...job, id: 11, employer_id: null, employer_account_id: 2 }], 'Current main E1', false);
    assert.equal(grid.children[0].children.length, 2);
    context.renderForTest([{ ...job, employer_id: null }, { ...job, id: 11, employer_id: null }], 'Legacy', false);
    assert.equal(grid.children[0].children.length, 1, 'legacy seeded-job deduplication is preserved');
});
