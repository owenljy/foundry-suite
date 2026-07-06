/**
 * Zod schemas for inferring table structure from sampled record data.
 *
 * A data-driven fallback for sn_get_table_schema: instead of reading
 * sys_dictionary (which can be thin/incomplete on legacy or custom tables),
 * these describe the shape produced by sampling actual rows and inferring each
 * field's type and populated ratio.
 */

import { z } from 'zod';
import { instanceField, tableNameField } from './common.js';

/**
 * Schema for inferring a table's structure from sampled data.
 */
export const GetTableStructureFromDataSchema = z.object({
	instance: instanceField,
	tableName: tableNameField(),
	sampleSize: z
		.number()
		.int()
		.min(1)
		.max(20)
		.default(5)
		.describe('Number of records to sample when inferring structure'),
});

export type GetTableStructureFromDataInput = z.infer<typeof GetTableStructureFromDataSchema>;

/**
 * Output schema for sn_get_table_structure_from_data.
 */
export const GetTableStructureFromDataOutputSchema = z.object({
	success: z.boolean(),
	table: z.string(),
	recordsSampled: z.number(),
	alwaysPopulated: z.array(z.string()),
	neverPopulated: z.array(z.string()),
	referenceFields: z.array(
		z.object({
			field: z.string(),
			referencesTable: z.string().optional(),
		}),
	),
	fields: z.array(
		z.object({
			name: z.string(),
			inferredType: z.string(),
			populatedRatio: z.string(),
			isReference: z.boolean(),
			sampleValues: z.array(z.string()),
		}),
	),
});

export type GetTableStructureFromDataOutput = z.infer<typeof GetTableStructureFromDataOutputSchema>;
