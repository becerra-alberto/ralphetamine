import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import PayeeInput from '../../../components/transactions/PayeeInput.svelte';
import { getPayeeSuggestions, getPayeeCategory } from '$lib/api/transactions';

// Mock the API module
const mockGetPayeeSuggestions = vi.fn();
const mockGetPayeeCategory = vi.fn();

vi.mock('$lib/api/transactions', () => ({
	getPayeeSuggestions: (...args: unknown[]) => mockGetPayeeSuggestions(...args),
	getPayeeCategory: (...args: unknown[]) => mockGetPayeeCategory(...args)
}));

const sortedSuggestions = [
	{ payee: 'Albert Heijn', frequency: 15 },
	{ payee: 'Aldi', frequency: 8 },
	{ payee: 'Amazon', frequency: 5 }
];

/**
 * Helper: types into the payee input, advances past the debounce timer,
 * and waits for the mocked getPayeeSuggestions API to have been called.
 */
async function typeAndWaitForSuggestions(input: HTMLElement, text: string) {
	await fireEvent.input(input, { target: { value: text } });
	await vi.advanceTimersByTimeAsync(200);
	await waitFor(() => {
		expect(mockGetPayeeSuggestions).toHaveBeenCalled();
	});
}

describe('PayeeInput', () => {
	beforeEach(() => {
		vi.useFakeTimers();
		vi.clearAllMocks();

		// Default: return sorted suggestions by frequency
		mockGetPayeeSuggestions.mockResolvedValue(sortedSuggestions);

		mockGetPayeeCategory.mockResolvedValue({
			payee: 'Albert Heijn',
			categoryId: 'cat-groceries',
			count: 15
		});
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	// -------------------------------------------------------
	// 1. Renders Autocomplete with correct props
	// -------------------------------------------------------
	describe('renders Autocomplete with correct props', () => {
		it('renders the payee autocomplete input', () => {
			render(PayeeInput);
			expect(screen.getByTestId('payee-autocomplete-input')).toBeInTheDocument();
		});

		it('renders input with placeholder "Payee"', () => {
			render(PayeeInput);
			const input = screen.getByTestId('payee-autocomplete-input');
			expect(input.getAttribute('placeholder')).toBe('Payee');
		});

		it('renders input with aria-label "Payee"', () => {
			render(PayeeInput);
			const input = screen.getByTestId('payee-autocomplete-input');
			expect(input.getAttribute('aria-label')).toBe('Payee');
		});

		it('uses testId "payee-autocomplete" for the wrapper', () => {
			render(PayeeInput);
			expect(screen.getByTestId('payee-autocomplete')).toBeInTheDocument();
		});

		it('renders input with role="combobox"', () => {
			render(PayeeInput);
			const input = screen.getByTestId('payee-autocomplete-input');
			expect(input.getAttribute('role')).toBe('combobox');
		});

		it('applies hasError class when hasError prop is true', () => {
			render(PayeeInput, { props: { value: '', hasError: true } });
			const input = screen.getByTestId('payee-autocomplete-input');
			expect(input.classList.contains('error')).toBe(true);
		});

		it('does not apply error class when hasError is false', () => {
			render(PayeeInput, { props: { value: '', hasError: false } });
			const input = screen.getByTestId('payee-autocomplete-input');
			expect(input.classList.contains('error')).toBe(false);
		});

		it('renders with the provided initial value', () => {
			render(PayeeInput, { props: { value: 'Initial Payee' } });
			const input = screen.getByTestId('payee-autocomplete-input') as HTMLInputElement;
			expect(input.value).toBe('Initial Payee');
		});
	});

	// -------------------------------------------------------
	// 2. Calls getPayeeSuggestions API on input
	// -------------------------------------------------------
	describe('calls getPayeeSuggestions API on input', () => {
		it('calls getPayeeSuggestions when user types 2+ characters', async () => {
			render(PayeeInput, { props: { value: '' } });
			const input = screen.getByTestId('payee-autocomplete-input');

			await fireEvent.input(input, { target: { value: 'al' } });
			await vi.advanceTimersByTimeAsync(200);

			await waitFor(() => {
				expect(mockGetPayeeSuggestions).toHaveBeenCalledWith('al', 10);
			});
		});

		it('passes limit of 10 to getPayeeSuggestions', async () => {
			render(PayeeInput, { props: { value: '' } });
			const input = screen.getByTestId('payee-autocomplete-input');

			await fireEvent.input(input, { target: { value: 'am' } });
			await vi.advanceTimersByTimeAsync(200);

			await waitFor(() => {
				expect(mockGetPayeeSuggestions).toHaveBeenCalledWith('am', 10);
			});
		});

		it('does not call getPayeeSuggestions for fewer than 2 characters', async () => {
			render(PayeeInput, { props: { value: '' } });
			const input = screen.getByTestId('payee-autocomplete-input');

			await fireEvent.input(input, { target: { value: 'a' } });
			await vi.advanceTimersByTimeAsync(200);

			expect(mockGetPayeeSuggestions).not.toHaveBeenCalled();
		});

		it('debounces API calls when typing rapidly', async () => {
			render(PayeeInput, { props: { value: '' } });
			const input = screen.getByTestId('payee-autocomplete-input');

			// Type quickly: three keystrokes in rapid succession
			await fireEvent.input(input, { target: { value: 'a' } });
			vi.advanceTimersByTime(50);

			await fireEvent.input(input, { target: { value: 'al' } });
			vi.advanceTimersByTime(50);

			await fireEvent.input(input, { target: { value: 'alb' } });

			// Only after the debounce resolves should the API be called
			await vi.advanceTimersByTimeAsync(200);

			await waitFor(() => {
				expect(mockGetPayeeSuggestions).toHaveBeenCalled();
			});
		});

		it('sets items to empty when API call fails and shows no-matches text', async () => {
			mockGetPayeeSuggestions.mockRejectedValue(new Error('Network error'));

			render(PayeeInput, { props: { value: '' } });
			const input = screen.getByTestId('payee-autocomplete-input');

			await fireEvent.input(input, { target: { value: 'al' } });
			await vi.advanceTimersByTimeAsync(200);

			await waitFor(() => {
				expect(mockGetPayeeSuggestions).toHaveBeenCalled();
			});

			// Items are empty after error, so the dropdown shows the no-matches message
			await waitFor(() => {
				expect(screen.queryByTestId('payee-autocomplete-no-matches')).toBeInTheDocument();
			});
			// No suggestion options should be rendered
			expect(screen.queryByTestId('payee-autocomplete-option-0')).not.toBeInTheDocument();
		});
	});

	// -------------------------------------------------------
	// 3. Suggestions sorted by frequency (most common first)
	// -------------------------------------------------------
	describe('suggestions sorted by frequency', () => {
		it('displays suggestions in frequency order from the API', async () => {
			render(PayeeInput, { props: { value: '' } });
			const input = screen.getByTestId('payee-autocomplete-input');

			await typeAndWaitForSuggestions(input, 'al');

			await waitFor(() => {
				const dropdown = screen.getByTestId('payee-autocomplete-dropdown');
				expect(dropdown).toBeInTheDocument();

				// First option: Albert Heijn (freq 15) - most common
				const option0 = screen.getByTestId('payee-autocomplete-option-0');
				expect(option0.textContent).toContain('Albert Heijn');

				// Second option: Aldi (freq 8)
				const option1 = screen.getByTestId('payee-autocomplete-option-1');
				expect(option1.textContent).toContain('Aldi');

				// Third option: Amazon (freq 5)
				const option2 = screen.getByTestId('payee-autocomplete-option-2');
				expect(option2.textContent).toContain('Amazon');
			});
		});

		it('maps PayeeSuggestion to AutocompleteItem with label = payee name', async () => {
			mockGetPayeeSuggestions.mockResolvedValue([{ payee: 'Albert Heijn', frequency: 15 }]);

			render(PayeeInput, { props: { value: '' } });
			const input = screen.getByTestId('payee-autocomplete-input');

			await typeAndWaitForSuggestions(input, 'al');

			await waitFor(() => {
				const option = screen.getByTestId('payee-autocomplete-option-0');
				expect(option.textContent).toContain('Albert Heijn');
			});
		});
	});

	// -------------------------------------------------------
	// 4. Usage count display: "Albert Heijn (15)"
	// -------------------------------------------------------
	describe('usage count display', () => {
		it('shows frequency count in parentheses as detail text', async () => {
			render(PayeeInput, { props: { value: '' } });
			const input = screen.getByTestId('payee-autocomplete-input');

			await typeAndWaitForSuggestions(input, 'al');

			await waitFor(() => {
				const option0 = screen.getByTestId('payee-autocomplete-option-0');
				expect(option0.textContent).toContain('Albert Heijn');
				expect(option0.textContent).toContain('(15)');
			});
		});

		it('shows correct frequency for each suggestion', async () => {
			render(PayeeInput, { props: { value: '' } });
			const input = screen.getByTestId('payee-autocomplete-input');

			await typeAndWaitForSuggestions(input, 'al');

			await waitFor(() => {
				const option0 = screen.getByTestId('payee-autocomplete-option-0');
				const option1 = screen.getByTestId('payee-autocomplete-option-1');
				const option2 = screen.getByTestId('payee-autocomplete-option-2');

				expect(option0.textContent).toContain('(15)');
				expect(option1.textContent).toContain('(8)');
				expect(option2.textContent).toContain('(5)');
			});
		});

		it('formats detail as "(frequency)" string for any count', async () => {
			mockGetPayeeSuggestions.mockResolvedValue([{ payee: 'Starbucks', frequency: 42 }]);

			render(PayeeInput, { props: { value: '' } });
			const input = screen.getByTestId('payee-autocomplete-input');

			await typeAndWaitForSuggestions(input, 'st');

			await waitFor(() => {
				const option = screen.getByTestId('payee-autocomplete-option-0');
				expect(option.textContent).toContain('Starbucks');
				expect(option.textContent).toContain('(42)');
			});
		});
	});

	// -------------------------------------------------------
	// 5. Category auto-fills when payee with common category selected
	// -------------------------------------------------------
	describe('category auto-fill on selection', () => {
		it('calls getPayeeCategory API when a suggestion is selected via keyboard', async () => {
			render(PayeeInput, { props: { value: '' } });
			const input = screen.getByTestId('payee-autocomplete-input');

			await typeAndWaitForSuggestions(input, 'al');

			await waitFor(() => {
				expect(screen.getByTestId('payee-autocomplete-dropdown')).toBeInTheDocument();
			});

			// Navigate to first item and select it
			await fireEvent.keyDown(input, { key: 'ArrowDown' });
			await fireEvent.keyDown(input, { key: 'Enter' });

			await waitFor(() => {
				expect(mockGetPayeeCategory).toHaveBeenCalledWith('Albert Heijn');
			});
		});

		it('dispatches select event with payee and categoryId from association', async () => {
			const handleSelect = vi.fn();
			render(PayeeInput, {
				props: { value: '' },
				events: { select: handleSelect }
			});
			const input = screen.getByTestId('payee-autocomplete-input');

			await typeAndWaitForSuggestions(input, 'al');

			await waitFor(() => {
				expect(screen.getByTestId('payee-autocomplete-dropdown')).toBeInTheDocument();
			});

			await fireEvent.keyDown(input, { key: 'ArrowDown' });
			await fireEvent.keyDown(input, { key: 'Enter' });

			await waitFor(() => {
				expect(handleSelect).toHaveBeenCalled();
				const eventDetail = handleSelect.mock.calls[0][0].detail;
				expect(eventDetail.payee).toBe('Albert Heijn');
				expect(eventDetail.categoryId).toBe('cat-groceries');
			});
		});

		it('dispatches select with null categoryId when no association exists', async () => {
			mockGetPayeeCategory.mockResolvedValue(null);

			const handleSelect = vi.fn();
			render(PayeeInput, {
				props: { value: '' },
				events: { select: handleSelect }
			});
			const input = screen.getByTestId('payee-autocomplete-input');

			await typeAndWaitForSuggestions(input, 'al');

			await waitFor(() => {
				expect(screen.getByTestId('payee-autocomplete-dropdown')).toBeInTheDocument();
			});

			await fireEvent.keyDown(input, { key: 'ArrowDown' });
			await fireEvent.keyDown(input, { key: 'Enter' });

			await waitFor(() => {
				expect(handleSelect).toHaveBeenCalled();
				const eventDetail = handleSelect.mock.calls[0][0].detail;
				expect(eventDetail.payee).toBe('Albert Heijn');
				expect(eventDetail.categoryId).toBeNull();
			});
		});

		it('dispatches select with null categoryId when getPayeeCategory fails', async () => {
			mockGetPayeeCategory.mockRejectedValue(new Error('Category lookup failed'));

			const handleSelect = vi.fn();
			render(PayeeInput, {
				props: { value: '' },
				events: { select: handleSelect }
			});
			const input = screen.getByTestId('payee-autocomplete-input');

			await typeAndWaitForSuggestions(input, 'al');

			await waitFor(() => {
				expect(screen.getByTestId('payee-autocomplete-dropdown')).toBeInTheDocument();
			});

			await fireEvent.keyDown(input, { key: 'ArrowDown' });
			await fireEvent.keyDown(input, { key: 'Enter' });

			await waitFor(() => {
				expect(handleSelect).toHaveBeenCalled();
				const eventDetail = handleSelect.mock.calls[0][0].detail;
				expect(eventDetail.payee).toBe('Albert Heijn');
				expect(eventDetail.categoryId).toBeNull();
			});
		});

		it('calls getPayeeCategory with correct payee when clicking second suggestion', async () => {
			mockGetPayeeCategory.mockResolvedValue({
				payee: 'Aldi',
				categoryId: 'cat-supermarket',
				count: 8
			});

			const handleSelect = vi.fn();
			render(PayeeInput, {
				props: { value: '' },
				events: { select: handleSelect }
			});
			const input = screen.getByTestId('payee-autocomplete-input');

			await typeAndWaitForSuggestions(input, 'al');

			await waitFor(() => {
				expect(screen.getByTestId('payee-autocomplete-dropdown')).toBeInTheDocument();
			});

			// Click the second option directly
			const option1 = screen.getByTestId('payee-autocomplete-option-1');
			await fireEvent.mouseDown(option1);

			await waitFor(() => {
				expect(mockGetPayeeCategory).toHaveBeenCalledWith('Aldi');
				expect(handleSelect).toHaveBeenCalled();
				const eventDetail = handleSelect.mock.calls[0][0].detail;
				expect(eventDetail.payee).toBe('Aldi');
				expect(eventDetail.categoryId).toBe('cat-supermarket');
			});
		});
	});

	// -------------------------------------------------------
	// 6. "No matches - press Enter to use as new payee" for novel input
	// -------------------------------------------------------
	describe('no matches text for novel input', () => {
		it('shows "No matches - press Enter to use as new payee" when no suggestions', async () => {
			mockGetPayeeSuggestions.mockResolvedValue([]);

			render(PayeeInput, { props: { value: '' } });
			const input = screen.getByTestId('payee-autocomplete-input');

			await typeAndWaitForSuggestions(input, 'zzz_novel_payee');

			await waitFor(() => {
				const noMatches = screen.getByTestId('payee-autocomplete-no-matches');
				expect(noMatches).toBeInTheDocument();
				expect(noMatches.textContent).toContain(
					'No matches - press Enter to use as new payee'
				);
			});
		});

		it('does not show no-matches element when suggestions exist', async () => {
			render(PayeeInput, { props: { value: '' } });
			const input = screen.getByTestId('payee-autocomplete-input');

			await typeAndWaitForSuggestions(input, 'al');

			await waitFor(() => {
				expect(screen.getByTestId('payee-autocomplete-dropdown')).toBeInTheDocument();
			});

			expect(screen.queryByTestId('payee-autocomplete-no-matches')).not.toBeInTheDocument();
		});
	});

	// -------------------------------------------------------
	// 7. New payee value accepted on Enter when no matches
	// -------------------------------------------------------
	describe('new payee accepted on Enter', () => {
		it('dispatches enter event with the typed value when no matches', async () => {
			mockGetPayeeSuggestions.mockResolvedValue([]);

			const handleEnter = vi.fn();
			render(PayeeInput, {
				props: { value: 'Brand New Payee' },
				events: { enter: handleEnter }
			});
			const input = screen.getByTestId('payee-autocomplete-input');

			await fireEvent.keyDown(input, { key: 'Enter' });

			expect(handleEnter).toHaveBeenCalled();
			const eventDetail = handleEnter.mock.calls[0][0].detail;
			expect(eventDetail).toBe('Brand New Payee');
		});

		it('dispatches enter event when dropdown is open but nothing is highlighted', async () => {
			mockGetPayeeSuggestions.mockResolvedValue([]);

			const handleEnter = vi.fn();
			render(PayeeInput, {
				props: { value: '' },
				events: { enter: handleEnter }
			});
			const input = screen.getByTestId('payee-autocomplete-input');

			// Type to open dropdown with no matches
			await typeAndWaitForSuggestions(input, 'xyz_new');

			// Press Enter without highlighting anything
			await fireEvent.keyDown(input, { key: 'Enter' });

			expect(handleEnter).toHaveBeenCalled();
		});

		it('does not dispatch enter when a highlighted suggestion is selected with Enter', async () => {
			const handleEnter = vi.fn();
			const handleSelect = vi.fn();
			render(PayeeInput, {
				props: { value: '' },
				events: { enter: handleEnter, select: handleSelect }
			});
			const input = screen.getByTestId('payee-autocomplete-input');

			await typeAndWaitForSuggestions(input, 'al');

			await waitFor(() => {
				expect(screen.getByTestId('payee-autocomplete-dropdown')).toBeInTheDocument();
			});

			// Highlight first item and press Enter -- triggers select, not enter
			await fireEvent.keyDown(input, { key: 'ArrowDown' });
			await fireEvent.keyDown(input, { key: 'Enter' });

			// Enter event should NOT have fired since an item was highlighted
			expect(handleEnter).not.toHaveBeenCalled();

			// Select event should have fired instead
			await waitFor(() => {
				expect(handleSelect).toHaveBeenCalled();
			});
		});
	});

	// -------------------------------------------------------
	// 8. Input event dispatching
	// -------------------------------------------------------
	describe('input event dispatching', () => {
		it('dispatches input event when user types', async () => {
			const handleInput = vi.fn();
			render(PayeeInput, {
				props: { value: '' },
				events: { input: handleInput }
			});
			const input = screen.getByTestId('payee-autocomplete-input');

			await fireEvent.input(input, { target: { value: 'al' } });
			await vi.advanceTimersByTimeAsync(200);

			await waitFor(() => {
				expect(handleInput).toHaveBeenCalled();
			});
		});
	});

	// -------------------------------------------------------
	// 9. Dropdown closes after selection
	// -------------------------------------------------------
	describe('value binding on selection', () => {
		it('closes dropdown after selecting a payee', async () => {
			render(PayeeInput, { props: { value: '' } });
			const input = screen.getByTestId('payee-autocomplete-input');

			await typeAndWaitForSuggestions(input, 'al');

			await waitFor(() => {
				expect(screen.getByTestId('payee-autocomplete-dropdown')).toBeInTheDocument();
			});

			// Select first item
			await fireEvent.keyDown(input, { key: 'ArrowDown' });
			await fireEvent.keyDown(input, { key: 'Enter' });

			// The dropdown should close after selection
			await waitFor(() => {
				expect(screen.queryByTestId('payee-autocomplete-dropdown')).not.toBeInTheDocument();
			});
		});
	});

	// -------------------------------------------------------
	// 10. Error handling
	// -------------------------------------------------------
	describe('error handling', () => {
		it('handles getPayeeSuggestions API error gracefully without crashing', async () => {
			mockGetPayeeSuggestions.mockRejectedValue(new Error('Network error'));

			render(PayeeInput, { props: { value: '' } });
			const input = screen.getByTestId('payee-autocomplete-input');

			await fireEvent.input(input, { target: { value: 'al' } });
			await vi.advanceTimersByTimeAsync(200);

			await waitFor(() => {
				expect(mockGetPayeeSuggestions).toHaveBeenCalled();
			});

			// Should not crash -- input remains in document
			expect(input).toBeInTheDocument();
			// No suggestion options should be rendered (only no-matches text)
			expect(screen.queryByTestId('payee-autocomplete-option-0')).not.toBeInTheDocument();
		});
	});
});
