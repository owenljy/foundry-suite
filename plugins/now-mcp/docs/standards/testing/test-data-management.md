# Test Data Management

## When to use this doc

Load this when setting up test data for unit tests (Grit), e2e tests (Playwright), or demo data for application deployment. Covers data isolation, cleanup patterns, and the demo data XML format.

## Unit Test Data (Grit)

### Insert Pattern

```javascript
grit.insert('my_table', ['name', 'active', 'state'], {
    'record1': ['Record One', true, 'active'],
    'record2': ['Record Two', false, 'inactive'],
});
```

First key in each row becomes the `sys_id`. See `testing/atf-patterns.md` for full Grit patterns.

### Cleanup Between Tests

```javascript
afterEach(() => {
    Object.keys(grit.data.tables).forEach((table) => {
        grit.data.tables[table] = {};
    });
});
```

## E2E Test Data (API-driven)

Create records via REST API, track for cleanup:

```javascript
const factory = new EntityFactory(request);
const record = await factory.createRecord('incident', {
    short_description: 'Test incident',
    priority: 3,
});
// ... test ...
await factory.cleanup();  // Deletes in reverse order
```

See `testing/playwright-e2e.md` for full factory pattern.

## Demo Data (XML)

Demo data uses a different format than update records.

### Key Differences from Update XML

| Aspect | Update Records | Demo Data |
|--------|---------------|-----------|
| Wrapper tag | `<record_update>` | `<unload>` |
| Location | `update/` | `unload.demo/` |
| Action | `INSERT_OR_UPDATE` | `INSERT_OR_UPDATE` |
| Deployed with | `deploy` | `deploy` |

### Demo User Pattern

```xml
<unload unload_date="2024-05-30 15:45:07">
<sys_user action="INSERT_OR_UPDATE">
  <active>true</active>
  <email>myapp.admin@example.com</email>
  <first_name>MyApp</first_name>
  <last_name>Admin</last_name>
  <name>MyApp Admin</name>
  <user_name>myapp.admin</user_name>
</sys_user>
</unload>
```

### Demo Role Assignment

```xml
<unload unload_date="2024-05-30 15:45:07">
<sys_user_has_role action="INSERT_OR_UPDATE">
  <granted_by display_value="">not-applicable</granted_by>
  <inherited>false</inherited>
  <role display_value="sn_myapp.admin" name="sn_myapp.admin">{role_sys_id}</role>
  <state>active</state>
  <user display_value="MyApp Admin">{user_sys_id}</user>
</sys_user_has_role>
</unload>
```

### Demo User Naming Convention

| User | Pattern |
|------|---------|
| Admin | `{app}.admin` / `myapp.admin@example.com` |
| Operator | `{app}.operator` / `myapp.operator@example.com` |
| User | `{app}.user` / `myapp.user@example.com` |
| Viewer | `{app}.viewer` / `myapp.viewer@example.com` |

### Reference Fields in Demo Data

Include `display_value` attribute for readability:

```xml
<location display_value="Floor 1">{location_sys_id}</location>
<managed_by display_value="Operators">{group_sys_id}</managed_by>
```

## Data Isolation Principles

1. **Tests should not depend on each other** — Each test creates its own data
2. **Clean up after yourself** — Delete created records in afterEach/afterAll
3. **Use unique identifiers** — Include test run ID in record names to avoid collisions
4. **Don't rely on demo data in tests** — Demo data may not be deployed in all environments

## Business Rule State Machine Workarounds

Business Rules often enforce state transitions, preventing records from being created directly in certain states. For example, a visit record might only allow creation in `scheduled` state, while your test needs a `completed` visit.

### Pattern: Create in Valid Initial State, Then Update

```javascript
// Unit test (Grit) — no BRs enforced, so direct insert works
grit.insert('sn_wsd_visitor_visit', ['state', 'host', 'active'], {
    'visit1': ['completed', 'user1', true],  // Grit has no BR enforcement
});

// E2E test (API) — BRs ARE enforced, so use two-step creation
const visit = await createRecord('sn_wsd_visitor_visit', {
    short_description: 'Test visit',
    state: 'scheduled',  // Step 1: valid initial state
}, { request });

await updateRecord('sn_wsd_visitor_visit', visit.sys_id, {
    state: 'checked_in',  // Step 2: transition to next valid state
}, { request });

await updateRecord('sn_wsd_visitor_visit', visit.sys_id, {
    state: 'completed',   // Step 3: transition to target state
}, { request });
```

### When This Applies

- Any table with `state` or `stage` fields governed by Business Rules
- Records where certain field combinations are only valid in specific states
- Tables with "before insert" BRs that force default field values

### Integration Tests

Java integration tests also hit live BRs. Use the same two-step approach via `GlideScopedEvaluator`:

```java
String createScript = "var gr = new GlideRecord('sn_wsd_visitor_visit');"
    + "gr.initialize();"
    + "gr.setValue('state', 'scheduled');"
    + "gr.insert();";
String sysId = evalScript(createScript);

String updateScript = "var gr = new GlideRecord('sn_wsd_visitor_visit');"
    + "gr.get('" + sysId + "');"
    + "gr.setValue('state', 'completed');"
    + "gr.update();";
evalScript(updateScript);
```

## Test Data Caching

