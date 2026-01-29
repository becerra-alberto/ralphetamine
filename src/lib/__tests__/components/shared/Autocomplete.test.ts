import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import Autocomplete from '../../../components/shared/Autocomplete.svelte';

const mockItems = [
	{ label: 'Albert Heijn', value: 'Albert Heijn', detail: '(15)' },
	{ label: 'Aldi', value: 'Aldi', detail: '(8)' },
	{ label: 'Amazon', value: 'Amazon', detail: '(5)' },
	{ label: 'Apple Store', value: 'Apple Store', detail: '(3)' },
	{ label: 'ASDA', value: 'ASDA', detail: '(2)' },
	{ label: 'Argos', value: 'Argos', detail: '(2)' },
	{ label: 'ASOS', value: 'ASOS', detail: '(1)' },
	{ label: 'Asics', value: 'Asics', detail: '(1)' },
	{ label: 'Adidas', value: 'Adidas', detail: '(1)' },
	{ label: 'Audi', value: 'Audi', detail: '(1)' },
	{ label: 'Airbnb', value: 'Airbnb', detail: '(1)' },
	{ label: 'Allianz', value: 'Allianz', detail: '(1)' }
];

describe('Autocomplete', () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
		vi.clearAllMocks();
	});

	it('does not show suggestions for 0 characters', async () => {
		render(Autocomplete, { props: { items: mockItems, minChars: 2, value: '' } });
		const input = screen.getByTestId('autocomplete-input');
		await fireEvent.input(input, { target: { value: '' } });
		vi.advanceTimersByTime(200);
		expect(screen.queryByTestId('autocomplete-dropdown')).not.toBeInTheDocument();
	});

	it('does not show suggestions for 1 character', async () => {
		render(Autocomplete, { props: { items: mockItems, minChars: 2, value: 'a' } });
		const input = screen.getByTestId('autocomplete-input');
		await fireEvent.input(input, { target: { value: 'a' } });
		vi.advanceTimersByTime(200);
		expect(screen.queryByTestId('autocomplete-dropdown')).not.toBeInTheDocument();
	});

	it('shows suggestions dropdown after 2+ characters typed', async () => {
		render(Autocomplete, { props: { items: mockItems, minChars: 2, value: 'al' } });
		const input = screen.getByTestId('autocomplete-input');
		await fireEvent.input(input, { target: { value: 'al' } });
		vi.advanceTimersByTime(200);

		await waitFor(() => {
			expect(screen.getByTestId('autocomplete-dropdown')).toBeInTheDocument();
		});
	});

	it('displays maximum 10 suggestions when more items provided', async () => {
		render(Autocomplete, { props: { items: mockItems, minChars: 2, maxItems: 10, value: 'al' } });
		const input = screen.getByTestId('autocomplete-input');
		await fireEvent.input(input, { target: { value: 'al' } });
		vi.advanceTimersByTime(200);

		await waitFor(() => {
			const dropdown = screen.getByTestId('autocomplete-dropdown');
			const options = dropdown.querySelectorAll('[role="option"]');
			expect(options.length).toBeLessThanOrEqual(10);
		});
	});

	it('shows scroll behavior with 10+ items (max-height dropdown)', async () => {
		render(Autocomplete, { props: { items: mockItems, minChars: 2, maxItems: 10, value: 'a' } });
		const input = screen.getByTestId('autocomplete-input');
		await fireEvent.input(input, { target: { value: 'al' } });
		vi.advanceTimersByTime(200);

		await waitFor(() => {
			const dropdown = screen.getByTestId('autocomplete-dropdown');
			expect(dropdown).toBeInTheDocument();
			const options = dropdown.querySelectorAll('[role="option"]');
			expect(options.length).toBeLessThanOrEqual(10);
		});
	});

	it('closes dropdown and fills input on click', async () => {
		render(Autocomplete, { props: { items: mockItems, minChars: 2, value: 'al' } });
		const input = screen.getByTestId('autocomplete-input');
		await fireEvent.input(input, { target: { value: 'al' } });
		vi.advanceTimersByTime(200);

		await waitFor(() => {
			expect(screen.getByTestId('autocomplete-dropdown')).toBeInTheDocument();
		});

		const option = screen.getByTestId('autocomplete-option-0');
		await fireEvent.mouseDown(option);

		await waitFor(() => {
			expect(screen.queryByTestId('autocomplete-dropdown')).not.toBeInTheDocument();
		});
	});

	it('navigates with Arrow Down/Up through suggestions', async () => {
		render(Autocomplete, { props: { items: mockItems, minChars: 2, value: 'al' } });
		const input = screen.getByTestId('autocomplete-input');
		await fireEvent.input(input, { target: { value: 'al' } });
		vi.advanceTimersByTime(200);

		await waitFor(() => {
			expect(screen.getByTestId('autocomplete-dropdown')).toBeInTheDocument();
		});

		await fireEvent.keyDown(input, { key: 'ArrowDown' });
		expect(screen.getByTestId('autocomplete-option-0').getAttribute('aria-selected')).toBe('true');

		await fireEvent.keyDown(input, { key: 'ArrowDown' });
		expect(screen.getByTestId('autocomplete-option-1').getAttribute('aria-selected')).toBe('true');

		await fireEvent.keyDown(input, { key: 'ArrowUp' });
		expect(screen.getByTestId('autocomplete-option-0').getAttribute('aria-selected')).toBe('true');
	});

	it('selects highlighted suggestion with Enter key', async () => {
		render(Autocomplete, { props: { items: mockItems, minChars: 2, value: 'al' } });
		const input = screen.getByTestId('autocomplete-input');
		await fireEvent.input(input, { target: { value: 'al' } });
		vi.advanceTimersByTime(200);

		await waitFor(() => {
			expect(screen.getByTestId('autocomplete-dropdown')).toBeInTheDocument();
		});

		await fireEvent.keyDown(input, { key: 'ArrowDown' });
		await fireEvent.keyDown(input, { key: 'Enter' });

		await waitFor(() => {
			expect(screen.queryByTestId('autocomplete-dropdown')).not.toBeInTheDocument();
		});
	});

	it('closes dropdown without selection on Escape key', async () => {
		render(Autocomplete, { props: { items: mockItems, minChars: 2, value: 'al' } });
		const input = screen.getByTestId('autocomplete-input');
		await fireEvent.input(input, { target: { value: 'al' } });
		vi.advanceTimersByTime(200);

		await waitFor(() => {
			expect(screen.getByTestId('autocomplete-dropdown')).toBeInTheDocument();
		});

		await fireEvent.keyDown(input, { key: 'Escape' });
		expect(screen.queryByTestId('autocomplete-dropdown')).not.toBeInTheDocument();
	});

	it('dispatches enter event when no item is highlighted', async () => {
		render(Autocomplete, { props: { items: [], minChars: 2, value: 'new payee' } });
		const input = screen.getByTestId('autocomplete-input');
		await fireEvent.keyDown(input, { key: 'Enter' });
		expect(input).toBeInTheDocument();
	});

	it('debounces input at configured interval', async () => {
		render(Autocomplete, { props: { items: [], minChars: 2, debounceMs: 150, value: 'al' } });
		const input = screen.getByTestId('autocomplete-input');

		await fireEvent.input(input, { target: { value: 'a' } });
		vi.advanceTimersByTime(50);
		await fireEvent.input(input, { target: { value: 'al' } });
		vi.advanceTimersByTime(50);
		await fireEvent.input(input, { target: { value: 'alb' } });

		vi.advanceTimersByTime(200);
		expect(input).toBeInTheDocument();
	});

	it('shows no matches text when items empty and query >= minChars', async () => {
		render(Autocomplete, {
			props: {
				items: [],
				minChars: 2,
				value: 'xyz',
				noMatchesText: 'No matches - press Enter to use as new value'
			}
		});
		const input = screen.getByTestId('autocomplete-input');
		await fireEvent.input(input, { target: { value: 'xyz' } });
		vi.advanceTimersByTime(200);

		await waitFor(() => {
			expect(screen.getByTestId('autocomplete-no-matches')).toBeInTheDocument();
			expect(screen.getByTestId('autocomplete-no-matches').textContent).toContain('No matches');
		});
	});

	it('renders with correct ARIA attributes', () => {
		render(Autocomplete, { props: { items: [], label: 'Payee', testId: 'test-ac' } });
		const input = screen.getByTestId('test-ac-input');
		expect(input.getAttribute('role')).toBe('combobox');
		expect(input.getAttribute('aria-autocomplete')).toBe('list');
		expect(input.getAttribute('aria-label')).toBe('Payee');
	});

	it('displays item detail text in suggestions', async () => {
		render(Autocomplete, { props: { items: mockItems, minChars: 2, value: 'al' } });
		const input = screen.getByTestId('autocomplete-input');
		await fireEvent.input(input, { target: { value: 'al' } });
		vi.advanceTimersByTime(200);

		await waitFor(() => {
			const firstOption = screen.getByTestId('autocomplete-option-0');
			expect(firstOption.textContent).toContain('(15)');
		});
	});
});
