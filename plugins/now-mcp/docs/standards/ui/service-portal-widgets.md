# Service Portal Widgets

## When to use this doc

Load this when building Service Portal widgets, pages, or Angular components. Also relevant when working with portal dependencies, CSS includes, or widget communication patterns.

## Widget Architecture

A widget consists of four parts:

| Part | Language | Purpose |
|------|----------|---------|
| Server Script | JavaScript | Query data, prepare `data` object |
| Client Script | AngularJS | Controller logic, bind to template |
| HTML Template | HTML/Angular | UI rendering with `{{c.data.field}}` |
| CSS/SCSS | CSS | Widget styling |

### Data Flow

```
Server Script → data object → Client Controller (c.data) → HTML Template
```

### Server Script

```javascript
(function() {
    // Query data
    var gr = new GlideRecord('incident');
    gr.addQuery('active', true);
    gr.setLimit(10);
    gr.query();
    
    data.incidents = [];
    while (gr.next()) {
        data.incidents.push({
            sys_id: gr.getUniqueValue(),
            number: gr.getValue('number'),
            description: gr.getValue('short_description')
        });
    }
})();
```

### Client Script (Controller)

```javascript
function($scope, $http, spUtil) {
    var c = this;
    
    c.refreshData = function() {
        c.server.update().then(function(response) {
            c.data = response.data;
        });
    };
    
    c.submitForm = function() {
        c.data.action = 'submit';
        c.server.update().then(function(response) {
            if (response.data.success) {
                spUtil.addInfoMessage('Saved successfully');
            }
        });
    };
}
```

### HTML Template

```html
<div class="panel panel-default">
    <div class="panel-heading">
        <h3>{{c.data.title}}</h3>
    </div>
    <div class="panel-body">
        <ul>
            <li ng-repeat="item in c.data.incidents">
                {{item.number}} - {{item.description}}
            </li>
        </ul>
        <button class="btn btn-primary" ng-click="c.submitForm()">
            Submit
        </button>
    </div>
</div>
```

## Page Structure

Portal pages use a hierarchical layout:

```
Page (sp_page)
  └── Container (sp_container)
        └── Row (sp_row)
              └── Column (sp_column)  — Bootstrap grid (1-12)
                    └── Instance (sp_instance)  — Widget placement
                          └── Widget (sp_widget)
```

## Widget Options

Configure via `option_schema` JSON field:

```json
[{
    "hint": "Title to display",
    "name": "title",
    "default_value": "My Widget",
    "section": "General",
    "field_type": "string",
    "order": 100
}]
```

Access in server script: `options.title`
Access in client: `c.options.title`

## Angular Providers

| Type | Use For |
|------|---------|
| Service | Shared state and logic (singleton) |
| Factory | Object creation with custom logic |
| Directive | Reusable DOM components |
| Filter | Data transformation in templates |

## Server-Client Communication

```javascript
// Client → Server (update)
c.server.update().then(function(response) {
    c.data = response.data;
});

// Client → Server (get — read-only, no data sent)
c.server.get({action: 'lookup', id: sysId}).then(function(response) {
    c.data = response.data;
});
```

Server handles actions:

```javascript
(function() {
    if (input && input.action === 'submit') {
        // Handle submission
        data.success = true;
    }
})();
```

## CSS Conventions

- Use SCSS syntax in widget CSS
- Scope all styles to widget — they're automatically wrapped
- Use Bootstrap grid classes for layout (col-xs, col-sm, col-md, col-lg)
- Responsive breakpoints: xs (<768px), sm (≥768px), md (≥992px), lg (≥1200px)

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Direct GlideRecord in client script | Query in server script, send via `data` object |
| Not scoping CSS | Widget CSS is auto-scoped, but shared CSS includes are not |
| Missing `c.` prefix in template | Always use `c.data.field`, not `data.field` |
| Synchronous server calls | Always use `.then()` with `c.server.update()` |
| HTML entity escaping issues | Test special characters in all text fields |
| Not handling empty data | Add `ng-if` guards for optional data |

## Task Types This Doc Supports

- Building Service Portal widgets
- Creating portal pages and layouts
- Working with Angular providers (services, directives)
- Widget server-client communication patterns
- Code reviews of portal components
