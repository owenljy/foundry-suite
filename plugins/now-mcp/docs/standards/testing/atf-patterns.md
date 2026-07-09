# Unit Testing with Grit

## When to use this doc

Load this when writing unit tests for Script Includes using the Grit testing framework, or when setting up test infrastructure (schemas, mocks, utilities).

## Imports

```javascript
import { createSandbox, loadJsSource } from 'now-unit';
import sinon from 'sinon';
import chai from 'chai';
import Grit from '@servicenow/grit';
import { FieldType } from '@servicenow/grit/lib/TestData';
const expect = chai.expect;
```

## Test File Structure

```javascript
let sandbox, grit, sut;  // sut = system under test

describe('MyScriptInclude', () => {
    beforeEach(() => {
        // 1. Create Grit instance and inject schemas
        grit = new Grit();
        injectTableSchemas(grit);
        
        // 2. Create sandbox
        sandbox = createSandbox();
        
        // 3. Mock global objects
        sandbox.gs = {
            nil: (value) => !value && value !== 0 && value !== '' && value !== false,
            getMessage: (msg) => msg,
            getUserID: () => 'currentUserId',
            getProperty: (prop, defaultValue) => defaultValue,
            addErrorMessage: sinon.stub(),
            eventQueue: sinon.spy(),
            info: sinon.stub(),
            error: sinon.stub(),
        };
        
        // 4. Assign Grit classes to sandbox
        sandbox.GlideRecord = grit.grClass;
        sandbox.GlideDateTime = grit.gdtClass;
        sandbox.GlideDate = grit.gdClass;
        sandbox.GlideAggregate = grit.gaClass;
        
        // 5. Load script includes (order matters for dependencies)
        loadJsSource('com.sn_myapp/update/MyServiceSNC.js', sandbox);
        loadJsSource('com.sn_myapp/update/MyService.js', sandbox);
        
        // 6. Create instance
        sut = new sandbox.MyService();
        
        // 7. Insert test data
        grit.insert('my_table', ['name', 'active', 'state'], {
            'record1': ['Record One', true, 'active'],
            'record2': ['Record Two', false, 'inactive'],
        });
    });

    afterEach(() => {
        Object.keys(grit.data.tables).forEach((table) => {
            grit.data.tables[table] = {};
        });
    });

    describe('myMethod()', () => {
        it('should return record when found', () => {
            const result = sut.myMethod('record1');
            expect(result).to.not.be.null;
            expect(result.getValue('name')).to.equal('Record One');
        });

        it('should return null when not found', () => {
            const result = sut.myMethod('nonexistent');
            expect(result).to.be.null;
        });
    });
});
```

## Table Schema Definition

Create shared schemas in `utils.js`:

```javascript
import { FieldType } from "@servicenow/grit/lib/TestData";

export function injectTableSchemas(grit) {
    grit.setSchema('table_name', [
        { name: 'name', colType: FieldType.String },
        { name: 'active', colType: FieldType.Boolean },
        { name: 'count', colType: FieldType.Integer },
        { name: 'created_on', colType: FieldType.GlideDateTime },
        { name: 'user', colType: FieldType.GUID, foreign: 'sys_user' },
        { name: 'sys_domain', colType: FieldType.DomainID },
    ], undefined);
}
```

### Field Types

| FieldType | Use For |
|-----------|---------|
| `FieldType.String` | Text fields |
| `FieldType.Boolean` | Boolean fields |
| `FieldType.Integer` | Integer fields |
| `FieldType.GUID` | Reference fields (add `foreign: 'table_name'`) |
| `FieldType.GlideDateTime` | Date/time fields |
| `FieldType.GlideDate` | Date only fields |
| `FieldType.DomainID` | sys_domain fields |
| `FieldType.TranslatedText` | Translated text fields |

## Inserting Test Data

```javascript
grit.insert('table_name', 
    ['field1', 'field2', 'reference_field'], 
    {
        'sys_id_1': ['value1', 'value2', 'ref_sys_id'],
        'sys_id_2': ['value3', 'value4', 'ref_sys_id_2'],
    }
);
```

First parameter in each row becomes the `sys_id`.

## Mocking Patterns

