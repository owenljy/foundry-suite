# Playwright End-to-End Tests

> **TODO**: Expand with concrete patterns from our e2e test projects. Outline extracted from snapp-e2e-tests skill.

## When to use this doc

Load this when generating or reviewing Playwright end-to-end tests for ServiceNow applications, including portal pages, forms, and workspace views.

## Core Principles

### Outcome-Driven Assertions

Verify results via API, check URL patterns, validate ACL boundaries. **Do NOT assert on exact text from LLM-driven responses** — they vary between runs.

```javascript
// GOOD — verify via API
const response = await request.get(`/api/now/table/incident/${sysId}`);
expect(response.ok()).toBeTruthy();
const data = await response.json();
expect(data.result.state).toBe('6'); // Resolved

// BAD — brittle text assertion
expect(await page.locator('.status').textContent()).toBe('Your incident has been resolved');
```

### Priority Tagging

| Tag | Use For |
|-----|---------|
| `@high` | Core workflows, security/ACL boundaries |
| `@medium` | Alternate flows, edge cases |
| `@low` | Cosmetic, layout verification |

## Test Structure

### Fixtures

Extend Playwright's built-in fixtures with pre-authenticated sessions:

```javascript
import { test as base } from '@playwright/test';

export const test = base.extend({
    adminPage: async ({ browser }, use) => {
        const context = await browser.newContext({
            storageState: 'auth/admin.json'
        });
        const page = await context.newPage();
        await use(page);
        await context.close();
    },
    userPage: async ({ browser }, use) => {
        const context = await browser.newContext({
            storageState: 'auth/user.json'
        });
        const page = await context.newPage();
        await use(page);
        await context.close();
    },
});
```

### Test Data Factory

Create and clean up test data via REST API:

```javascript
class EntityFactory {
    constructor(request) {
        this.request = request;
        this.created = [];
    }

    async createRecord(table, data) {
        const response = await this.request.post(`/api/now/table/${table}`, {
            data: data
        });
        const result = await response.json();
        this.created.push({ table, sys_id: result.result.sys_id });
        return result.result;
    }

    async cleanup() {
        // FIFO cleanup
        for (const record of this.created.reverse()) {
            await this.request.delete(
                `/api/now/table/${record.table}/${record.sys_id}`
            );
        }
    }
}
```

### Cleanup Pattern

```javascript
test.afterAll(async ({ request }) => {
    await factory.cleanup();
});
```

## ACL Boundary Testing

Test that unauthorized users cannot access restricted resources:

```javascript
test('viewer cannot edit admin-only field', async ({ viewerPage }) => {
    await viewerPage.goto(`/nav_to.do?uri=my_table.do?sys_id=${recordId}`);
    const field = viewerPage.locator('#admin_notes');
    await expect(field).toBeDisabled();
});
```

## Test File Organization

```
tests/
├── helpers/
│   ├── fixtures.js         # Custom test fixtures
│   ├── entity-factory.js   # Test data creation/cleanup
│   └── feature-helpers.js  # Feature-specific utilities
├── auth/
│   ├── admin.json          # Pre-authenticated state
│   └── user.json
├── feature-a/
│   ├── core-workflow.spec.js
│   └── acl-boundaries.spec.js
└── feature-b/
    └── ...
```

## What NOT to Automate

- Mobile-specific interactions (test manually)
- Cross-application boundaries (test at integration level)
- Visual regression of platform UI (ServiceNow owns this)
- Performance benchmarks (use dedicated tools)

## Test Data Factories for Complex Dependencies

When tests require interconnected records across multiple tables (e.g., a visit with invitations and registrations), use factory functions that create the full dependency chain and track every record for cleanup.

```javascript
async function createUpcomingVisit({ description, host, location, visitors, apiOpts, tracker }) {
    const scheduledStart = new Date(Date.now() + 86400000).toISOString();
    const visit = await createRecord('sn_wsd_visitor_visit', {
        short_description: description,
        host: host,
        location: location,
        scheduled_start: scheduledStart,
        state: 'scheduled',
    }, apiOpts);
    tracker.push({ table: 'sn_wsd_visitor_visit', sys_id: visit.sys_id });

    for (const visitor of visitors) {
        const invitation = await createRecord('sn_wsd_visitor_invitation', {
            visit: visit.sys_id,
            visitor: visitor.sys_id,
            state: 'sent',
        }, apiOpts);
        tracker.push({ table: 'sn_wsd_visitor_invitation', sys_id: invitation.sys_id });
    }

    return visit;
}
```

