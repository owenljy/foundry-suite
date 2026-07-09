# GlideRecord Patterns

## When to use this doc

Load this when writing any server-side code that queries, creates, updates, or deletes ServiceNow records. This is foundational knowledge used across Business Rules, Script Includes, Scheduled Jobs, and Flow Designer scripts.

## Basic Query

```javascript
var gr = new GlideRecord('incident');
gr.addQuery('state', 'active');
gr.addQuery('priority', '<=', '2');
gr.query();

while (gr.next()) {
    var number = gr.getValue('number');
    var desc = gr.getValue('short_description');
}
```

## Get by sys_id

```javascript
var gr = new GlideRecord('incident');
if (gr.get(sysId)) {
    // Record found
    var name = gr.getValue('short_description');
}
```

## Insert

```javascript
var gr = new GlideRecord('my_table');
gr.initialize();
gr.setValue('name', 'New Record');
gr.setValue('state', 'draft');
var sysId = gr.insert();
if (sysId) {
    gs.info('Created: ' + sysId);
}
```

## Update

```javascript
var gr = new GlideRecord('my_table');
if (gr.get(sysId)) {
    gr.setValue('state', 'active');
    gr.update();
}
```

## Delete

```javascript
var gr = new GlideRecord('my_table');
if (gr.get(sysId)) {
    gr.deleteRecord();
}
```

## Query Operators

```javascript
// Equals (default)
gr.addQuery('state', 'active');

// Not equals
gr.addQuery('state', '!=', 'closed');

// Comparison
gr.addQuery('priority', '<=', '2');

// Contains
gr.addQuery('short_description', 'CONTAINS', 'network');

// Starts with
gr.addQuery('number', 'STARTSWITH', 'INC');

// Is empty / not empty
gr.addNullQuery('assigned_to');
gr.addNotNullQuery('assigned_to');

// IN (multiple values)
gr.addQuery('state', 'IN', 'active,pending,open');

// Encoded query (complex conditions)
gr.addEncodedQuery('state=active^priority<=2^assigned_toISNOTEMPTY');
```

## OR Conditions

```javascript
var gr = new GlideRecord('incident');
var qc = gr.addQuery('state', 'active');
qc.addOrCondition('state', 'pending');
gr.query();
```

## Ordering and Limiting

```javascript
gr.orderBy('priority');          // Ascending
gr.orderByDesc('sys_created_on'); // Descending
gr.setLimit(100);                 // Limit results
gr.chooseWindow(0, 20);          // Pagination (offset, count)
```

## Aggregate Queries

```javascript
var ga = new GlideAggregate('incident');
ga.addQuery('state', 'active');
ga.addAggregate('COUNT');
ga.groupBy('priority');
ga.query();

while (ga.next()) {
    var priority = ga.getValue('priority');
    var count = ga.getAggregate('COUNT');
}
```

## Reference Fields

```javascript
// Get reference value (sys_id)
var assignedTo = gr.getValue('assigned_to');

// Dot-walking (follow reference chain)
var email = gr.assigned_to.email.toString();
var deptName = gr.assigned_to.department.name.toString();

// Get referenced record
var userGr = gr.assigned_to.getRefRecord();

// Set reference field
gr.setValue('assigned_to', userSysId);
```

## getValue() vs Direct Access

Always use `getValue()` to get string values. Direct field access returns a `GlideElement` object, which causes subtle bugs:

```javascript
// CORRECT
var state = gr.getValue('state');
var name = gr.getValue('name');

// WRONG — returns GlideElement, not string
var state = gr.state;           // GlideElement object
var name = gr.name;             // GlideElement object

// GlideElement can appear to work but fails in comparisons and JSON
```

Use `.toString()` when dot-walking through references:
```javascript
var email = gr.assigned_to.email.toString();
```

## Batch Processing

For large record sets, process in batches to avoid timeouts:

```javascript
var gr = new GlideRecord('my_table');
gr.addQuery('state', 'pending');
gr.setLimit(1000);
gr.query();

var count = 0;
while (gr.next()) {
    gr.setValue('state', 'processed');
    gr.update();
    count++;
}
gs.info('Processed ' + count + ' records');
```

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Using direct field access instead of `getValue()` | Always use `gr.getValue('field')` for string values |
| Not calling `query()` before iterating | Must call `gr.query()` before `gr.next()` |
| Forgetting `initialize()` before insert | Call `gr.initialize()` before setting values for new records |
| Dot-walking without `.toString()` | Reference dot-walking returns GlideElement — use `.toString()` |
| Modifying GlideRecord in a loop without `update()` | Each iteration needs its own `update()` call |
| Not checking `get()` return value | `gr.get()` returns false if record not found |
| Using `==` to compare GlideElement | Use `getValue()` first, then compare strings |

## Performance Tips

- Use `setLimit()` when you only need a fixed number of results
- Use `addEncodedQuery()` for complex conditions — it's optimized on the database side
- Avoid dot-walking more than 2 levels deep (performance degrades)
- Use `GlideAggregate` for counts and sums instead of iterating records
- Index fields you frequently query on (see `architecture/table-design.md`)

## Task Types This Doc Supports

- Any server-side scripting (Business Rules, Script Includes, Scheduled Jobs)
- Building service layers and CRUD operations
- Writing query logic in Flow Designer script steps
- Performance optimization of server-side code
- Code reviews of any server-side scripts