### External Script Includes

```javascript
sandbox.MyUtils = {
    nullOrEmpty: sinon.stub(),
    formatString: sinon.spy((format, ...args) => {
        if (!format) return '';
        return format.replace(/{(\d+)}/g, (match, index) => 
            typeof args[index] !== 'undefined' ? args[index] : match
        );
    }),
};
sandbox.MyUtils.nullOrEmpty.withArgs(null).returns(true);
sandbox.MyUtils.nullOrEmpty.withArgs('value').returns(false);
```

### GlidePluginManager

```javascript
sandbox.GlidePluginManager = {
    isActive: sinon.stub().returns(false),
};
sandbox.GlidePluginManager.isActive.withArgs('com.sn_wsd_rsv').returns(true);
```

### Application Constants

```javascript
sandbox.WPConstants = {
    TABLES: { MY_TABLE: 'sn_myapp_record' },
    STATES: { ACTIVE: 'active', INACTIVE: 'inactive' },
};
```

### Scoped Namespaces

```javascript
sandbox.sn_myapp = {
    MyConstants: sandbox.MyConstants,
    MyUtils: sandbox.MyUtils,
};
```

### REST API Error Classes

```javascript
sandbox.sn_ws_err = {
    BadRequestError: class { constructor(msg) { this.message = msg; } },
    NotFoundError: class { constructor(msg) { this.message = msg; } },
};
```

### Reference Fields

```javascript
grit.insert('sys_user', ['name', 'email'], {
    'user1': ['John Doe', 'john@example.com'],
});
grit.insert('my_table', ['name', 'assigned_to'], {
    'record1': ['Task', 'user1'],
});

const gr = new sandbox.GlideRecord('my_table');
gr.get('record1');
const userGr = gr.assigned_to.getRefRecord();
expect(userGr.getValue('name')).to.equal('John Doe');
```

### Manual Mock for Complex Cases

```javascript
const mockRecord = {
    getValue: sinon.stub(),
    setValue: sinon.stub(),
    isValidRecord: sinon.stub().returns(true),
    location: {
        nil: sinon.stub().returns(false),
        getRefRecord: sinon.stub().returns({ /* mock */ }),
        getDisplayValue: sinon.stub().returns('New York'),
    },
};
mockRecord.getValue.withArgs('sys_id').returns('record_sys_id');
```

## Assertion Patterns

### Chai

```javascript
expect(result).to.equal('value');           // Strict equality
expect(result).to.deep.equal({ key: 'v' }); // Deep equality
expect(result).to.be.true;
expect(result).to.be.null;
expect(result).to.be.a('string');
expect(array).to.have.lengthOf(3);
expect(array).to.include('item');
expect(obj).to.have.property('key', 'value');
expect(str).to.match(/pattern/);
```

### Sinon

```javascript
sinon.assert.calledOnce(spy);
sinon.assert.calledWith(spy, 'arg1', 'arg2');
sinon.assert.neverCalledWith(spy, 'arg');
sinon.assert.callOrder(spy1, spy2);
```

### Error Assertions

```javascript
expect(() => sut.methodThatThrows(null)).to.throw('Expected error message');
expect(() => sut.validMethod('ok')).to.not.throw();
```

## Cleanup Between Tests

```javascript
afterEach(() => {
    // Clear all Grit data
    Object.keys(grit.data.tables).forEach((table) => {
        grit.data.tables[table] = {};
    });
    // Reset spies
    sandbox.gs.eventQueue.resetHistory();
    sandbox.gs.error.resetHistory();
});
```

## Loading Conditional Script Includes

For scripts with plugin dependencies:

```javascript
loadJsSource('com.sn_myapp/if/com.sn_other/update/MyService.js', sandbox);
```

## Test File Organization

```
src/test/js/
├── utils.js              # Shared test utilities and mocks
├── schemas.js            # Table schema definitions for Grit
├── MyService_spec.js
├── AnotherService_spec.js
└── ...
```

## Running Tests

