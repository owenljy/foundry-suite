# GlideAjax Patterns

## When to use this doc

Load this when building or reviewing GlideAjax endpoints (client-callable Script Includes) or the client-side code that calls them. This doc covers the full round-trip: server-side AbstractAjaxProcessor, client-side GlideAjax calls, parameter conventions, JSON responses, error handling, and unit testing.

For the broader Script Include patterns (non-Ajax), see `platform/script-includes.md`. For client-side form logic, see `platform/client-scripts.md`.

## Server-Side: AbstractAjaxProcessor

Client-callable Script Includes extend `AbstractAjaxProcessor`. The record must have `access=public` and `client_callable=true`.

```javascript
var MyAjaxService = Class.create();
MyAjaxService.prototype = Object.extendsObject(AbstractAjaxProcessor, {

    getRecordDetails: function() {
        var sysId = this.getParameter('sysparm_sys_id');
        var gr = new GlideRecord('sn_myapp_record');
        if (gr.get(sysId)) {
            return JSON.stringify({
                name: gr.getValue('name'),
                state: gr.getValue('state'),
                active: gr.getValue('active') === 'true'
            });
        }
        return JSON.stringify({ error: 'Record not found' });
    },

    validateInput: function() {
        var email = this.getParameter('sysparm_email');
        var isValid = new sn_myapp.MyUtils().isValidEmail(email);
        return JSON.stringify({ valid: isValid });
    },

    // Underscore prefix = private, NOT callable from client
    _lookupUser: function(userId) {
        var gr = new GlideRecord('sys_user');
        if (gr.get(userId)) return gr;
        return null;
    },

    type: 'MyAjaxService'
});
```

### Key Rules

- Methods without an underscore prefix are callable from the client.
- Methods with an underscore prefix (`_helper`) are private and cannot be invoked via GlideAjax.
- The `type` property must match the class name exactly.
- Always use `this.getParameter()` to read incoming parameters.
- Return values must be strings. Use `JSON.stringify()` for structured data.

### Using newItem for Multiple Return Values

For returning multiple discrete values (not a JSON blob), use `this.newItem()`:

```javascript
getMultipleValues: function() {
    var item = this.newItem('result');
    item.setAttribute('name', 'John Doe');
    item.setAttribute('department', 'IT');
    item.setAttribute('active', 'true');
}
```

## Client-Side: GlideAjax Calls

### Asynchronous (Recommended)

```javascript
var ga = new GlideAjax('sn_myapp.MyAjaxService');
ga.addParam('sysparm_name', 'getRecordDetails');
ga.addParam('sysparm_sys_id', g_form.getUniqueValue());
ga.getXMLAnswer(function(answer) {
    var result = JSON.parse(answer);
    if (result.error) {
        g_form.addErrorMessage(result.error);
        return;
    }
    g_form.setValue('name', result.name);
});
```

### Synchronous (Use Sparingly)

Synchronous calls block the browser UI thread. Only use when the result is needed before the script can proceed (e.g., onSubmit validation that must return true/false).

```javascript
var ga = new GlideAjax('sn_myapp.MyAjaxService');
ga.addParam('sysparm_name', 'validateInput');
ga.addParam('sysparm_email', g_form.getValue('email'));
var answer = ga.getXMLWait();
var result = JSON.parse(answer);
if (!result.valid) {
    g_form.addErrorMessage('Invalid email address');
    return false;
}
```

### Method Reference

| Client Method | Description |
|---------------|-------------|
| `ga.addParam('name', 'value')` | Add a parameter to the request |
| `ga.getXMLAnswer(callback)` | Async call — callback receives the return string |
| `ga.getXMLWait()` | Sync call — returns the string directly (blocks UI) |

| Server Method | Description |
|---------------|-------------|
| `this.getParameter('sysparm_name')` | Read a parameter sent from the client |
| `this.newItem('name')` | Create a named response item for multi-value returns |
| `return value` | Return a string value to the client |

## Parameter Passing Conventions

All parameters use the `sysparm_` prefix by convention:

| Parameter | Purpose |
|-----------|---------|
| `sysparm_name` | **Required.** The server-side method to invoke |
| `sysparm_sys_id` | Common: pass a record sys_id |
| `sysparm_table` | Common: pass a table name |
| `sysparm_value` | Common: pass a single value |
| `sysparm_*` | Custom: any additional parameters your method needs |

The `sysparm_name` parameter is mandatory. It tells the AbstractAjaxProcessor which method to call. Omitting it results in no method being executed.

```javascript
// Client
ga.addParam('sysparm_name', 'getRecordDetails');  // Required
ga.addParam('sysparm_sys_id', sysId);              // Custom
ga.addParam('sysparm_include_inactive', 'true');   // Custom
```

```javascript
// Server
var methodName = this.getParameter('sysparm_name');       // 'getRecordDetails'
var sysId = this.getParameter('sysparm_sys_id');           // The sys_id value
var includeInactive = this.getParameter('sysparm_include_inactive'); // 'true'
```

## JSON Response Patterns

### Simple Success/Error