For data that is expensive to create or rarely changes (locations, buildings, standard user groups), cache it across tests rather than recreating for each test case.

### When to Cache vs Create Fresh

| Cache | Create Fresh |
|-------|-------------|
| Locations, buildings, floors | Visit records |
| Standard user groups | Invitations, registrations |
| Lookup/reference table values | Records with state fields |
| System properties (read-only) | Approval records |

### Caching Pattern

```javascript
// Module-level variable, populated on first use
let cachedLocation = null;

async function getTestLocation({ request }) {
    if (cachedLocation) return cachedLocation;

    // Try to find existing
    const existing = await queryRecords('cmn_location', {
        name: 'E2E Test Location',
    }, { request });

    if (existing.length > 0) {
        cachedLocation = existing[0];
        return cachedLocation;
    }

    // Create and cache for subsequent tests
    cachedLocation = await createRecord('cmn_location', {
        name: 'E2E Test Location',
        city: 'Test City',
        country: 'US',
    }, { request });
    return cachedLocation;
}
```

### Grit Caching (Unit Tests)

In Grit, you can insert shared reference data once in a top-level `before()` (not `beforeEach`) to avoid reinserting every test:

```javascript
before(() => {
    grit.insert('sys_user', ['user_name', 'first_name', 'last_name', 'active'], {
        'admin_user': ['admin', 'System', 'Administrator', true],
        'operator_user': ['operator', 'Test', 'Operator', true],
    });
});

afterEach(() => {
    // Only clear app-specific tables, not the shared reference data
    grit.data.tables['sn_wsd_visitor_visit'] = {};
    grit.data.tables['sn_wsd_visitor_invitation'] = {};
    // Leave sys_user intact
});
```

### Cleanup Implications

- Do not delete cached records in `afterEach` — they are shared across tests.
- Clean up cached records in `afterAll` of the outermost suite, or use unique naming (e.g., `E2E Test Location`) so the same record can be reused across runs.
- If using `INSERT_OR_UPDATE` semantics via deterministic sys_ids, the record persists between runs without duplication.

## Creating Interconnected Test Data

When test records have multi-table dependencies (parent, children, grandchildren), create them in dependency order and track all sys_ids for cleanup. Delete in reverse order.

### Dependency Chain Example

A visitor visit has invitations, which have registrations:

```
sn_wsd_visitor_visit (parent)
  └── sn_wsd_visitor_invitation (child, references visit)
        └── sn_wsd_visitor_registration (grandchild, references invitation)
```

### Creation Pattern

```javascript
const tracker = [];

async function createVisitWithInvitations({ host, location, visitors, request }) {
    // 1. Create parent
    const visit = await createRecord('sn_wsd_visitor_visit', {
        short_description: 'Interconnected test visit',
        host: host,
        location: location,
        state: 'scheduled',
    }, { request });
    tracker.push({ table: 'sn_wsd_visitor_visit', sys_id: visit.sys_id });

    // 2. Create children (reference parent)
    for (const visitor of visitors) {
        const invitation = await createRecord('sn_wsd_visitor_invitation', {
            visit: visit.sys_id,
            visitor: visitor.sys_id,
            state: 'sent',
        }, { request });
        tracker.push({ table: 'sn_wsd_visitor_invitation', sys_id: invitation.sys_id });

        // 3. Create grandchildren (reference child)
        const registration = await createRecord('sn_wsd_visitor_registration', {
            invitation: invitation.sys_id,
            status: 'pending',
        }, { request });
        tracker.push({ table: 'sn_wsd_visitor_registration', sys_id: registration.sys_id });
    }

    return visit;
}
```

### Reverse-Order Deletion

```javascript
afterAll(async ({ request }) => {
    // tracker order: visit, invitation1, registration1, invitation2, registration2
    // reverse: registration2, invitation2, registration1, invitation1, visit
    for (const record of tracker.reverse()) {
        await deleteRecord(record.table, record.sys_id, { request });
    }
});
```

### Grit Pattern (Unit Tests)

In Grit, insertion order matters for reference integrity. Insert parent records first:

```javascript
// 1. Users (referenced by visits and invitations)
grit.insert('sys_user', ['user_name', 'active'], {
    'host1': ['test.host', true],
    'visitor1': ['test.visitor', true],
});

// 2. Visits (reference users)
grit.insert('sn_wsd_visitor_visit', ['host', 'state'], {
    'visit1': ['host1', 'scheduled'],
});

// 3. Invitations (reference visits and users)
grit.insert('sn_wsd_visitor_invitation', ['visit', 'visitor', 'state'], {
    'inv1': ['visit1', 'visitor1', 'sent'],
});
```

### Key Principles

- Always track every created record, including intermediate/join records.
- Push to the tracker immediately after creation, before any assertions that might fail mid-test.
- Delete in reverse order to respect foreign key constraints.
- In Grit, clearing all tables in `afterEach` avoids ordering concerns entirely.

## Task Types This Doc Supports

- Setting up unit test data with Grit
- Creating e2e test data factories
- Building demo data for application deployment
- Creating demo users with role assignments
- Data isolation and cleanup strategies
- Working around Business Rule state machine constraints
- Caching expensive test data across test suites
- Creating and cleaning up interconnected multi-table test data
