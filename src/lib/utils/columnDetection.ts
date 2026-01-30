/**
 * Auto-detection of CSV column mappings.
 * Matches common header names (English, Dutch, German) to transaction fields.
 */

export type MappableField = 'date' | 'payee' | 'amount' | 'inflow' | 'outflow' | 'memo' | 'category' | 'account' | 'skip';

export interface ColumnMapping {
	columnIndex: number;
	columnHeader: string;
	sampleValue: string;
	field: MappableField;
}

export const FIELD_LABELS: Record<MappableField, string> = {
	date: 'Date',
	payee: 'Payee',
	amount: 'Amount',
	inflow: 'Inflow',
	outflow: 'Outflow',
	memo: 'Memo',
	category: 'Category',
	account: 'Account',
	skip: 'Skip this column'
};

export const REQUIRED_FIELDS: Exclude<MappableField, 'skip'>[] = ['date', 'payee'];

/** Patterns for auto-detecting column purpose from header name. Case-insensitive. */
const HEADER_PATTERNS: Record<MappableField, string[]> = {
	date: ['date', 'datum', 'transaction date', 'trade date', 'booking date', 'value date', 'fecha', 'created on'],
	payee: ['description', 'payee', 'name', 'omschrijving', 'beschreibung', 'merchant', 'counterparty', 'counterparty_name', 'recipient', 'beneficiary', 'target name'],
	amount: ['amount', 'amount_eur', 'bedrag', 'betrag', 'value', 'sum', 'total', 'importe', 'monto', 'source amount (after fees)'],
	inflow: ['inflow', 'credit', 'deposit', 'bij', 'eingang', 'income'],
	outflow: ['outflow', 'debit', 'withdrawal', 'af', 'ausgang', 'expense'],
	memo: ['memo', 'notes', 'reference', 'remarks', 'notizen', 'opmerkingen', 'comment', 'note'],
	category: ['category', 'type', 'categorie', 'kategorie'],
	account: ['account', 'account name', 'konto', 'rekening', 'cuenta', 'compte'],
	skip: []
};

/**
 * Auto-detect column mappings from CSV headers and first data row.
 * Returns suggested mappings for each column.
 */
export function autoDetectMappings(headers: string[], firstRow: string[]): ColumnMapping[] {
	const usedFields = new Set<MappableField>();
	const mappings: ColumnMapping[] = [];

	for (let i = 0; i < headers.length; i++) {
		const header = headers[i];
		const sample = firstRow[i] ?? '';
		const detected = detectFieldFromHeader(header, usedFields);

		if (detected && detected !== 'skip') {
			usedFields.add(detected);
		}

		mappings.push({
			columnIndex: i,
			columnHeader: header,
			sampleValue: sample,
			field: detected
		});
	}

	return mappings;
}

/**
 * Detect field type from a column header string.
 */
/** Headers that should be skipped even if they contain a matching pattern keyword. */
const HEADER_SKIP_PATTERNS = ['fee', 'interest date', 'source name', 'created by'];

function detectFieldFromHeader(header: string, usedFields: Set<MappableField>): MappableField {
	const normalized = header.toLowerCase().trim();

	// Pass 1: exact matches only (highest priority)
	for (const [field, patterns] of Object.entries(HEADER_PATTERNS)) {
		if (field === 'skip') continue;
		const mappableField = field as MappableField;
		if (usedFields.has(mappableField)) continue;

		for (const pattern of patterns) {
			if (normalized === pattern) {
				return mappableField;
			}
		}
	}

	// Pass 2: substring matches (lower priority), but skip fee/interest columns
	const shouldSkip = HEADER_SKIP_PATTERNS.some((skip) => normalized.includes(skip));
	if (!shouldSkip) {
		for (const [field, patterns] of Object.entries(HEADER_PATTERNS)) {
			if (field === 'skip') continue;
			const mappableField = field as MappableField;
			if (usedFields.has(mappableField)) continue;

			for (const pattern of patterns) {
				if (normalized.includes(pattern)) {
					return mappableField;
				}
			}
		}
	}

	return 'skip';
}

/**
 * Validate that all required fields are mapped.
 * Returns list of missing required fields, or empty array if valid.
 * Amount is required unless both inflow and outflow are mapped.
 */
export function validateMappings(mappings: ColumnMapping[]): string[] {
	const mappedFields = new Set(mappings.map((m) => m.field).filter((f) => f !== 'skip'));
	const missing: string[] = [];

	// Check Date and Payee
	for (const field of REQUIRED_FIELDS) {
		if (!mappedFields.has(field)) {
			missing.push(`Please map the ${FIELD_LABELS[field]} column`);
		}
	}

	// Check Amount: need either 'amount' OR both 'inflow' and 'outflow'
	const hasAmount = mappedFields.has('amount');
	const hasInflow = mappedFields.has('inflow');
	const hasOutflow = mappedFields.has('outflow');

	if (!hasAmount && !(hasInflow && hasOutflow)) {
		if (hasInflow || hasOutflow) {
			// Has one but not the other
			if (!hasInflow) missing.push('Please map the Inflow column (or use single Amount column)');
			if (!hasOutflow) missing.push('Please map the Outflow column (or use single Amount column)');
		} else {
			missing.push('Please map the Amount column');
		}
	}

	return missing;
}