```bash
npm run test
```

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Not setting up `gs` before `loadJsSource` | Mock `gs` in sandbox BEFORE loading scripts |
| Missing table schema in Grit | `setSchema()` for every table your code queries |
| Not clearing Grit data in afterEach | Stale data causes test order dependencies |
| Loading scripts in wrong order | Dependencies must be loaded before dependents |
| Forgetting to mock scoped namespaces | If code uses `sn_myapp.MyUtil`, mock the namespace |

## Advanced Mocking: Custom GlideRecord Overrides

When Grit's built-in `GlideRecord` does not support the behavior you need to test (e.g., `canWrite()`, `canRead()`, `isValidRecord()`), temporarily replace `sandbox.GlideRecord` with a manual mock. Always restore the original after the test.

```javascript
it('should handle record with write permission', () => {
    const originalGlideRecord = sandbox.GlideRecord;
    sandbox.GlideRecord = function(tableName) {
        return {
            get: function() { return true; },
            canWrite: function() { return true; },
            getValue: sinon.stub(),
            setValue: sinon.stub(),
            update: function() { return true; }
        };
    };

    const result = sut.updateRecord('some_sys_id', { name: 'Updated' });
    expect(result.success).to.be.true;

    sandbox.GlideRecord = originalGlideRecord; // Always restore
});
```

Use this sparingly. If Grit supports the behavior natively, prefer Grit. Manual mocks are brittle and don't validate query logic.

### Restore Pattern with try/finally

For safety, use `try/finally` to guarantee restoration even when the test throws:

```javascript
it('should handle permission denied', () => {
    const originalGlideRecord = sandbox.GlideRecord;
    try {
        sandbox.GlideRecord = function(tableName) {
            return {
                get: function() { return true; },
                canWrite: function() { return false; },
                getValue: sinon.stub().returns('some_value'),
            };
        };

        const result = sut.updateRecord('some_sys_id', { name: 'Blocked' });
        expect(result.success).to.be.false;
    } finally {
        sandbox.GlideRecord = originalGlideRecord;
    }
});
```

## Testing Result Objects and Error Paths

Many service methods return result objects with `{ success, data, error }` shapes. Test both the happy path and all error branches.

```javascript
describe('deactivateVisit()', () => {
    it('should return successful result when record exists', () => {
        grit.insert('sn_wsd_visitor_visit', ['state', 'active'], {
            'visit1': ['completed', true],
        });

        const result = sut.deactivateVisit('visit1');
        expect(result.success).to.be.true;
        expect(result.error).to.be.undefined;
    });

    it('should return unsuccessful result when record not found', () => {
        const result = sut.deactivateVisit('nonexistent');
        expect(result.success).to.be.false;
        expect(result.error).to.not.be.undefined;
    });

    it('should return unsuccessful result when record is already inactive', () => {
        grit.insert('sn_wsd_visitor_visit', ['state', 'active'], {
            'visit2': ['completed', false],
        });

        const result = sut.deactivateVisit('visit2');
        expect(result.success).to.be.false;
        expect(result.error).to.include('already inactive');
    });
});
```

### Asserting Error Messages

When testing error paths, assert on the error message content to confirm the correct branch was taken:

```javascript
expect(result.error).to.include('not found');      // Partial match
expect(result.error).to.equal('Record not found');  // Exact match
expect(result.error).to.match(/invalid .+ format/); // Regex match
```

## Testing Permission Checks

When code calls `canWrite()`, `canRead()`, or `isValidRecord()` on a GlideRecord, override the sandbox GlideRecord to control these return values.

```javascript
describe('permission boundary tests', () => {
    it('should reject update when user cannot write', () => {
        const originalGlideRecord = sandbox.GlideRecord;
        try {
            sandbox.GlideRecord = function(tableName) {
                return {
                    get: function() { return true; },
                    canWrite: function() { return false; },
                    isValidRecord: function() { return true; },
                    getValue: sinon.stub().withArgs('sys_id').returns('record1'),
                };
            };

            const result = sut.updateVisit('record1', { state: 'active' });
            expect(result.success).to.be.false;
            expect(result.error).to.include('permission');
        } finally {
            sandbox.GlideRecord = originalGlideRecord;
        }
    });

    it('should reject operation on invalid record', () => {
        const originalGlideRecord = sandbox.GlideRecord;
        try {
            sandbox.GlideRecord = function(tableName) {
                return {
                    get: function() { return true; },
                    isValidRecord: function() { return false; },
                };
            };

            const result = sut.getVisitDetails('bad_record');
            expect(result.success).to.be.false;
        } finally {
            sandbox.GlideRecord = originalGlideRecord;
        }
    });
});
```