### Usage in Tests

```javascript
const tracker = [];

test.afterAll(async ({ request }) => {
    // Reverse order: delete children before parents
    for (const record of tracker.reverse()) {
        await deleteRecord(record.table, record.sys_id, { request });
    }
});

test('visit with multiple invitations displays correctly', async ({ adminPage, request }) => {
    const visit = await createUpcomingVisit({
        description: 'E2E Test Visit',
        host: hostSysId,
        location: locationSysId,
        visitors: [visitor1, visitor2],
        apiOpts: { request },
        tracker,
    });
    await adminPage.goto(`/now/wsd/visit/${visit.sys_id}`);
    // ... assertions ...
});
```

### Key Principles

- Always push to the tracker immediately after creation, before any assertions that might fail.
- Delete in reverse order so child records are removed before parent records.
- Pass the tracker into factory functions rather than using a global, so parallel test suites do not interfere.

## Authentication: storageState Setup and Role Fixtures

Pre-authenticated browser contexts avoid login overhead on every test. Save browser state once per role, then reuse it.

### Global Setup for storageState

```javascript
// global-setup.js
import { chromium } from '@playwright/test';

async function globalSetup() {
    const browser = await chromium.launch();

    for (const { username, password, file } of [
        { username: 'admin', password: process.env.ADMIN_PASS, file: 'auth/admin.json' },
        { username: 'wsd.operator', password: process.env.OPERATOR_PASS, file: 'auth/operator.json' },
        { username: 'wsd.viewer', password: process.env.VIEWER_PASS, file: 'auth/viewer.json' },
    ]) {
        const context = await browser.newContext();
        const page = await context.newPage();
        await page.goto('/login.do');
        await page.fill('#user_name', username);
        await page.fill('#user_password', password);
        await page.click('#sysverb_login');
        await page.waitForURL('**/now/**');
        await context.storageState({ path: file });
        await context.close();
    }

    await browser.close();
}

export default globalSetup;
```

### OTP Authentication Flows

If the instance requires multi-factor authentication, handle the OTP step after initial login:

```javascript
await page.click('#sysverb_login');
// Handle OTP if prompted
if (await page.locator('#otp_input').isVisible({ timeout: 3000 }).catch(() => false)) {
    const otp = generateOTP(process.env.OTP_SECRET);
    await page.fill('#otp_input', otp);
    await page.click('#verify_otp');
}
await page.waitForURL('**/now/**');
```

### Role Fixtures

```javascript
export const test = base.extend({
    adminPage: async ({ browser }, use) => {
        const ctx = await browser.newContext({ storageState: 'auth/admin.json' });
        await use(await ctx.newPage());
        await ctx.close();
    },
    operatorPage: async ({ browser }, use) => {
        const ctx = await browser.newContext({ storageState: 'auth/operator.json' });
        await use(await ctx.newPage());
        await ctx.close();
    },
    viewerPage: async ({ browser }, use) => {
        const ctx = await browser.newContext({ storageState: 'auth/viewer.json' });
        await use(await ctx.newPage());
        await ctx.close();
    },
});
```

## Handling Business Rule State Constraints

Business Rules often enforce state machine transitions (e.g., a visit cannot be created directly in `checked_in` state). When your test needs a record in a specific state, use two-step creation: create in a valid initial state, then update to the target state.

