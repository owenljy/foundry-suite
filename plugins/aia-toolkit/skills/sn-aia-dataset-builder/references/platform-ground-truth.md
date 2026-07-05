# Platform Ground Truth (Pattern C)

Reference for **Pattern C — Platform Ground Truth records** (the `ground_truth`
table). Use this when you want to evaluate **tool calling correctness, tool
choice accuracy, and output alignment** — the **"With ground truth"** metrics on
the Skill Kit Evaluation Dashboard. Pattern C is **complementary** to Pattern A/B
(`additional_details`); both can coexist on the same `aia_artifact_dataset`
record.

> **Exact-name rule (canonical, referenced everywhere):** `agent_name` and
> `tool_name` in the GT JSON must **exactly match** the runtime strings the
> platform reports in `sn_aia_execution_task`. A single character difference
> causes GT metrics to report tool choices as incorrect even when the agent
> behaves correctly. Everything below that mentions "exact names" means this rule.

## Pattern A/B vs Platform GT — When to Use What

| Aspect | Pattern A/B (`additional_details`) | Pattern C (`ground_truth` table) |
|---|---|---|
| Metrics enabled | Faithfulness, Correctness, Correctness with Golden Response | Tool calling correctness (GT), Output alignment (GT), Tool choice accuracy (GT) |
| Agentic pipeline support | Not yet (requires `{{generated_response}}` variable) | Yes — works with Auto Chat agentic pipeline |
| What it validates | Response quality and content accuracy | Tool selection, parameter correctness, output values |

**When to use Pattern C:** When the agent's value is in calling the right tools
with the right parameters, and you want to score that precisely. Pattern C is the
more immediately useful approach since the agentic pipeline doesn't populate the
variables needed for Faithfulness/Correctness metrics.

## Getting exact runtime names

To satisfy the exact-name rule, run the agent once and read the execution tasks:

```js
// Run in Scripts > Background
var gr = new GlideRecord('sn_aia_execution_task');
gr.addQuery('execution_plan', '<execution_plan_sys_id>');
gr.orderBy('order');
gr.query();
while (gr.next()) {
    gs.info('type=' + gr.getValue('type') +
            ' | target_table=' + gr.getValue('target_document_table') +
            ' | target_id=' + gr.getValue('target_document_id'));
}
```

## GT JSON Schema

```json
{
  "version_number": "1.0",
  "sysID": "<ground_truth_record_sys_id>",
  "name": "<descriptive name>",
  "groundtruth_type": "agentic_workflow",
  "objective": "<initial_query from the dataset record>",
  "language": "en",
  "executed_tools": [
    {
      "agent_name": "<exact agent name from sn_aia_execution_task>",
      "tool_name": "<exact tool name from sn_aia_execution_task>",
      "tool_id": 1,
      "depends_on": [],
      "input": {
        "<param_name>": {
          "name": "<param_name>",
          "value": "<expected_value>",
          "description": "",
          "mandatory": true,
          "value_match": {
            "type": "exact",
            "score_type": "boolean"
          }
        }
      }
    }
  ],
  "output_evaluations": [
    {
      "metric_label": "<what you're checking>",
      "expected_output": "<expected value or text>",
      "match_skill_id": "<OOB skill sys_id>",
      "additional_parameters": {},
      "score_type": "boolean"
    }
  ]
}
```

## OOB Evaluation Skills for `output_evaluations`

| Skill | `match_skill_id` | Purpose |
|---|---|---|
| **Glide Skill** | `dfe17d94ff31b2109903ffffffffffe1` | Verify a value on a GlideRecord field (exact or semantic match) |
| **Output Skill** | `8793305cff3972109903ffffffffff23` | Verify output text from agent execution (exact or semantic match) |

**Glide Skill** — checks a field value on a record the agent acted on:
```json
{
  "metric_label": "Urgency",
  "expected_output": "3 - Low",
  "match_skill_id": "dfe17d94ff31b2109903ffffffffffe1",
  "additional_parameters": {
    "table": "incident",
    "number": {
      "agent_name": "Record field value prediction AI agent",
      "tool_name": "Get the record metadata",
      "field": "number"
    },
    "field_name": "urgency"
  },
  "score_type": "boolean"
}
```

**Output Skill** — checks text output from a specific agent tool call:
```json
{
  "metric_label": "Resolution Plan",
  "expected_output": "1. Escalate the incident...\n2. Provide all relevant details...",
  "match_skill_id": "8793305cff3972109903ffffffffff23",
  "additional_parameters": {
    "execution_output": {
      "agent_name": "ITSM incident resolution plan investigation AI agent",
      "tool_name": "Add a resolution plan or failure message to incident's work notes",
      "field": "plan_to_add_array"
    },
    "match_type": "semantic"
  },
  "score_type": "boolean"
}
```

## Generating Platform GT from Executions

**Recommended workflow:** Extract GT from a successful execution, then curate:

1. Run the agent on a test case (via Agentic Studio or background script)
2. Extract GT:
```js
// Run in Scripts > Background
var encodedQuery = "sys_id=<execution_plan_sys_id>";
var tag = "my-agent-gt";
new sn_prompt_assist.AutoEvalGTUtil().extractGroundTruth(encodedQuery, tag);
```
3. Open each `ground_truth` record → click **Edit Ground Truth JSON** (requires GT JSON editor update set `sys_id: f2a4521b979bb6100e9570700153afcc`)
4. Verify `executed_tools` — check agent names, tool names, input parameters (exact-name rule)
5. Add `output_evaluations` — define what output values to check
6. Set `value_match.type` to `"exact"` or `"semantic"` as appropriate

## Linking a ground truth record

```ts
ground_truth: '<ground-truth-record-sys-id>',
```

Ground truth records are created either via
`AutoEvalGTUtil().extractGroundTruth()` from executions (recommended) or manually
in ServiceNow UI at **Now Assist → Evaluations → Ground Truth → New**. If the
sys_id isn't available yet, omit the field and note it can be added after
deploying.

## Fluent `ground_truth` record template

When creating platform GT records as fluent files alongside dataset records:

```ts
import { Record } from '@servicenow/sdk/core';

const gt = Record({
    $id: Now.ID['gt-<agent>-<scenario-slug>'],
    table: 'ground_truth',
    data: {
        ground_truth: JSON.stringify({
            version_number: '1.0',
            sysID: '<use the UUID from keys.ts for this record>',
            name: '<Agent Name> - <Scenario>',
            groundtruth_type: 'agentic_workflow',
            objective: '<initial_query from the dataset record>',
            language: 'en',
            executed_tools: [
                {
                    agent_name: '<exact runtime agent name>',
                    tool_name: '<exact runtime tool name>',
                    tool_id: 1,
                    depends_on: [],
                    input: {},
                },
            ],
            output_evaluations: [],
        }),
        sys_domain: 'global',
    },
});

export { gt };
```

Then in the dataset record file, link it:
```ts
        ground_truth: gt.$id,
```

> **Important:** The `sysID` inside the JSON should match the record's own sys_id
> (the UUID from `keys.ts`). Register both the `gt-*` key (table `ground_truth`)
> and the dataset key in `keys.ts`.
