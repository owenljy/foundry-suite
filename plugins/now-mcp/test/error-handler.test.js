import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatErrorForTool, transformError } from '../build/utils/error-handler.js';

test('transformError on a generic Error does not carry a stack trace in details', () => {
  const err = new Error('boom');
  const transformed = transformError(err);

  assert.equal(transformed.code, 'UNEXPECTED_ERROR');
  assert.equal(transformed.message, 'boom');
  assert.equal(transformed.servicenowError, undefined);
});

test('formatErrorForTool omits stack traces and internal file paths from the tool-visible text', () => {
  const err = new TypeError('missing field');
  const text = formatErrorForTool(err);

  assert.ok(!text.includes('.js:'), 'should not leak a stack frame line number');
  assert.ok(!text.includes('node_modules'), 'should not leak internal dependency paths');
  assert.ok(!text.includes('    at '), 'should not leak stack frame lines');
  assert.ok(text.includes('missing field'));
});

test('formatErrorForTool on a ZodError-shaped error (the common validation-failure path) stays lean', () => {
  // ZodError extends Error, so schema.parse() failures land in the same
  // instanceof Error branch as any other unexpected error.
  class FakeZodError extends Error {
    constructor(message) {
      super(message);
      this.name = 'ZodError';
    }
  }
  const err = new FakeZodError('[{"code":"invalid_type","path":["fieldName"],"message":"Required"}]');
  const text = formatErrorForTool(err);

  assert.ok(!text.includes('    at '), 'validation errors should not carry a stack trace');
  assert.ok(text.includes('fieldName'));
});
