import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import ColumnRow from '../../components/import/ColumnRow.svelte';
import type { ColumnMapping, MappableField } from '../../utils/columnDetection';

function makeMapping(overrides: Partial<ColumnMapping> = {}): ColumnMapping {
	return {
		columnIndex: 0,
		columnHeader: 'Date',
		sampleValue: '2025-01-01',
		field: 'date',
		...overrides
	};
}

function makeFields(...fields: MappableField[]): { value: MappableField; label: string }[] {
	const labels: Record<MappableField, string> = {
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
	return fields.map((f) => ({ value: f, label: labels[f] }));
}

describe('ColumnRow', () => {
	it('should render all available fields in dropdown', () => {
		const mapping = makeMapping();
		const availableFields = makeFields('date', 'payee', 'amount', 'memo', 'category', 'account', 'skip');

		render(ColumnRow, {
			props: { mapping, availableFields }
		});

		const select = screen.getByTestId('column-row-select') as HTMLSelectElement;
		const options = Array.from(select.options);
		const values = options.map((o) => o.value);

		expect(values).toContain('date');
		expect(values).toContain('payee');
		expect(values).toContain('amount');
		expect(values).toContain('memo');
		expect(values).toContain('category');
		expect(values).toContain('account');
		expect(values).toContain('skip');
		expect(options).toHaveLength(7);
	});

	it('should render column header and sample value', () => {
		const mapping = makeMapping({ columnHeader: 'Transaction Date', sampleValue: '2025-03-15' });
		const availableFields = makeFields('date', 'skip');

		render(ColumnRow, { props: { mapping, availableFields } });

		expect(screen.getByTestId('column-row-header').textContent).toBe('Transaction Date');
		expect(screen.getByTestId('column-row-sample').textContent).toBe('2025-03-15');
	});

	it('should display dash for empty sample value', () => {
		const mapping = makeMapping({ sampleValue: '' });
		const availableFields = makeFields('date', 'skip');

		render(ColumnRow, { props: { mapping, availableFields } });

		expect(screen.getByTestId('column-row-sample').textContent).toBe('—');
	});

	it('should render dropdown with updated fields when rerendered', () => {
		// First render: account is available
		const mapping = makeMapping({ field: 'skip' });
		const initialFields = makeFields('date', 'payee', 'amount', 'account', 'skip');

		const { unmount } = render(ColumnRow, {
			props: { mapping, availableFields: initialFields }
		});

		let select = screen.getByTestId('column-row-select') as HTMLSelectElement;
		let values = Array.from(select.options).map((o) => o.value);
		expect(values).toContain('account');

		unmount();

		// Second render: account is no longer available (taken by another column)
		const updatedFields = makeFields('date', 'payee', 'amount', 'skip');
		render(ColumnRow, {
			props: { mapping, availableFields: updatedFields }
		});

		select = screen.getByTestId('column-row-select') as HTMLSelectElement;
		values = Array.from(select.options).map((o) => o.value);
		expect(values).not.toContain('account');
	});

	it('should have current field selected in dropdown', () => {
		const mapping = makeMapping({ field: 'amount' });
		const availableFields = makeFields('amount', 'memo', 'skip');

		render(ColumnRow, { props: { mapping, availableFields } });

		const select = screen.getByTestId('column-row-select') as HTMLSelectElement;
		expect(select.value).toBe('amount');
	});

	it('should apply skipped styling when field is skip', () => {
		const mapping = makeMapping({ field: 'skip' });
		const availableFields = makeFields('date', 'skip');

		render(ColumnRow, { props: { mapping, availableFields } });

		const row = screen.getByTestId('column-row');
		expect(row.classList.contains('skipped')).toBe(true);
	});

	it('should accept custom testId', () => {
		const mapping = makeMapping();
		const availableFields = makeFields('date', 'skip');

		render(ColumnRow, { props: { mapping, availableFields, testId: 'my-row' } });

		expect(screen.getByTestId('my-row')).toBeTruthy();
		expect(screen.getByTestId('my-row-select')).toBeTruthy();
	});
});