```javascript
// Server
getRecordData: function() {
    try {
        var sysId = this.getParameter('sysparm_sys_id');
        var gr = new GlideRecord('sn_myapp_record');
        if (!gr.get(sysId)) {
            return JSON.stringify({ success: false, error: 'Record not found' });
        }
        return JSON.stringify({
            success: true,
            data: {
                sys_id: gr.getUniqueValue(),
                name: gr.getValue('name'),
                state: gr.getValue('state')
            }
        });
    } catch (e) {
        gs.error('MyAjaxService.getRecordData: ' + e.message);
        return JSON.stringify({ success: false, error: 'Server error' });
    }
}
```

```javascript
// Client
ga.getXMLAnswer(function(answer) {
    var result = JSON.parse(answer);
    if (!result.success) {
        g_form.addErrorMessage(result.error);
        return;
    }
    g_form.setValue('name', result.data.name);
});
```

### Array Response

```javascript
// Server
getAvailableSlots: function() {
    var locationId = this.getParameter('sysparm_location');
    var slots = [];
    var gr = new GlideRecord('sn_myapp_slot');
    gr.addQuery('location', locationId);
    gr.addQuery('available', true);
    gr.query();
    while (gr.next()) {
        slots.push({
            sys_id: gr.getUniqueValue(),
            label: gr.getDisplayValue('time_slot')
        });
    }
    return JSON.stringify(slots);
}
```

## Error Handling

### Server-Side

Always wrap logic in try/catch and return structured errors:

```javascript
performAction: function() {
    try {
        var sysId = this.getParameter('sysparm_sys_id');
        if (!sysId) {
            return JSON.stringify({ success: false, error: 'Missing required parameter: sysparm_sys_id' });
        }
        // ... business logic ...
        return JSON.stringify({ success: true });
    } catch (e) {
        gs.error('MyAjaxService.performAction: ' + e.message);
        return JSON.stringify({ success: false, error: 'An unexpected error occurred' });
    }
}
```

### Client-Side

Check for null/empty responses and parse errors:

```javascript
ga.getXMLAnswer(function(answer) {
    if (!answer) {
        g_form.addErrorMessage('No response from server');
        return;
    }
    try {
        var result = JSON.parse(answer);
    } catch (e) {
        g_form.addErrorMessage('Invalid server response');
        return;
    }
    if (!result.success) {
        g_form.addErrorMessage(result.error || 'Unknown error');
        return;
    }
    // Process result.data
});
```

## Unit Testing Ajax Processors

Test GlideAjax processors in Grit by mocking the `AbstractAjaxProcessor` base class in the sandbox.

### Sandbox Setup

```javascript
let sandbox, grit, sut;

beforeEach(() => {
    grit = new Grit();
    injectTableSchemas(grit);
    sandbox = createSandbox();

    // Mock gs
    sandbox.gs = {
        nil: (value) => !value,
        error: sinon.stub(),
        info: sinon.stub(),
    };

    // Mock AbstractAjaxProcessor
    sandbox.AbstractAjaxProcessor = {
        _params: {},
        getParameter: function(name) { return this._params[name]; },
        newItem: sinon.stub(),
    };

    sandbox.GlideRecord = grit.grClass;
    sandbox.JSON = JSON;

    loadJsSource('com.sn_myapp/update/MyAjaxService.js', sandbox);
});
```

### Setting Parameters and Invoking Methods

```javascript
it('should return record details for valid sys_id', () => {
    grit.insert('sn_myapp_record', ['name', 'state'], {
        'record1': ['Test Record', 'active'],
    });

    sut = new sandbox.MyAjaxService();
    sut._params = {
        'sysparm_name': 'getRecordDetails',
        'sysparm_sys_id': 'record1',
    };

    var result = JSON.parse(sut.getRecordDetails());
    expect(result.name).to.equal('Test Record');
    expect(result.state).to.equal('active');
});

it('should return error when record not found', () => {
    sut = new sandbox.MyAjaxService();
    sut._params = {
        'sysparm_name': 'getRecordDetails',
        'sysparm_sys_id': 'nonexistent',
    };

    var result = JSON.parse(sut.getRecordDetails());
    expect(result.error).to.equal('Record not found');
});
```

### Testing Parameter Validation

```javascript
it('should return error when required parameter is missing', () => {
    sut = new sandbox.MyAjaxService();
    sut._params = { 'sysparm_name': 'performAction' };
    // sysparm_sys_id is missing

    var result = JSON.parse(sut.performAction());
    expect(result.success).to.be.false;
    expect(result.error).to.include('Missing required parameter');
});
```

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| `access` is `package_private` | Must be `public` for client-callable Script Includes |
| Forgetting `sysparm_name` parameter | Client must always send `sysparm_name` with the method to invoke |
| Sync calls blocking UI | Use `getXMLAnswer(callback)` instead of `getXMLWait()` |
| Returning objects instead of strings | Always `JSON.stringify()` on server; `JSON.parse()` on client |
| Public helper methods exposed to client | Prefix private methods with `_` to prevent client access |
| No error handling on server | Wrap in try/catch; return structured error JSON |
| No null check on client response | Check for null/empty `answer` before `JSON.parse()` |
| Testing Ajax without mocking `AbstractAjaxProcessor` | Set up `_params` dict and `getParameter` in sandbox before loading script |

## Task Types This Doc Supports

- Building client-callable Script Includes (AbstractAjaxProcessor)
- Writing client-side GlideAjax calls in Client Scripts
- Designing JSON request/response contracts between client and server
- Unit testing GlideAjax processors with Grit
- Error handling for client-server communication
- Code reviews of GlideAjax endpoints
