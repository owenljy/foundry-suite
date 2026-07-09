# Client Scripts

## When to use this doc

Load this when building client-side form logic: onLoad, onChange, onSubmit, or onCellEdit scripts. Also relevant when using GlideAjax to call server-side code from forms.

## Script Types and Signatures

### onLoad

Runs when form loads. No parameters — `g_form` is available globally.

```javascript
function onLoad() {
    g_form.setReadOnly('resolved_at', true);
}
```

### onChange

Runs when a specific field value changes.

```javascript
function onChange(control, oldValue, newValue, isLoading, isTemplate) {
    if (isLoading || newValue === '') {
        return;  // Always check isLoading!
    }
    g_form.setMandatory('resolution', newValue === 'closed');
}
```

**Critical**: Always check `isLoading` in onChange scripts. Without this check, the script fires during form load, causing unwanted side effects.

### onSubmit

Runs before form submission. Return `false` to cancel.

```javascript
function onSubmit() {
    var state = g_form.getValue('state');
    if (state === 'closed' && g_form.getValue('resolution') === '') {
        g_form.addErrorMessage('Resolution is required when closing.');
        return false;
    }
    return true;
}
```

### onCellEdit

Runs during list view inline editing.

```javascript
function onCellEdit(sysIDs, table, oldValues, newValue, callback) {
    callback();  // Must call to complete the edit
}
```

## g_form API Reference

### Value Operations

```javascript
g_form.getValue('field_name');                          // Returns string
g_form.setValue('field_name', 'new_value');              // Set value
g_form.setValue('ref_field', 'sys_id', 'Display Name');  // Set reference
g_form.clearValue('field_name');                         // Clear
g_form.getDisplayValue('field_name');                    // Reference display value
```

### Field State

```javascript
g_form.setReadOnly('field_name', true);    // Read-only
g_form.setMandatory('field_name', true);   // Required
g_form.setDisplay('field_name', false);    // Hide field
g_form.setVisible('field_name', false);    // Hide (alias)
g_form.setDisabled('field_name', true);    // Disabled
```

### Messages

```javascript
// Form-level
g_form.addInfoMessage('Info text');
g_form.addWarningMessage('Warning text');
g_form.addErrorMessage('Error text');
g_form.clearMessages();

// Field-level
g_form.showFieldMsg('field_name', 'Message', 'info');  // info, error, warning
g_form.hideFieldMsg('field_name');
```

### Reference Field Lookup

```javascript
g_form.getReference('assigned_to', function(ref) {
    if (ref) {
        g_form.setValue('email', ref.email);
        g_form.setValue('phone', ref.phone);
    }
});
```

### Choice List Operations

```javascript
g_form.addOption('field_name', 'value', 'label');
g_form.addOption('field_name', 'value', 'label', 0);  // Insert at index
g_form.removeOption('field_name', 'value');
g_form.clearOptions('field_name');
```

### Form Metadata

```javascript
g_form.getTableName();     // Current table
g_form.getUniqueValue();   // Current record sys_id
g_form.isNewRecord();      // Is this a new record?
g_form.save();             // Save without redirect
g_form.submit();           // Submit form
```

### Sections

```javascript
g_form.setSectionDisplay('section_name', true);
var sections = g_form.getSections();
```

### Labels

```javascript
g_form.setLabelOf('field_name', 'New Label');
g_form.getLabelOf('field_name');
```

## g_user Object

```javascript
g_user.userName;                  // Username
g_user.userID;                    // sys_id
g_user.firstName;                 // First name
g_user.lastName;                  // Last name
g_user.hasRole('admin');          // Check role (includes inherited)
g_user.hasRoleExactly('itil');    // Exact role match
```

## Common Patterns

### Cascading Fields

```javascript
function onChange(control, oldValue, newValue, isLoading, isTemplate) {
    if (isLoading || newValue === '') return;
    g_form.clearValue('child_field');
    // Optionally fetch new options via GlideAjax
}
```

### Confirmation Dialog

```javascript
function onSubmit() {
    var state = g_form.getValue('state');
    if (state === 'closed') {
        return confirm('Are you sure you want to close this record?');
    }
    return true;
}
```

### Prevent Double Submit

```javascript
function onSubmit() {
    if (g_form.submitted) return false;
    g_form.submitted = true;
    return true;
}
```

### GlideAjax Server Call

```javascript
var ga = new GlideAjax('sn_myapp.MyAjaxService');
ga.addParam('sysparm_name', 'myFunction');
ga.addParam('sysparm_param1', 'value1');
ga.getXMLAnswer(function(answer) {
    g_form.setValue('field', answer);
});
```

## UI Type Values

| Value | Meaning |
|-------|---------|
| `0` | All (Desktop, Mobile, Service Portal) |
| `1` | Desktop only |
| `10` | Mobile / Service Portal only |

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Missing `isLoading` check in onChange | Always add `if (isLoading) return;` as first line |
| Synchronous GlideAjax calls | Use `getXMLAnswer(callback)` instead of `getXMLWait()` |
| Complex logic in client script | Move to Script Include, call via GlideAjax |
| Not returning `false` in onSubmit | `return false` cancels submission; missing return allows it |
| `getValue()` returns string | Always compare as string: `getValue('priority') === '1'` |
| Not testing with templates | onChange fires differently when loading from template |

## Performance Guidelines

- Avoid synchronous GlideAjax calls (`getXMLWait()`) — they block the UI
- Minimize DOM operations
- Use `condition` field on the client script record to limit when it runs
- Combine related logic into fewer scripts rather than many small ones
- Set `isolate_script=true` to prevent variable conflicts between scripts

## Task Types This Doc Supports

- Building client-side form behavior (onLoad, onChange, onSubmit)
- Creating cascading field logic
- Adding form validation
- Calling server-side code from forms (GlideAjax)
- Code reviews of client-side scripts
