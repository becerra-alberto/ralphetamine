import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import MonthHeader from '../../../components/budget/MonthHeader.svelte';

describe('MonthHeader', () => {
	it('should render with abbreviated month name', () => {
		render(MonthHeader, { props: { month: '2025-01', isCurrent: false } });
		expect(screen.getByText('Jan')).toBeInTheDocument();
	});

	it('should render all month abbreviations correctly', () => {
		const monthTests = [
			{ month: '2025-01', expected: 'Jan' },
			{ month: '2025-02', expected: 'Feb' },
			{ month: '2025-03', expected: 'Mar' },
			{ month: '2025-04', expected: 'Apr' },
			{ month: '2025-05', expected: 'May' },
			{ month: '2025-06', expected: 'Jun' },
			{ month: '2025-07', expected: 'Jul' },
			{ month: '2025-08', expected: 'Aug' },
			{ month: '2025-09', expected: 'Sep' },
			{ month: '2025-10', expected: 'Oct' },
			{ month: '2025-11', expected: 'Nov' },
			{ month: '2025-12', expected: 'Dec' }
		];

		for (const { month, expected } of monthTests) {
			const { unmount } = render(MonthHeader, { props: { month, isCurrent: false } });
			expect(screen.getByText(expected)).toBeInTheDocument();
			unmount();
		}
	});

	it('should have columnheader role', () => {
		render(MonthHeader, { props: { month: '2025-06', isCurrent: false } });
		expect(screen.getByRole('columnheader')).toBeInTheDocument();
	});

	it('should have aria-label with month name', () => {
		render(MonthHeader, { props: { month: '2025-06', isCurrent: false } });
		expect(screen.getByRole('columnheader', { name: 'Jun' })).toBeInTheDocument();
	});

	it('should apply current class when isCurrent is true', () => {
		render(MonthHeader, { props: { month: '2025-06', isCurrent: true } });
		const header = screen.getByRole('columnheader');
		expect(header.classList.contains('current')).toBe(true);
	});

	it('should not apply current class when isCurrent is false', () => {
		render(MonthHeader, { props: { month: '2025-06', isCurrent: false } });
		const header = screen.getByRole('columnheader');
		expect(header.classList.contains('current')).toBe(false);
	});
});