```javascript
async function createVisitInState(targetState, { request, tracker }) {
    // Step 1: Create in valid initial state
    const visit = await createRecord('sn_wsd_visitor_visit', {
        short_description: 'State test visit',
        host: hostSysId,
        state: 'scheduled', // BR allows creation only in 'scheduled'
    }, { request });
    tracker.push({ table: 'sn_wsd_visitor_visit', sys_id: visit.sys_id });

    // Step 2: Walk through required state transitions
    if (targetState === 'checked_in' || targetState === 'completed') {
        await updateRecord('sn_wsd_visitor_visit', visit.sys_id, {
            state: 'checked_in',
        }, { request });
    }
    if (targetState === 'completed') {
        await updateRecord('sn_wsd_visitor_visit', visit.sys_id, {
            state: 'completed',
        }, { request });
    }

    return visit;
}
```

### When to Use This Pattern

- The record has a `state` field governed by Business Rules
- Direct creation in the target state fails silently or throws an error
- You need records in multiple states for the same test suite (e.g., testing a list filter)

## Caching vs Fresh Data

Some test data is expensive to create or rarely changes (locations, groups, standard users). Cache these across tests. Other data should be created fresh per test to avoid interference.

### When to Cache

| Data Type | Cache? | Reason |
|-----------|--------|--------|
| Locations, buildings | Yes | Rarely change, expensive to create |
| Standard users/groups | Yes | Shared reference data |
| Lookup table values | Yes | Static configuration |
| Visit records | No | Test-specific, state matters |
| Invitations | No | Tied to specific visit |
| Approval records | No | State transitions are test-specific |

### Cache Pattern

```javascript
let cachedLocation = null;

async function getTestLocation({ request }) {
    if (cachedLocation) return cachedLocation;

    // Check if it already exists
    const existing = await queryRecords('cmn_location', {
        name: 'E2E Test Location',
    }, { request });

    if (existing.length > 0) {
        cachedLocation = existing[0];
        return cachedLocation;
    }

    // Create and cache
    cachedLocation = await createRecord('cmn_location', {
        name: 'E2E Test Location',
        city: 'Test City',
    }, { request });
    return cachedLocation;
}
```

### Cleanup Implications

Cached records are shared across tests, so do not delete them in `afterEach`. Instead, clean up cached records in `afterAll` of the outermost test suite, or leave them for the next test run (if they use `INSERT_OR_UPDATE` semantics via unique identifiers).

## Using the wsd-ui-test API Helpers

The standard test library provides `queryRecords`, `createRecord`, and `deleteRecord` helpers that wrap the ServiceNow REST API with consistent error handling.

### queryRecords

```javascript
const visitors = await queryRecords('sn_wsd_visitor_visitor', {
    email: 'test@example.com',
    active: 'true',
}, { request });

// Returns array of result objects
expect(visitors.length).toBeGreaterThan(0);
```

### createRecord

```javascript
const visit = await createRecord('sn_wsd_visitor_visit', {
    short_description: 'Test Visit',
    host: hostSysId,
    location: locationSysId,
    state: 'scheduled',
}, { request });

// Returns the created record with sys_id
expect(visit.sys_id).toBeDefined();
```

### deleteRecord

```javascript
await deleteRecord('sn_wsd_visitor_visit', visit.sys_id, { request });
```

### Combining Helpers in Test Setup

```javascript
test.describe('Visit management', () => {
    const tracker = [];
    let testVisit;

    test.beforeAll(async ({ request }) => {
        testVisit = await createRecord('sn_wsd_visitor_visit', {
            short_description: 'Suite setup visit',
            state: 'scheduled',
        }, { request });
        tracker.push({ table: 'sn_wsd_visitor_visit', sys_id: testVisit.sys_id });
    });

    test.afterAll(async ({ request }) => {
        for (const record of tracker.reverse()) {
            await deleteRecord(record.table, record.sys_id, { request });
        }
    });

    test('displays visit details', async ({ adminPage }) => {
        await adminPage.goto(`/now/wsd/visit/${testVisit.sys_id}`);
        // ... assertions ...
    });
});
```

## Task Types This Doc Supports

- Generating Playwright e2e test suites
- Writing ACL boundary tests
- Setting up test data factories
- Creating pre-authenticated test fixtures
- Building complex test data with multi-table dependencies
- Handling Business Rule state machine constraints in test data
- Caching expensive test data across tests
- Using wsd-ui-test API helpers
- Code reviews of e2e tests