/**
 * Get the available field options for a dropdown, excluding already-used fields.
 * Always includes 'skip' and the field currently assigned to this column.
 * When useInflowOutflow is true, hides 'amount'; when false, hides 'inflow'/'outflow'.
 */
export function getAvailableFields(
	mappings: ColumnMapping[],
	currentIndex: number,
	useInflowOutflow: boolean = false
): { value: MappableField; label: string }[] {
	const usedFields = new Set(
		mappings
			.filter((m, i) => i !== currentIndex && m.field !== 'skip')
			.map((m) => m.field)
	);

	const currentField = mappings[currentIndex]?.field;
	const options: { value: MappableField; label: string }[] = [];

	// Determine which amount fields to hide based on mode
	const hiddenFields = new Set<MappableField>(
		useInflowOutflow ? ['amount'] : ['inflow', 'outflow']
	);

	for (const [field, label] of Object.entries(FIELD_LABELS)) {
		const f = field as MappableField;
		// Hide fields based on amount mode
		if (hiddenFields.has(f) && f !== currentField) continue;
		if (f === 'skip' || f === currentField || !usedFields.has(f)) {
			options.push({ value: f, label });
		}
	}

	return options;
}

/**
 * Check if current mappings use inflow/outflow mode (vs single amount).
 */
export function isInflowOutflowMode(mappings: ColumnMapping[]): boolean {
	const fields = new Set(mappings.map((m) => m.field));
	return fields.has('inflow') || fields.has('outflow');
}

/**
 * Toggle amount mode: switch between single 'amount' and separate 'inflow'/'outflow'.
 * Clears existing amount-related mappings when toggling.
 */
export function toggleAmountMode(mappings: ColumnMapping[], useInflowOutflow: boolean): ColumnMapping[] {
	return mappings.map((m) => {
		if (useInflowOutflow && m.field === 'amount') {
			return { ...m, field: 'skip' as MappableField };
		}
		if (!useInflowOutflow && (m.field === 'inflow' || m.field === 'outflow')) {
			return { ...m, field: 'skip' as MappableField };
		}
		return m;
	});
}

/**
 * Parse a raw amount string to cents.
 * Handles European comma decimals (1.234,56) and US period decimals (1,234.56).
 * Handles negative values and currency symbols.
 */
export function parseRawAmountToCents(raw: string): number {
	if (!raw || !raw.trim()) return 0;

	let cleaned = raw.trim();

	// Remove currency symbols and whitespace
	cleaned = cleaned.replace(/[€$£¥C\s]/g, '');

	// Determine decimal format
	const lastComma = cleaned.lastIndexOf(',');
	const lastPeriod = cleaned.lastIndexOf('.');

	if (lastComma > lastPeriod) {
		// European: 1.234,56 -> 1234.56
		cleaned = cleaned.replace(/\./g, '').replace(',', '.');
	} else {
		// US: 1,234.56 -> 1234.56
		cleaned = cleaned.replace(/,/g, '');
	}

	const value = parseFloat(cleaned);
	if (isNaN(value)) return 0;

	return Math.round(value * 100);
}

/**
 * Parse a raw date string to YYYY-MM-DD format.
 * Handles DD/MM/YYYY, MM/DD/YYYY, YYYY-MM-DD, DD-MM-YYYY, and ISO datetime.
 */
export function parseRawDate(raw: string): string | null {
	if (!raw || !raw.trim()) return null;
	const trimmed = raw.trim();

	// ISO datetime: 2025-01-28T10:30:00Z or 2025-01-28 10:30:00 -> 2025-01-28
	const isoDatetime = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})[T ]\d{2}:\d{2}/);
	if (isoDatetime) {
		return `${isoDatetime[1]}-${isoDatetime[2]}-${isoDatetime[3]}`;
	}

	// ISO: YYYY-MM-DD
	const iso = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
	if (iso) {
		const m = iso[2].padStart(2, '0');
		const d = iso[3].padStart(2, '0');
		return `${iso[1]}-${m}-${d}`;
	}

	// DD/MM/YYYY or DD-MM-YYYY
	const dmy = trimmed.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/);
	if (dmy) {
		const first = parseInt(dmy[1], 10);
		const second = parseInt(dmy[2], 10);
		const year = dmy[3];

		// If first > 12, it must be day (DD/MM/YYYY)
		if (first > 12) {
			return `${year}-${String(second).padStart(2, '0')}-${String(first).padStart(2, '0')}`;
		}
		// If second > 12, it must be day (MM/DD/YYYY)
		if (second > 12) {
			return `${year}-${String(first).padStart(2, '0')}-${String(second).padStart(2, '0')}`;
		}
		// Ambiguous: default to DD/MM/YYYY (European preference)
		return `${year}-${String(second).padStart(2, '0')}-${String(first).padStart(2, '0')}`;
	}

	return null;
}

