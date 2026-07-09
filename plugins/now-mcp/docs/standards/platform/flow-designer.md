# Flow Designer

## When to use this doc

Load this when building automated workflows with Flow Designer, creating custom actions, or deciding between Flow Designer and scripted approaches.

## When to Use Flows vs Scripts

| Use Flows When | Use Scripts When |
|----------------|------------------|
| Non-developers need to maintain it | Complex conditional logic |
| Standard record operations | Performance-critical code |
| Approval processes | Batch processing large datasets |
| Notifications and escalations | Cross-scope operations |
| Simple integrations | Complex error handling |

## Trigger Types

| Type | Description | Use Case |
|------|-------------|----------|
| `record` | Database record events | Automate on data changes |
| `schedule` | Time-based | Periodic tasks |
| `email` | Inbound email | Process incoming emails |
| `rest` | REST API endpoint | External integrations |
| `service_catalog` | Catalog request | RITM fulfillment |
| `application` | App event | Custom triggers |

### Record Trigger Operations

| Operation | Description |
|-----------|-------------|
| `insert` | New record created |
| `update` | Record updated |
| `insert_update` | Both insert and update |
| `delete` | Record deleted |

## Run As Options

| Value | Description |
|-------|-------------|
| `System` | Runs with system privileges (use for background automation) |
| `User` | Runs as triggering user (use when respecting ACLs matters) |

## Custom Actions

Custom actions encapsulate reusable logic with typed inputs and outputs.

### Script Step Pattern

```javascript
(function execute(inputs, outputs) {
    var gr = new GlideRecord('my_table');
    gr.addQuery('email', inputs.email);
    gr.query();

    if (gr.next()) {
        outputs.record = gr;
        outputs.found = true;
    } else {
        outputs.found = false;
    }
})(inputs, outputs);
```

### Available Variables

| Variable | Description |
|----------|-------------|
| `inputs` | Object containing input values |
| `outputs` | Object to set output values |
| `fd_data` | Flow runtime data |

### Input/Output Data Types

| Type | Description |
|------|-------------|
| `string` | Text value |
| `integer` | Whole number |
| `boolean` | True/false |
| `gliderecord` | GlideRecord reference |
| `reference` | Record reference |
| `datetime` | Date and time |
| `object` | JSON object |
| `array` | Array of values |

## Subflows vs Flows

| Feature | Flow | Subflow |
|---------|------|---------|
| Has trigger | Yes | No |
| Can be called by other flows | No | Yes |
| Has typed inputs/outputs | No | Yes |
| Runs standalone | Yes | No |

Use subflows for reusable logic that multiple flows need.

### Annotation Types for Actions

| Annotation | Description |
|------------|-------------|
| `@class: ServiceNowScript` | Server-side JavaScript |
| `@class: ServiceNowRestAction` | REST API call |
| `@class: ServiceNowSubflow` | Calls a subflow |

## Script Examples

### Create Record

```javascript
(function execute(inputs, outputs) {
    var gr = new GlideRecord('task');
    gr.initialize();
    gr.setValue('short_description', inputs.description);
    gr.setValue('assigned_to', inputs.assignee);
    gr.setValue('priority', inputs.priority || 3);

    var sysId = gr.insert();
    outputs.success = !!sysId;
    if (sysId) {
        outputs.created_record = gr;
    } else {
        outputs.error_message = 'Failed to create record';
    }
})(inputs, outputs);
```

### Call Script Include

```javascript
(function execute(inputs, outputs) {
    try {
        var service = new MyVisitorService();
        var visitor = service.getVisitorByEmail(inputs.email);

        if (visitor) {
            outputs.visitor_data = JSON.stringify(visitor);
            outputs.found = true;
        } else {
            outputs.found = false;
        }
    } catch (e) {
        outputs.error_message = e.message;
        outputs.found = false;
    }
})(inputs, outputs);
```

## Best Practices

1. **Use custom actions** for reusable logic — don't duplicate script steps across flows
2. **Define clear input/output contracts** — typed inputs catch errors early
3. **Error handling** — Set error outputs instead of throwing; flows handle errors differently than scripts
4. **Keep flows simple** — If a flow has more than 10 steps, consider subflows
5. **Use subflows** for shared sequences (e.g., "notify and escalate")

## Task Types This Doc Supports

- Building automated workflows with Flow Designer
- Creating custom reusable actions
- Deciding between Flow Designer and scripted approaches
- Building subflows for shared logic
- Code reviews of Flow Designer configurations
