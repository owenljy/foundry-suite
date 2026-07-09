# Script Includes

## When to use this doc

Load this when building server-side reusable code: Script Includes, service layers, GlideAjax endpoints, or utility classes. Also relevant during code reviews of server-side scripts.

## Class Pattern

All Script Includes use `Class.create()` with a prototype object. The `type` property must match the class name exactly.

```javascript
var MyService = Class.create();
MyService.prototype = {
    initialize: function() {
        this.TABLE = 'sn_myapp_record';
    },

    publicMethod: function(param) {
        return this._helper(param);
    },

    _helper: function(param) {
        // Private by convention (underscore prefix)
        return param;
    },

    type: 'MyService'
};
```

### Class with Dependencies

Instantiate collaborators in `initialize()`:

```javascript
var OrderService = Class.create();
OrderService.prototype = {
    initialize: function() {
        this.inventoryService = new InventoryService();
        this.notificationService = new NotificationService();
    },

    processOrder: function(orderGr) {
        if (!this.inventoryService.checkStock(orderGr)) {
            return { success: false, error: 'Out of stock' };
        }
        this.notificationService.sendConfirmation(orderGr);
        return { success: true };
    },

    type: 'OrderService'
};
```

### Extending Another Class

Use `Object.extendsObject()` and call parent methods explicitly:

```javascript
var ExtendedService = Class.create();
ExtendedService.prototype = Object.extendsObject(BaseService, {
    initialize: function() {
        BaseService.prototype.initialize.call(this);
    },

    existingMethod: function() {
        var result = BaseService.prototype.existingMethod.call(this);
        // Add additional logic
        return result;
    },

    type: 'ExtendedService'
});
```

### Static Methods

For stateless utilities, add methods directly to the constructor:

```javascript
var MyUtils = Class.create();
MyUtils.prototype = {
    initialize: function() {},
    type: 'MyUtils'
};

MyUtils.isValidEmail = function(email) {
    if (!email || typeof email !== 'string') return false;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

MyUtils.safeBool = function(value) {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') return value.toLowerCase() === 'true' || value === '1';
    return !!value;
};
```

## Client-Callable (GlideAjax)

Client-callable Script Includes extend `AbstractAjaxProcessor`. They must be `public` access and `client_callable=true`.

### Server Side

```javascript
var MyAjaxService = Class.create();
MyAjaxService.prototype = Object.extendsObject(AbstractAjaxProcessor, {

    getRecordData: function() {
        var sysId = this.getParameter('sysparm_sys_id');
        var gr = new GlideRecord('my_table');
        if (gr.get(sysId)) {
            return JSON.stringify({
                name: gr.getValue('name'),
                state: gr.getValue('state')
            });
        }
        return JSON.stringify({ error: 'Not found' });
    },

    // Methods starting with underscore are NOT client-accessible
    _privateHelper: function() {},

    type: 'MyAjaxService'
});
```

### Client Side

```javascript
// Asynchronous (recommended)
var ga = new GlideAjax('sn_myapp.MyAjaxService');
ga.addParam('sysparm_name', 'getRecordData');
ga.addParam('sysparm_sys_id', recordSysId);
ga.getXMLAnswer(function(answer) {
    var result = JSON.parse(answer);
    g_form.setValue('name', result.name);
});

// Synchronous (use sparingly — blocks UI)
var ga = new GlideAjax('sn_myapp.MyAjaxService');
ga.addParam('sysparm_name', 'getRecordData');
ga.addParam('sysparm_sys_id', recordSysId);
var answer = ga.getXMLWait();
```

### GlideAjax Method Reference

| Server Method | Description |
|---------------|-------------|
| `this.getParameter('name')` | Get parameter from client |
| `this.newItem('name')` | Create response item |
| `return value` | Return string directly |

| Client Method | Description |
|---------------|-------------|
| `ga.addParam('name', 'value')` | Add parameter |
| `ga.getXMLAnswer(callback)` | Async call with callback |
| `ga.getXMLWait()` | Sync call (returns string) |

## CRUD Service Pattern

A complete service class with standard CRUD operations:

```javascript
var VisitorService = Class.create();
VisitorService.prototype = {
    initialize: function() {
        this.TABLE = 'sn_wsd_visitor_visitor';
    },

    getVisitor: function(sysId) {
        var gr = new GlideRecord(this.TABLE);
        if (gr.get(sysId)) {
            return this._toObject(gr);
        }
        return null;
    },

    getVisitorByEmail: function(email) {
        var gr = new GlideRecord(this.TABLE);
        gr.addQuery('email', email);
        gr.query();
        if (gr.next()) {
            return this._toObject(gr);
        }
        return null;
    },

    createVisitor: function(data) {
        var gr = new GlideRecord(this.TABLE);
        gr.initialize();
        gr.setValue('first_name', data.firstName);
        gr.setValue('last_name', data.lastName);
        gr.setValue('email', data.email);
        gr.setValue('company', data.company || '');
        var sysId = gr.insert();
        if (sysId) {
            gs.info('VisitorService: Created visitor ' + sysId);
            return sysId;
        }
        gs.error('VisitorService: Failed to create visitor');
        return null;
    },

    updateVisitor: function(sysId, data) {
        var gr = new GlideRecord(this.TABLE);
        if (gr.get(sysId)) {
            for (var field in data) {
                if (data.hasOwnProperty(field)) {
                    gr.setValue(field, data[field]);
                }
            }
            return gr.update();
        }
        return false;
    },

    _toObject: function(gr) {
        return {
            sys_id: gr.getUniqueValue(),
            first_name: gr.getValue('first_name'),
            last_name: gr.getValue('last_name'),
            email: gr.getValue('email'),
            company: gr.getValue('company')
        };
    },

    type: 'VisitorService'
};
```

## Access Control

| Field | Value | Description |
|-------|-------|-------------|
| `access` | `package_private` | Only accessible within scope (default) |
| `access` | `public` | Accessible from any scope |
| `client_callable` | `true` | Can be called via GlideAjax |
| `client_callable` | `false` | Server-side only (default) |

The `api_name` follows the pattern `{scope}.{ClassName}`, e.g. `sn_wsd_visitor.WSDVMVisitorService`.

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| `type` property doesn't match class name | Must be identical: `type: 'MyService'` for `var MyService` |
| Client-callable but `access` is `package_private` | Must be `public` for GlideAjax |
| Forgetting `_` prefix on private methods | Client can call any non-underscore method on Ajax processors |
| Inline logic instead of service delegation | Keep scheduled jobs/BRs thin — delegate to Script Includes |
| Not using `getValue()` for field access | Direct field access returns GlideElement, not string |
| Missing error handling on GlideRecord operations | Always check return values of `get()`, `insert()`, `update()` |

## Logging Conventions

```javascript
gs.info('ClassName: descriptive message ' + variable);
gs.warn('ClassName: warning about ' + condition);
gs.error('ClassName: failed to ' + action + ': ' + e.message);
gs.debug('ClassName: debug detail ' + data);
```

## Task Types This Doc Supports

- Building Script Includes and service layers
- Creating GlideAjax endpoints
- Writing server-side utility classes
- Code reviews of server-side scripts
- Unit testing Script Includes (see also `testing/atf-patterns.md`)