## Testing Journal Fields

Journal fields (`comments`, `work_notes`) behave differently from regular fields. Use `getJournalEntry()` with index-based stubs to simulate journal history.

```javascript
it('should read latest journal entry', () => {
    const mockGr = {
        get: function() { return true; },
        isValidRecord: function() { return true; },
        getValue: sinon.stub(),
        getJournalEntry: sinon.stub(),
    };

    // getJournalEntry(0) returns the most recent entry
    mockGr.getJournalEntry.withArgs(0).returns('Latest comment by admin');
    // getJournalEntry(1) returns the second most recent
    mockGr.getJournalEntry.withArgs(1).returns('Previous comment by operator');

    const originalGlideRecord = sandbox.GlideRecord;
    sandbox.GlideRecord = function() { return mockGr; };

    const result = sut.getLatestComment('record1');
    expect(result).to.equal('Latest comment by admin');

    sandbox.GlideRecord = originalGlideRecord;
});
```

### Journal Field Schema

When using Grit for journal-adjacent testing, note that Grit does not natively support journal fields. For any test involving `getJournalEntry()`, you must use a manual GlideRecord override.

## Testing GlideAjax Processors

To test a Script Include that extends `AbstractAjaxProcessor`, mock the base class in the sandbox before loading the script.

```javascript
describe('MyAjaxService', () => {
    beforeEach(() => {
        // Mock AbstractAjaxProcessor
        sandbox.AbstractAjaxProcessor = {
            _params: {},
            getParameter: function(name) { return this._params[name]; },
            newItem: sinon.stub(),
        };

        sandbox.JSON = JSON;
        loadJsSource('com.sn_myapp/update/MyAjaxService.js', sandbox);
    });

    it('should return record data for valid sys_id', () => {
        grit.insert('sn_myapp_record', ['name', 'state'], {
            'rec1': ['Test', 'active'],
        });

        const sut = new sandbox.MyAjaxService();
        sut._params = {
            'sysparm_name': 'getRecordData',
            'sysparm_sys_id': 'rec1',
        };

        const result = JSON.parse(sut.getRecordData());
        expect(result.name).to.equal('Test');
    });

    it('should return error for missing record', () => {
        const sut = new sandbox.MyAjaxService();
        sut._params = {
            'sysparm_name': 'getRecordData',
            'sysparm_sys_id': 'missing',
        };

        const result = JSON.parse(sut.getRecordData());
        expect(result.error).to.not.be.undefined;
    });
});
```

For the full GlideAjax testing pattern (including parameter validation and response assertions), see `platform/glideajax-patterns.md`.

## Mocking Cross-Scope Dependencies

When the code under test calls Script Includes from another scope, mock the scoped namespace on the sandbox.

```javascript
// If code does: new sn_wsd_core.WSDCoreUtils().formatDate(gdt)
sandbox.sn_wsd_core = {
    WSDCoreUtils: function() {
        return {
            formatDate: sinon.stub().returns('2024-01-15'),
            isFeatureEnabled: sinon.stub().returns(true),
        };
    },
};

// If code does: sn_wsd_rsv.ReservationConstants.STATUS.ACTIVE
sandbox.sn_wsd_rsv = {
    ReservationConstants: {
        STATUS: { ACTIVE: 'active', CANCELLED: 'cancelled' },
        TABLES: { RESERVATION: 'sn_wsd_rsv_reservation' },
    },
};
```

### Multiple Cross-Scope Dependencies

For code that uses several external scopes, set them all up before `loadJsSource`:

