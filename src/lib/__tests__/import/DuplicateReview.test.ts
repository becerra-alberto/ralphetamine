import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import DuplicateReview from '../../components/import/DuplicateReview.svelte';
import type { DuplicateMatch } from '../../utils/duplicateDetection';

const sampleDuplicates: DuplicateMatch[] = [
	{
		importIndex: 0,
		imported: { date: '2025-01-15', payee: 'Albert Heijn', amountCents: -5000, memo: '', category: '' },
		existing: {
			id: 'tx-1', date: '2025-01-15', payee: 'Albert Heijn', amountCents: -5000,
			categoryId: null, memo: '', accountId: 'acc-1', tags: [],
			isReconciled: false, importSource: null, createdAt: '', updatedAt: ''
		},
		confidence: 'exact',
		include: false
	},
	{
		importIndex: 2,
		imported: { date: '2025-01-20', payee: 'Jumbo B.V.', amountCents: -3000, memo: '', category: '' },
		existing: {
			id: 'tx-2', date: '2025-01-20', payee: 'Jumbo', amountCents: -3000,
			categoryId: null, memo: '', accountId: 'acc-1', tags: [],
			isReconciled: false, importSource: null, createdAt: '', updatedAt: ''
		},
		confidence: 'likely',
		include: false
	}
];

describe('DuplicateReview', () => {
	it('should render duplicate review component', () => {
		render(DuplicateReview, { props: { duplicates: sampleDuplicates } });
		expect(screen.getByTestId('duplicate-review')).toBeTruthy();
	});

	it('should display review title with correct count', () => {
		render(DuplicateReview, { props: { duplicates: sampleDuplicates } });
		const title = screen.getByTestId('duplicate-review-title').textContent;
		expect(title).toContain('2');
		expect(title).toContain('duplicates');
	});

	it('should display singular form for one duplicate', () => {
		render(DuplicateReview, { props: { duplicates: [sampleDuplicates[0]] } });
		const title = screen.getByTestId('duplicate-review-title').textContent;
		expect(title).toContain('1');
		expect(title).not.toContain('duplicates');
	});

	it('should render a card for each duplicate', () => {
		render(DuplicateReview, { props: { duplicates: sampleDuplicates } });
		expect(screen.getByTestId('duplicate-review-item-0')).toBeTruthy();
		expect(screen.getByTestId('duplicate-review-item-1')).toBeTruthy();
	});

	it('should show import vs existing comparison', () => {
		render(DuplicateReview, { props: { duplicates: sampleDuplicates } });
		expect(screen.getAllByText('Albert Heijn').length).toBeGreaterThanOrEqual(1);
		expect(screen.getAllByText('Import').length).toBeGreaterThanOrEqual(1);
		expect(screen.getAllByText('Existing').length).toBeGreaterThanOrEqual(1);
	});

	it('should show confidence badge', () => {
		render(DuplicateReview, { props: { duplicates: sampleDuplicates } });
		expect(screen.getByTestId('duplicate-review-item-0-confidence').textContent?.trim()).toBe('Exact match');
		expect(screen.getByTestId('duplicate-review-item-1-confidence').textContent?.trim()).toBe('Likely match');
	});

	it('should show checkbox for each duplicate', () => {
		render(DuplicateReview, { props: { duplicates: sampleDuplicates } });
		const cb0 = screen.getByTestId('duplicate-review-item-0-checkbox') as HTMLInputElement;
		const cb1 = screen.getByTestId('duplicate-review-item-1-checkbox') as HTMLInputElement;
		expect(cb0.checked).toBe(false);
		expect(cb1.checked).toBe(false);
	});

	it('should show "Skip this transaction" label when not included', () => {
		render(DuplicateReview, { props: { duplicates: sampleDuplicates } });
		expect(screen.getAllByText('Skip this transaction').length).toBe(2);
	});

	it('should show "These look like the same transaction" hint', () => {
		render(DuplicateReview, { props: { duplicates: sampleDuplicates } });
		const hints = screen.getAllByText('These look like the same transaction');
		expect(hints.length).toBe(2);
	});

	it('should accept custom testId', () => {
		render(DuplicateReview, { props: { duplicates: sampleDuplicates, testId: 'custom-dup' } });
		expect(screen.getByTestId('custom-dup')).toBeTruthy();
	});
});
