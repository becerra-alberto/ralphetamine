/**
 * Database client wrapper for Stackz
 *
 * Provides a TypeScript interface to the Tauri database commands.
 */

import { invoke } from '@tauri-apps/api/core';

/**
 * Health check response from the database
 */
export interface HealthCheckResponse {
	status: 'ok' | 'error';
	version: string;
}

/**
 * Execute response for INSERT/UPDATE/DELETE operations
 */
export interface ExecuteResponse {
	rows_affected: number;
	last_insert_id: number;
}

/**
 * Database error class
 */
export class DbError extends Error {
	constructor(
		message: string,
		public readonly code?: string
	) {
		super(message);
		this.name = 'DbError';
	}
}

/**
 * Check database health
 *
 * @returns Health check response with status and SQLite version
 * @throws DbError if the database is not available
 */
export async function dbHealthCheck(): Promise<HealthCheckResponse> {
	try {
		const response = await invoke<HealthCheckResponse>('db_health_check');
		return response;
	} catch (error) {
		throw new DbError(formatError(error), 'HEALTH_CHECK_FAILED');
	}
}

/**
 * Execute a raw SQL statement (INSERT, UPDATE, DELETE)
 *
 * @param sql - The SQL statement to execute
 * @returns Execute response with rows affected and last insert ID
 * @throws DbError if the execution fails
 */
export async function dbExecute(sql: string): Promise<ExecuteResponse> {
	try {
		const response = await invoke<ExecuteResponse>('db_execute', { sql });
		return response;
	} catch (error) {
		throw new DbError(formatError(error), 'EXECUTE_FAILED');
	}
}

/**
 * Insert a row into a table
 *
 * @param table - The table name
 * @param columns - Array of column names
 * @param values - Array of values (as strings)
 * @returns The new row ID
 * @throws DbError if the insert fails
 */
export async function dbInsert(table: string, columns: string[], values: string[]): Promise<number> {
	try {
		const id = await invoke<number>('db_insert', { table, columns, values });
		return id;
	} catch (error) {
		throw new DbError(formatError(error), 'INSERT_FAILED');
	}
}

/**
 * Update rows in a table
 *
 * @param table - The table name
 * @param setColumns - Array of column names to update
 * @param setValues - Array of new values
 * @param whereColumn - The column for the WHERE clause
 * @param whereValue - The value for the WHERE clause
 * @returns Number of rows affected
 * @throws DbError if the update fails
 */
export async function dbUpdate(
	table: string,
	setColumns: string[],
	setValues: string[],
	whereColumn: string,
	whereValue: string
): Promise<number> {
	try {
		const count = await invoke<number>('db_update', {
			table,
			setColumns,
			setValues,
			whereColumn,
			whereValue
		});
		return count;
	} catch (error) {
		throw new DbError(formatError(error), 'UPDATE_FAILED');
	}
}

/**
 * Delete rows from a table
 *
 * @param table - The table name
 * @param whereColumn - The column for the WHERE clause
 * @param whereValue - The value for the WHERE clause
 * @returns Number of rows deleted
 * @throws DbError if the delete fails
 */
export async function dbDelete(table: string, whereColumn: string, whereValue: string): Promise<number> {
	try {
		const count = await invoke<number>('db_delete', {
			table,
			whereColumn,
			whereValue
		});
		return count;
	} catch (error) {
		throw new DbError(formatError(error), 'DELETE_FAILED');
	}
}

/**
 * Select rows from a table
 *
 * @param table - The table name
 * @param columns - Array of column names (empty for all columns)
 * @param whereClause - Optional WHERE clause (without the WHERE keyword)
 * @returns Array of rows (each row is an array of string values)
 * @throws DbError if the select fails
 */
export async function dbSelect(
	table: string,
	columns: string[] = [],
	whereClause?: string
): Promise<string[][]> {
	try {
		const rows = await invoke<string[][]>('db_select', {
			table,
			columns,
			whereClause: whereClause ?? null
		});
		return rows;
	} catch (error) {
		throw new DbError(formatError(error), 'SELECT_FAILED');
	}
}

/**
 * Format an error from Tauri into a string
 */
function formatError(error: unknown): string {
	if (typeof error === 'string') {
		return error;
	}
	if (error instanceof Error) {
		return error.message;
	}
	return String(error);
}