/**
 * Build a preview transaction from a CSV row using current mappings.
 */
export interface PreviewTransaction {
	date: string;
	payee: string;
	amountCents: number;
	memo: string;
	category: string;
	account: string;
}

/**
 * Per-row parsing error with context.
 */
export interface RowParseError {
	row: number;
	column: string;
	value: string;
	message: string;
}

/**
 * Result of building preview transactions from CSV rows.
 */
export interface PreviewBuildResult {
	transactions: PreviewTransaction[];
	errors: RowParseError[];
}

export function buildPreviewTransaction(
	row: string[],
	mappings: ColumnMapping[]
): PreviewTransaction {
	const preview: PreviewTransaction = {
		date: '',
		payee: '',
		amountCents: 0,
		memo: '',
		category: '',
		account: ''
	};

	for (const mapping of mappings) {
		const value = row[mapping.columnIndex] ?? '';
		switch (mapping.field) {
			case 'date':
				preview.date = parseRawDate(value) ?? value;
				break;
			case 'payee':
				preview.payee = value;
				break;
			case 'amount':
				preview.amountCents = parseRawAmountToCents(value);
				break;
			case 'inflow':
				preview.amountCents += Math.abs(parseRawAmountToCents(value));
				break;
			case 'outflow':
				preview.amountCents -= Math.abs(parseRawAmountToCents(value));
				break;
			case 'memo':
				preview.memo = value;
				break;
			case 'category':
				preview.category = value;
				break;
			case 'account':
				preview.account = value;
				break;
		}
	}

	return preview;
}

/**
 * Build preview transactions from all CSV rows with per-row error tracking.
 * Valid rows produce transactions; invalid rows produce errors with row context.
 */
export function buildPreviewTransactions(
	rows: string[][],
	mappings: ColumnMapping[]
): PreviewBuildResult {
	const transactions: PreviewTransaction[] = [];
	const errors: RowParseError[] = [];

	for (let i = 0; i < rows.length; i++) {
		const row = rows[i];
		const rowNumber = i + 2; // +2 because row 1 is headers, data starts at row 2
		const preview = buildPreviewTransaction(row, mappings);
		const rowErrors: RowParseError[] = [];

		// Validate date
		const dateMapping = mappings.find((m) => m.field === 'date');
		if (dateMapping) {
			const rawDate = row[dateMapping.columnIndex] ?? '';
			if (!rawDate.trim()) {
				rowErrors.push({
					row: rowNumber,
					column: dateMapping.columnHeader,
					value: rawDate,
					message: `Row ${rowNumber}: Missing date value in "${dateMapping.columnHeader}" column`
				});
			} else if (!parseRawDate(rawDate)) {
				rowErrors.push({
					row: rowNumber,
					column: dateMapping.columnHeader,
					value: rawDate,
					message: `Row ${rowNumber}: Could not parse date "${rawDate}" in "${dateMapping.columnHeader}" column`
				});
			}
		}

		// Validate payee
		const payeeMapping = mappings.find((m) => m.field === 'payee');
		if (payeeMapping) {
			const rawPayee = row[payeeMapping.columnIndex] ?? '';
			if (!rawPayee.trim()) {
				rowErrors.push({
					row: rowNumber,
					column: payeeMapping.columnHeader,
					value: rawPayee,
					message: `Row ${rowNumber}: Missing payee value in "${payeeMapping.columnHeader}" column`
				});
			}
		}

		// Validate amount
		const amountMapping = mappings.find((m) => m.field === 'amount');
		if (amountMapping) {
			const rawAmount = row[amountMapping.columnIndex] ?? '';
			if (rawAmount.trim() && parseRawAmountToCents(rawAmount) === 0 && !/^[0.,\s€$£¥C]*$/.test(rawAmount)) {
				rowErrors.push({
					row: rowNumber,
					column: amountMapping.columnHeader,
					value: rawAmount,
					message: `Row ${rowNumber}: Could not parse amount "${rawAmount}" in "${amountMapping.columnHeader}" column`
				});
			}
		}

		if (rowErrors.length > 0) {
			errors.push(...rowErrors);
		}

		// Always include the transaction (even with errors) to preserve row indices
		transactions.push(preview);
	}

	return { transactions, errors };
}

/**
 * Import mapping template for saving/loading user-defined column mappings.
 */
export interface ImportTemplate {
	name: string;
	mappings: { columnHeader: string; field: MappableField }[];
	useInflowOutflow: boolean;
}
