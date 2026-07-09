# Classic UI

## When to use this doc

Load this when working with classic UI components: UI Policies, UI Actions, UI Pages, form/list layouts, menus, or user criteria. This doc covers the declarative UI configuration patterns that don't require custom scripting.

## UI Policies

Declarative field behavior rules — no scripting required for simple cases.

### Action Values

| Action | `true` | `false` | `ignore` |
|--------|--------|---------|----------|
| `visible` | Show field | Hide field | Don't change |
| `mandatory` | Make required | Make optional | Don't change |
| `read_only` | Make read-only | Make editable | Don't change |
| `disabled` | Disable field | Enable field | Don't change |

### Key Setting: reverse_if_false

When `reverse_if_false=true`, the platform automatically reverses actions when the condition stops being true. **Forgetting this leaves fields in the wrong state.**

### Condition Syntax

Uses encoded query format — test in list filter first to validate syntax:

```
state=closed          — equals
state!=open           — not equals
priority<=2           — comparison
javascript:!gs.hasRole('admin')  — script condition
```

### Script-Based Policy

For complex conditions, set `run_scripts=true`:

```javascript
// script_true — runs when condition is met
function onCondition() {
    g_form.setMandatory('resolution', true);
    g_form.setDisplay('resolution', true);
}

// script_false — runs when condition stops being met
function onCondition() {
    g_form.setMandatory('resolution', false);
}
```

## UI Actions

Buttons, links, and context menu items on forms and lists.

### Action Locations

| Flag | Location |
|------|----------|
| `form_button` | Button on form |
| `form_context_menu` | Form right-click menu |
| `form_link` | Link on form |
| `list_button` | Button above list |
| `list_banner_button` | Banner button on list |
| `list_context_menu` | List right-click menu |

### Visibility Controls

| Field | Purpose |
|-------|---------|
| `show_insert` | Show on new records |
| `show_update` | Show on existing records |
| `show_query` | Show in list view |
| `condition` | JavaScript expression for visibility |

### Server-Side Action

```javascript
current.state = 'approved';
current.update();
action.setRedirectURL(current);  // MUST include or you get blank page
```

### Client-Side Action

```javascript
function onClick(g_form) {
    if (confirm('Are you sure?')) {
        gsftSubmit(null, g_form.getFormElement(), 'sysverb_my_action');
    }
    return false;
}
```

**Critical**: Always include `action.setRedirectURL()` in server-side actions to avoid blank pages.

## UI Pages and Macros

Custom pages for dialogs and embedded content.

### Processing Flow

1. `processing_script` runs server-side, sets variables
2. Jelly template renders HTML using those variables
3. `client_script` handles client-side interaction

### Parameter Passing (Dialogs)

```javascript
// Client — open dialog
var dialog = new GlideDialogWindow('my_dialog');
dialog.setPreference('sysparm_record_id', g_form.getUniqueValue());
dialog.render();

// Server — processing_script
var recordId = RP.getParameterValue('sysparm_record_id');
```

### Jelly Template Basics

```xml
<?xml version="1.0" encoding="utf-8" ?>
<j:jelly trim="false" xmlns:j="jelly:core" xmlns:g="glide">
  <j:if test="${success == 'true'}">
    <p>Operation succeeded</p>
  </j:if>
  <j:forEach items="${items}" var="item">
    <p>${item.name}</p>
  </j:forEach>
</j:jelly>
```

### UI Macros

Reusable Jelly components with parameters (prefixed `jvar_`):

```xml
<!-- Usage -->
<g:alert_box type="info" title="Notice" message="Record saved." />

<!-- Definition -->
<j:jelly trim="false" xmlns:j="jelly:core" xmlns:g="glide">
  <div class="alert-${jvar_type}">
    <j:if test="${!empty(jvar_title)}"><strong>${jvar_title}</strong><br/></j:if>
    ${jvar_message}
  </div>
</j:jelly>
```

## Menus and Modules

### Link Types

| Type | Description | `name` field contains |
|------|-------------|----------------------|
| `LIST` | Table list view | Table name |
| `NEW` | Create new record | Table name |
| `DIRECT` | URL link | URL path |
| `SEPARATOR` | Visual divider | — |

### Module Order

Use increments of 100 (100, 200, 300) for insertion flexibility.

## User Criteria

Controls access to catalog items, knowledge articles, and portal content.

### Match Logic

- `match_all=false` — OR logic (any criterion matches)
- `match_all=true` — AND logic (all criteria must match)

### Script Criteria

Set `advanced=true` and set the `answer` variable:

```javascript
var gr = new GlideRecord('sys_user');
gr.addQuery('manager', gs.getUserID());
gr.setLimit(1);
gr.query();
answer = gr.hasNext();  // true if current user is a manager
```

## Form Layout

### Two-Column Layout

Use `.split` element to create columns:

```
field1 (position 0)
field2 (position 1)
.split  (position 2)
field3 (position 3)
field4 (position 4)
```

Fields before `.split` go in left column, fields after go in right column.

### Related Lists

Format: `{child_table}.{reference_field}`

Example: `sn_myapp_subtask.parent`

## List Layout

### Performance

- Keep columns to 5-7 for readability
- Dot-walking: max 2 levels deep for performance
- Aggregates (sum, average) only meaningful for numeric fields

### List Controls

| Control | Purpose |
|---------|---------|
| `omit_new_button` | Hide "New" button |
| `omit_edit_button` | Hide "Edit" button |
| `omit_if_empty` | Hide related list when no records |
| `omit_count` | Hide record count |
| `omit_filters` | Hide filter controls |

## Task Types This Doc Supports

- Creating UI Policies for form field behavior
- Building UI Actions (buttons, links, context menus)
- Creating UI Pages for dialogs and custom interfaces
- Configuring menus and application navigation
- Setting up user criteria for content access
- Configuring form and list layouts
- Code reviews of classic UI configurations
