---
version: alpha
name: autonomous-agent-qa-testing-matrix
description: Enforces test-driven development loops, mock API fixtures, and deterministic runtime assertions.
---

# Agent Quality Assurance & Testing Rules

## 1. Test-Driven Development (TDD) Loop [tdd-cycle]
- **Red-Green-Refine:** Write a failing test outlining expected backend, database, or tool returns *before* generating logic handlers.
- **Isolate Assertions:** Test components in pure isolation. Validate individual utility functions separately from the core orchestrator state loop.

## 2. LLM & API Mocking [mock-perimeter]
- **Deterministic Fixtures:** Never let test suites hit live AI provider endpoints (OpenAI, Claude, OmniRoute) during standard unit testing.
- **Fixture Replays:** Mock model text strings and tool-call returns using local JSON snapshot files to keep test coverage 100% free and lightning-fast.
- **Cost Controls:** Implement warning thresholds that automatically terminate any integration test run if live API calls are accidentally detected.

## 3. Sandboxed Integration Tests [sandbox-integration]
- **Database Cleansing:** Force integration test tasks to execute against a localized, isolated PostgreSQL test container or separate testing schema. Completely wipe and seed the tables before each test run.
- **Tool Automation Mocks:** Intercept hazardous terminal execution commands (like shell write scripts) during testing loops and route them to a temporary memory array instead of your real desktop filesystem.
