/**
 * Per-field-value truncation for record-shaped responses.
 *
 * Row/byte-count guardrails (see query-records-tool, get-table-schema-tool) cap
 * the *number* of rows returned, but a single oversized string field (a syslog
 * message, a script body, an XML payload) can blow the whole response budget by
 * itself before the row cap ever kicks in. This truncates individual string
 * values so breadth (more rows/fields visible) wins over depth (one huge blob).
 */

/** Truncate a single value if it's a string longer than `maxChars`. */
export function truncateValue(
	value: unknown,
	maxChars: number,
): { value: unknown; truncated: boolean } {
	if (typeof value === 'string' && value.length > maxChars) {
		return {
			value: `${value.slice(0, maxChars)}…[truncated ${value.length - maxChars} chars]`,
			truncated: true,
		};
	}
	return { value, truncated: false };
}

/** Apply `truncateValue` to every field of every record. Pure — no side effects. */
export function truncateRecordFields(
	records: Record<string, unknown>[],
	maxChars: number,
): { records: Record<string, unknown>[]; truncated: boolean } {
	let truncated = false;
	const out = records.map((record) => {
		const copy: Record<string, unknown> = {};
		for (const [key, val] of Object.entries(record)) {
			const t = truncateValue(val, maxChars);
			copy[key] = t.value;
			if (t.truncated) truncated = true;
		}
		return copy;
	});
	return { records: out, truncated };
}
