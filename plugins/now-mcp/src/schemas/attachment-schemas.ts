/**
 * Zod schemas for Attachment API validation
 */

import { z } from 'zod';
import { instanceField, sysIdField, tableNameField } from './common.js';

/**
 * Schema for uploading an attachment
 */
export const UploadAttachmentSchema = z.object({
	instance: instanceField,
	fileName: z
		.string()
		.min(1, 'File name is required')
		.max(100, 'File name cannot exceed 100 characters')
		.refine((name) => !name.includes('..') && !name.includes('/') && !name.includes('\\'), {
			message: 'File name cannot contain path separators',
		}),
	fileContent: z
		.string()
		.min(1, 'File content is required')
		.describe('Base64-encoded file content'),
	tableName: tableNameField(),
	recordSysId: sysIdField('record sys_id'),
});

export type UploadAttachmentInput = z.infer<typeof UploadAttachmentSchema>;

/**
 * Schema for downloading an attachment
 */
export const DownloadAttachmentSchema = z.object({
	instance: instanceField,
	attachmentSysId: sysIdField('attachment sys_id'),
});

export type DownloadAttachmentInput = z.infer<typeof DownloadAttachmentSchema>;

/**
 * Schema for listing attachments on a record
 */
export const ListAttachmentsSchema = z.object({
	instance: instanceField,
	tableName: tableNameField(),
	recordSysId: sysIdField('record sys_id'),
});

export type ListAttachmentsInput = z.infer<typeof ListAttachmentsSchema>;

/**
 * Schema for getting attachment metadata (no file content).
 * Either provide an attachmentSysId, or both tableName and recordSysId.
 */
export const GetAttachmentMetadataSchema = z
	.object({
		instance: instanceField,
		attachmentSysId: sysIdField('attachment sys_id').optional(),
		tableName: tableNameField().optional(),
		recordSysId: sysIdField('record sys_id').optional(),
	})
	.refine((v) => v.attachmentSysId || (v.tableName && v.recordSysId), {
		message: 'Provide either attachmentSysId, or both tableName and recordSysId.',
	});

export type GetAttachmentMetadataInput = z.infer<typeof GetAttachmentMetadataSchema>;

/**
 * Output schema for get attachment metadata.
 * `attachments` holds the raw metadata objects (open by design); never file content.
 */
export const GetAttachmentMetadataOutputSchema = z.object({
	success: z.boolean(),
	totalAttachments: z.number(),
	attachments: z.array(z.record(z.unknown())),
});
