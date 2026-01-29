import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import YearHeader from '../../../components/budget/YearHeader.svelte';

describe('YearHeader', () => {
	it('should render year text', () => {
		render(YearHeader, { props: { year: 2025, monthCount: 6 } });
		expect(screen.getByText('2025')).toBeInTheDocument();
	});

	it('should have columnheader role', () => {
		render(YearHeader, { props: { year: 2025, monthCount: 6 } });
		expect(screen.getByRole('columnheader')).toBeInTheDocument();
	});

	it('should have aria-label with year', () => {
		render(YearHeader, { props: { year: 2025, monthCount: 6 } });
		expect(screen.getByRole('columnheader', { name: '2025' })).toBeInTheDocument();
	});

	it('should calculate width based on monthCount (120px per month)', () => {
		render(YearHeader, { props: { year: 2025, monthCount: 6 } });
		const header = screen.getByRole('columnheader');
		// 6 months * 120px = 720px
		expect(header.style.width).toBe('720px');
		expect(header.style.minWidth).toBe('720px');
	});

	it('should adjust width when monthCount changes', () => {
		const { unmount } = render(YearHeader, { props: { year: 2024, monthCount: 2 } });
		let header = screen.getByRole('columnheader');
		// 2 months * 120px = 240px
		expect(header.style.width).toBe('240px');
		unmount();

		render(YearHeader, { props: { year: 2025, monthCount: 12 } });
		header = screen.getByRole('columnheader');
		// 12 months * 120px = 1440px
		expect(header.style.width).toBe('1440px');
	});

	it('should span correct number of months for cross-year ranges', () => {
		// Simulating 2024 section spanning Nov-Dec (2 months)
		render(YearHeader, { props: { year: 2024, monthCount: 2 } });
		const header = screen.getByRole('columnheader');
		expect(header.style.width).toBe('240px');
	});
});
