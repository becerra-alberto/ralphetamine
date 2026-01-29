/**
 * CSV parser utility for importing transaction files.
 * Handles parsing, validation, and preview generation.
 */

export interface CsvParseResult {
	headers: string[];
	rows: string[][];
	totalRows: number;
}

export interface CsvParseError {
	type: 'empty' | 'invalid' | 'encoding' | 'too-large';
	message: string;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

/**
 * Parse a CSV string into headers and rows.
 * Handles quoted fields, embedded commas, and newlines within quotes.
 */
export function parseCsv(content: string): CsvParseResult {
	const lines = splitCsvLines(content.trim());
	if (lines.length === 0) {
		return { headers: [], rows: [], totalRows: 0 };
	}

	// Detect delimiter from header line and use consistently for all rows
	const delimiter = detectDelimiter(lines[0]);
	const headers = parseCsvLine(lines[0], delimiter);
	const rows: string[][] = [];

	for (let i = 1; i < lines.length; i++) {
		const row = parseCsvLine(lines[i], delimiter);
		if (row.length > 0 && !(row.length === 1 && row[0] === '')) {
			rows.push(row);
		}
	}

	return { headers, rows, totalRows: rows.length };
}

/**
 * Split CSV content into logical lines, respecting quoted fields.
 */
function splitCsvLines(content: string): string[] {
	const lines: string[] = [];
	let current = '';
	let inQuotes = false;

	for (let i = 0; i < content.length; i++) {
		const char = content[i];

		if (char === '"') {
			inQuotes = !inQuotes;
			current += char;
		} else if ((char === '\n' || char === '\r') && !inQuotes) {
			if (char === '\r' && content[i + 1] === '\n') {
				i++; // skip \r\n
			}
			if (current.trim()) {
				lines.push(current);
			}
			current = '';
		} else {
			current += char;
		}
	}

	if (current.trim()) {
		lines.push(current);
	}

	return lines;
}

/**
 * Parse a single CSV line into fields.
 * Handles quoted fields with embedded commas and escaped quotes ("").
 */
function parseCsvLine(line: string, delimiter: string = ','): string[] {
	const fields: string[] = [];
	let current = '';
	let inQuotes = false;
	let i = 0;

	while (i < line.length) {
		const char = line[i];

		if (char === '"') {
			if (inQuotes && line[i + 1] === '"') {
				// Escaped quote
				current += '"';
				i += 2;
				continue;
			}
			inQuotes = !inQuotes;
			i++;
			continue;
		}

		if (char === delimiter && !inQuotes) {
			fields.push(current.trim());
			current = '';
			i++;
			continue;
		}

		current += char;
		i++;
	}

	fields.push(current.trim());
	return fields;
}

/**
 * Detect the delimiter used in a CSV line.
 * Checks for semicolons (common in European CSVs), tabs, then defaults to comma.
 */
function detectDelimiter(line: string): string {
	// Count delimiters outside quotes
	let commas = 0;
	let semicolons = 0;
	let tabs = 0;
	let inQuotes = false;

	for (const char of line) {
		if (char === '"') {
			inQuotes = !inQuotes;
		} else if (!inQuotes) {
			if (char === ',') commas++;
			else if (char === ';') semicolons++;
			else if (char === '\t') tabs++;
		}
	}

	if (semicolons > commas && semicolons > tabs) return ';';
	if (tabs > commas && tabs > semicolons) return '\t';
	return ',';
}

/**
 * Read file content as text using FileReader for broader compatibility.
 */
function readFileAsText(file: File): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => resolve(reader.result as string);
		reader.onerror = () => reject(reader.error);
		reader.readAsText(file);
	});
}

/**
 * Read and parse a CSV file.
 * Returns parsed result or an error.
 */
export async function readCsvFile(
	file: File
): Promise<{ ok: true; data: CsvParseResult } | { ok: false; error: CsvParseError }> {
	// Validate file type
	if (!isValidCsvFile(file)) {
		return {
			ok: false,
			error: {
				type: 'invalid',
				message: 'Please select a valid CSV file'
			}
		};
	}

	// Check file size
	if (file.size > MAX_FILE_SIZE) {
		return {
			ok: false,
			error: {
				type: 'too-large',
				message: 'File is too large. Maximum size is 10 MB.'
			}
		};
	}

	try {
		const content = await readFileAsText(file);

		if (!content.trim()) {
			return {
				ok: false,
				error: {
					type: 'empty',
					message: 'The file is empty'
				}
			};
		}

		const result = parseCsv(content);

		if (result.headers.length === 0) {
			return {
				ok: false,
				error: {
					type: 'invalid',
					message: 'No valid data found in CSV file'
				}
			};
		}

		return { ok: true, data: result };
	} catch {
		return {
			ok: false,
			error: {
				type: 'encoding',
				message: 'Failed to read file. The encoding may not be supported.'
			}
		};
	}
}

/**
 * Validate that a file is a CSV file by extension and MIME type.
 */
export function isValidCsvFile(file: File): boolean {
	const name = file.name.toLowerCase();
	if (name.endsWith('.csv')) return true;
	if (file.type === 'text/csv' || file.type === 'application/csv') return true;
	return false;
}

/**
 * Get a preview of the first N rows from parsed CSV data.
 */
export function getPreviewRows(data: CsvParseResult, maxRows: number = 5): string[][] {
	return data.rows.slice(0, maxRows);
}