```javascript
beforeEach(() => {
    // Core utilities
    sandbox.sn_wsd_core = {
        WSDCoreUtils: function() { return { formatDate: sinon.stub().returns('2024-01-15') }; },
        WSDCoreConstants: { DEFAULT_TIMEZONE: 'UTC' },
    };

    // Reservation scope
    sandbox.sn_wsd_rsv = {
        ReservationService: function() { return { checkAvailability: sinon.stub().returns(true) }; },
    };

    // Plugin check
    sandbox.GlidePluginManager = {
        isActive: sinon.stub().returns(false),
    };
    sandbox.GlidePluginManager.isActive.withArgs('com.sn_wsd_rsv').returns(true);

    loadJsSource('com.sn_wsd_visitor/update/VisitorService.js', sandbox);
});
```

## Organizing Test Schemas at Scale

As test suites grow, schema definitions become repetitive. Separate global platform schemas from application-specific schemas and share them across test files.

### Shared Schema File Structure

```
src/test/js/
├── schemas/
│   ├── global-schemas.js      # sys_user, sys_user_group, sys_journal_field, etc.
│   ├── visitor-schemas.js     # sn_wsd_visitor_visitor, sn_wsd_visitor_visit, etc.
│   └── reservation-schemas.js # sn_wsd_rsv_reservation, sn_wsd_rsv_slot, etc.
├── utils.js                   # Shared mocks and helpers
├── VisitorService_spec.js
└── ReservationService_spec.js
```

### Global Schemas (Reused Across All Test Suites)

```javascript
// schemas/global-schemas.js
import { FieldType } from "@servicenow/grit/lib/TestData";

export function injectGlobalSchemas(grit) {
    grit.setSchema('sys_user', [
        { name: 'user_name', colType: FieldType.String },
        { name: 'first_name', colType: FieldType.String },
        { name: 'last_name', colType: FieldType.String },
        { name: 'email', colType: FieldType.String },
        { name: 'active', colType: FieldType.Boolean },
    ], undefined);

    grit.setSchema('sys_user_group', [
        { name: 'name', colType: FieldType.String },
        { name: 'manager', colType: FieldType.GUID, foreign: 'sys_user' },
        { name: 'active', colType: FieldType.Boolean },
    ], undefined);

    grit.setSchema('sys_journal_field', [
        { name: 'element', colType: FieldType.String },
        { name: 'element_id', colType: FieldType.String },
        { name: 'value', colType: FieldType.String },
        { name: 'name', colType: FieldType.String },
    ], undefined);
}
```

### App-Specific Schemas

```javascript
// schemas/visitor-schemas.js
import { FieldType } from "@servicenow/grit/lib/TestData";

export function injectVisitorSchemas(grit) {
    grit.setSchema('sn_wsd_visitor_visitor', [
        { name: 'first_name', colType: FieldType.String },
        { name: 'last_name', colType: FieldType.String },
        { name: 'email', colType: FieldType.String },
        { name: 'company', colType: FieldType.String },
        { name: 'active', colType: FieldType.Boolean },
    ], undefined);

    grit.setSchema('sn_wsd_visitor_visit', [
        { name: 'visitor', colType: FieldType.GUID, foreign: 'sn_wsd_visitor_visitor' },
        { name: 'host', colType: FieldType.GUID, foreign: 'sys_user' },
        { name: 'state', colType: FieldType.String },
        { name: 'scheduled_start', colType: FieldType.GlideDateTime },
    ], undefined);
}
```

### Composing Schemas in Tests

```javascript
import { injectGlobalSchemas } from './schemas/global-schemas.js';
import { injectVisitorSchemas } from './schemas/visitor-schemas.js';

beforeEach(() => {
    grit = new Grit();
    injectGlobalSchemas(grit);
    injectVisitorSchemas(grit);
    // ... rest of setup
});
```

This avoids duplicating schema definitions and ensures all test suites use the same field types for shared tables like `sys_user`.

## Task Types This Doc Supports

- Writing unit tests for Script Includes
- Setting up test infrastructure (schemas, mocks)
- Mocking ServiceNow platform classes (GlideRecord, GlideDateTime, etc.)
- Testing GlideAjax processors
- Advanced mocking with custom GlideRecord overrides
- Testing result objects and error paths
- Testing permission checks (canWrite, canRead, isValidRecord)
- Testing journal field behavior
- Mocking cross-scope dependencies
- Organizing shared test schemas at scale
- Code reviews of test files
