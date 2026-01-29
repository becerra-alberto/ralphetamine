/**
 * Unit tests for the TypeScript database client wrapper
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock the Tauri API
vi.mock('@tauri-apps/api/core', () => ({
	invoke: vi.fn()
}));

import { invoke } from '@tauri-apps/api/core';
import {
	dbHealthCheck,
	dbExecute,
	dbInsert,
	dbUpdate,
	dbDelete,
	dbSelect,
	DbError,
	type HealthCheckResponse,
	type ExecuteResponse
} from '../db';

const mockInvoke = vi.mocked(invoke);

describe('Database Client', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.resetAllMocks();
	});

	describe('dbHealthCheck', () => {
		it('should correctly format IPC call', async () => {
			const mockResponse: HealthCheckResponse = {
				status: 'ok',
				version: '3.45.0'
			};
			mockInvoke.mockResolvedValueOnce(mockResponse);

			const result = await dbHealthCheck();

			expect(mockInvoke).toHaveBeenCalledWith('db_health_check');
			expect(result).toEqual(mockResponse);
		});

		it('should handle error responses gracefully', async () => {
			mockInvoke.mockRejectedValueOnce(new Error('Database not initialized'));

			await expect(dbHealthCheck()).rejects.toThrow(DbError);
		});

		it('should include error message in thrown DbError', async () => {
			mockInvoke.mockRejectedValueOnce(new Error('Database not initialized'));

			await expect(dbHealthCheck()).rejects.toThrow('Database not initialized');
		});

		it('should handle string error responses', async () => {
			mockInvoke.mockRejectedValueOnce('Connection failed');

			try {
				await dbHealthCheck();
			} catch (error) {
				expect(error).toBeInstanceOf(DbError);
				expect((error as DbError).message).toBe('Connection failed');
				expect((error as DbError).code).toBe('HEALTH_CHECK_FAILED');
			}
		});
	});

	describe('dbExecute', () => {
		it('should correctly format IPC call with SQL parameter', async () => {
			const mockResponse: ExecuteResponse = {
				rows_affected: 1,
				last_insert_id: 1
			};
			mockInvoke.mockResolvedValueOnce(mockResponse);

			const sql = 'INSERT INTO test (name) VALUES (?)';
			const result = await dbExecute(sql);

			expect(mockInvoke).toHaveBeenCalledWith('db_execute', { sql });
			expect(result).toEqual(mockResponse);
		});

		it('should handle error responses gracefully', async () => {
			mockInvoke.mockRejectedValueOnce(new Error('SQL syntax error'));

			await expect(dbExecute('INVALID SQL')).rejects.toThrow(DbError);
		});
	});

	describe('dbInsert', () => {
		it('should correctly format IPC call with table, columns, and values', async () => {
			mockInvoke.mockResolvedValueOnce(42);

			const result = await dbInsert('users', ['name', 'email'], ['John', 'john@example.com']);

			expect(mockInvoke).toHaveBeenCalledWith('db_insert', {
				table: 'users',
				columns: ['name', 'email'],
				values: ['John', 'john@example.com']
			});
			expect(result).toBe(42);
		});

		it('should handle error responses gracefully', async () => {
			mockInvoke.mockRejectedValueOnce(new Error('Table does not exist'));

			await expect(dbInsert('nonexistent', ['col'], ['val'])).rejects.toThrow(DbError);
			expect(mockInvoke).toHaveBeenCalled();
		});
	});

	describe('dbUpdate', () => {
		it('should correctly format IPC call', async () => {
			mockInvoke.mockResolvedValueOnce(1);

			const result = await dbUpdate('users', ['name'], ['Jane'], 'id', '1');

			expect(mockInvoke).toHaveBeenCalledWith('db_update', {
				table: 'users',
				setColumns: ['name'],
				setValues: ['Jane'],
				whereColumn: 'id',
				whereValue: '1'
			});
			expect(result).toBe(1);
		});

		it('should handle error responses gracefully', async () => {
			mockInvoke.mockRejectedValueOnce(new Error('Update failed'));

			await expect(dbUpdate('users', ['name'], ['Jane'], 'id', '1')).rejects.toThrow(DbError);
		});
	});

	describe('dbDelete', () => {
		it('should correctly format IPC call', async () => {
			mockInvoke.mockResolvedValueOnce(1);

			const result = await dbDelete('users', 'id', '1');

			expect(mockInvoke).toHaveBeenCalledWith('db_delete', {
				table: 'users',
				whereColumn: 'id',
				whereValue: '1'
			});
			expect(result).toBe(1);
		});

		it('should handle error responses gracefully', async () => {
			mockInvoke.mockRejectedValueOnce(new Error('Delete failed'));

			await expect(dbDelete('users', 'id', '1')).rejects.toThrow(DbError);
		});
	});

	describe('dbSelect', () => {
		it('should correctly format IPC call with all parameters', async () => {
			mockInvoke.mockResolvedValueOnce([['1', 'John']]);

			const result = await dbSelect('users', ['id', 'name'], "id = '1'");

			expect(mockInvoke).toHaveBeenCalledWith('db_select', {
				table: 'users',
				columns: ['id', 'name'],
				whereClause: "id = '1'"
			});
			expect(result).toEqual([['1', 'John']]);
		});

		it('should handle optional whereClause', async () => {
			mockInvoke.mockResolvedValueOnce([]);

			await dbSelect('users', ['id']);

			expect(mockInvoke).toHaveBeenCalledWith('db_select', {
				table: 'users',
				columns: ['id'],
				whereClause: null
			});
		});

		it('should handle empty columns array', async () => {
			mockInvoke.mockResolvedValueOnce([]);

			await dbSelect('users');

			expect(mockInvoke).toHaveBeenCalledWith('db_select', {
				table: 'users',
				columns: [],
				whereClause: null
			});
		});

		it('should handle error responses gracefully', async () => {
			mockInvoke.mockRejectedValueOnce(new Error('Select failed'));

			await expect(dbSelect('users')).rejects.toThrow(DbError);
		});
	});

	describe('DbError', () => {
		it('should create error with message and code', () => {
			const error = new DbError('Test error', 'TEST_CODE');

			expect(error.message).toBe('Test error');
			expect(error.code).toBe('TEST_CODE');
			expect(error.name).toBe('DbError');
			expect(error).toBeInstanceOf(Error);
		});

		it('should create error with message only', () => {
			const error = new DbError('Test error');

			expect(error.message).toBe('Test error');
			expect(error.code).toBeUndefined();
		});
	});
});
