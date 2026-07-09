# System Properties

## When to use this doc

Load this when creating application configuration settings, feature flags, default values, or any configurable values that administrators may need to change without modifying code.

## Naming Convention

```
{scope}.{category}.{name}
```

### Categories

| Category | Use For | Example |
|----------|---------|---------|
| `feature` | Feature flags | `sn_myapp.feature.self_registration.enabled` |
| `default` | Default values | `sn_myapp.default.visit.duration_minutes` |
| `integration` | External service config | `sn_myapp.integration.webhook.url` |
| `notification` | Email/SMS settings | `sn_myapp.notification.host.enabled` |
| `batch` | Scheduled job settings | `sn_myapp.batch.cleanup.days_to_keep` |
| `api` | API configuration | `sn_myapp.api.timeout_seconds` |
| `ui` | UI preferences | `sn_myapp.ui.theme` |
| `debug` | Debug/logging settings | `sn_myapp.debug.logging.enabled` |

## Property Types

| Type | Description | Example Value |
|------|-------------|---------------|
| `string` | Text value | `https://api.example.com` |
| `boolean` | True/false | `true` |
| `integer` | Whole number | `30` |
| `choicelist` | Selection from options | `email` |

For choicelist, provide comma-separated options in the `choices` field: `email,sms,both,none`.

## Accessing Properties in Code

### Server-Side

```javascript
// String — always provide a default
var apiUrl = gs.getProperty('sn_myapp.integration.api_url', 'https://default.com');

// Boolean — gs.getProperty returns STRING, must compare to 'true'
var debugEnabled = gs.getProperty('sn_myapp.debug.enabled') === 'true';

// Integer — must parseInt
var maxRecords = parseInt(gs.getProperty('sn_myapp.batch.max_records', '100'), 10);

// Set property (requires admin role)
gs.setProperty('sn_myapp.integration.api_url', 'https://new-api.example.com');
```

**Critical gotchas**:
- `gs.getProperty()` always returns a **string** — boolean comparison `== true` will fail silently
- Integer values need `parseInt()` — arithmetic on strings gives wrong results
- Always provide a default value as the second parameter

### Client-Side (via GlideAjax)

Properties aren't directly accessible client-side. Create a Script Include:

```javascript
var MyAppConfig = Class.create();
MyAppConfig.prototype = Object.extendsObject(AbstractAjaxProcessor, {
    getProperty: function() {
        var propName = this.getParameter('sysparm_property');
        if (propName && propName.startsWith('sn_myapp.')) {
            return gs.getProperty(propName, '');
        }
        return '';
    },
    type: 'MyAppConfig'
});
```

### Config Helper Pattern

Create static methods for clean property access:

```javascript
MyAppConfig.isFeatureEnabled = function(featureName) {
    return gs.getProperty('sn_myapp.feature.' + featureName + '.enabled') === 'true';
};

MyAppConfig.getTimeout = function() {
    return parseInt(gs.getProperty('sn_myapp.api.timeout', '30'), 10);
};
```

## Access Control

| Field | Description |
|-------|-------------|
| `read_roles` | Roles that can read this property |
| `write_roles` | Roles that can modify this property (usually `{scope}.admin`) |
| `is_private` | Hide value from non-admin users (use for API keys, secrets) |

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| `gs.getProperty('x') == true` | Compare to string: `=== 'true'` |
| Arithmetic on string property | Use `parseInt(gs.getProperty('x', '0'), 10)` |
| No default value | Always pass second param: `gs.getProperty('x', 'default')` |
| Sensitive values with `is_private=false` | Set `is_private=true` for API keys, passwords |
| Missing `write_roles` | Set to `{scope}.admin` to prevent unauthorized changes |

## Task Types This Doc Supports

- Creating application configuration properties
- Building feature flags
- Setting up integration config (URLs, timeouts, API keys)
- Creating scheduled job control properties
- Code reviews involving property access
