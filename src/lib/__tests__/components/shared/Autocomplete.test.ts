import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import Autocomplete from '../../../components/shared/Autocomplete.svelte';

// 12 items to test the maxItems=10 cap
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

/**
 * Helper: renders the Autocomplete with items, fires an input event,
 * and advances past the debounce so the dropdown opens.
 * Returns the rerender function and the input element.
 *
 * When event handlers are needed, pass them via extraEvents so they
 * are wired at render time (Svelte 5 does not support $on).
 */
async function openDropdown(
	items: { label: string; value: string; detail?: string }[] = mockItems,
	typedValue = 'al',
	extraProps: Record<string, unknown> = {},
	extraEvents: Record<string, (...args: unknown[]) => void> = {}
) {
	const testId = (extraProps.testId as string) || 'autocomplete';
	const { rerender } = render(Autocomplete, {
		props: { items, minChars: 2, value: typedValue, ...extraProps },
		events: extraEvents
	});

	const input = screen.getByTestId(`${testId}-input`);
	await fireEvent.input(input, { target: { value: typedValue } });
	await vi.advanceTimersByTimeAsync(200);

	return { rerender, input };
}

describe('Autocomplete', () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
		vi.clearAllMocks();
	});

	// ---------------------------------------------------------------
	// AC 1 -- No suggestions shown for 0-1 character input (minChars=2)
	// ---------------------------------------------------------------
	describe('AC 1: no suggestions for 0-1 characters', () => {
		it('does not show suggestions for empty input (0 characters)', async () => {
			render(Autocomplete, { props: { items: mockItems, minChars: 2, value: '' } });
			const input = screen.getByTestId('autocomplete-input');

			await fireEvent.input(input, { target: { value: '' } });
			await vi.advanceTimersByTimeAsync(200);

			expect(screen.queryByTestId('autocomplete-dropdown')).not.toBeInTheDocument();
		});

		it('does not show suggestions for 1 character input', async () => {
			render(Autocomplete, { props: { items: mockItems, minChars: 2, value: 'a' } });
			const input = screen.getByTestId('autocomplete-input');

			await fireEvent.input(input, { target: { value: 'a' } });
			await vi.advanceTimersByTimeAsync(200);

			expect(screen.queryByTestId('autocomplete-dropdown')).not.toBeInTheDocument();
		});

		it('closes an already-open dropdown when value is cleared below minChars', async () => {
			const { rerender, input } = await openDropdown();

			// Dropdown should be open
			await waitFor(() => {
				expect(screen.getByTestId('autocomplete-dropdown')).toBeInTheDocument();
			});

			// Clear to single character via rerender + input event
			await rerender({ items: mockItems, minChars: 2, value: 'a' });
			await fireEvent.input(input, { target: { value: 'a' } });
			await vi.advanceTimersByTimeAsync(200);

			expect(screen.queryByTestId('autocomplete-dropdown')).not.toBeInTheDocument();
		});
	});

	// ---------------------------------------------------------------
	// AC 2 -- Suggestions dropdown appears after 2+ characters typed
	// ---------------------------------------------------------------
	describe('AC 2: dropdown appears after 2+ characters', () => {
		it('shows suggestions dropdown when exactly 2 characters are typed', async () => {
			await openDropdown(mockItems, 'al');

			await waitFor(() => {
				expect(screen.getByTestId('autocomplete-dropdown')).toBeInTheDocument();
			});
		});

		it('shows suggestions dropdown when more than 2 characters are typed', async () => {
			await openDropdown(mockItems, 'alb');

			await waitFor(() => {
				expect(screen.getByTestId('autocomplete-dropdown')).toBeInTheDocument();
			});
		});

		it('dispatches input event with the typed value after debounce', async () => {
			const handleInput = vi.fn();
			render(Autocomplete, {
				props: { items: mockItems, minChars: 2, value: 'al' },
				events: { input: handleInput }
			});
			const input = screen.getByTestId('autocomplete-input');

			await fireEvent.input(input, { target: { value: 'al' } });
			await vi.advanceTimersByTimeAsync(200);

			expect(handleInput).toHaveBeenCalledTimes(1);
			expect(handleInput).toHaveBeenCalledWith(expect.objectContaining({ detail: 'al' }));
		});
	});

	// ---------------------------------------------------------------
	// AC 3 -- Case-insensitive matching delegated to parent; items
	//         display correctly
	// ---------------------------------------------------------------
	describe('AC 3: items display correctly (filtering delegated to parent)', () => {
		it('displays all provided items regardless of case', async () => {
			const mixedCaseItems = [
				{ label: 'apple', value: 'apple' },
				{ label: 'APPLE', value: 'APPLE' },
				{ label: 'Apple Store', value: 'Apple Store' }
			];

			await openDropdown(mixedCaseItems, 'ap');

			await waitFor(() => {
				const dropdown = screen.getByTestId('autocomplete-dropdown');
				const options = dropdown.querySelectorAll('[role="option"]');
				expect(options.length).toBe(3);
			});
		});

		it('renders item labels exactly as provided', async () => {
			const items = [
				{ label: "McDonald's", value: 'McDonalds' },
				{ label: 'H&M', value: 'HM' }
			];

			await openDropdown(items, 'mc');

			await waitFor(() => {
				expect(screen.getByTestId('autocomplete-option-0').textContent).toContain("McDonald's");
				expect(screen.getByTestId('autocomplete-option-1').textContent).toContain('H&M');
			});
		});

		it('displays item detail text when provided', async () => {
			await openDropdown();

			await waitFor(() => {
				const firstOption = screen.getByTestId('autocomplete-option-0');
				expect(firstOption.textContent).toContain('Albert Heijn');
				expect(firstOption.textContent).toContain('(15)');
			});
		});

		it('renders items without detail when detail is omitted', async () => {
			const itemsNoDetail = [
				{ label: 'Groceries', value: 'Groceries' },
				{ label: 'Gas Station', value: 'Gas Station' }
			];

			await openDropdown(itemsNoDetail, 'gr');

			await waitFor(() => {
				const firstOption = screen.getByTestId('autocomplete-option-0');
				expect(firstOption.textContent?.trim()).toBe('Groceries');
			});
		});
	});

	// ---------------------------------------------------------------
	// AC 4 -- Maximum 10 suggestions displayed (maxItems=10)
	// ---------------------------------------------------------------
	describe('AC 4: maximum 10 suggestions displayed', () => {
		it('displays at most 10 items when more than 10 are provided', async () => {
			// mockItems has 12 entries
			await openDropdown(mockItems, 'al', { maxItems: 10 });

			await waitFor(() => {
				const dropdown = screen.getByTestId('autocomplete-dropdown');
				const options = dropdown.querySelectorAll('[role="option"]');
				expect(options.length).toBe(10);
			});
		});

		it('displays all items when fewer than maxItems are provided', async () => {
			const fewItems = mockItems.slice(0, 3);
			await openDropdown(fewItems, 'al', { maxItems: 10 });

			await waitFor(() => {
				const dropdown = screen.getByTestId('autocomplete-dropdown');
				const options = dropdown.querySelectorAll('[role="option"]');
				expect(options.length).toBe(3);
			});
		});

		it('respects a custom maxItems value', async () => {
			await openDropdown(mockItems, 'al', { maxItems: 5 });

			await waitFor(() => {
				const dropdown = screen.getByTestId('autocomplete-dropdown');
				const options = dropdown.querySelectorAll('[role="option"]');
				expect(options.length).toBe(5);
			});
		});
	});

	// ---------------------------------------------------------------
	// AC 5 -- Click on suggestion fills input and closes dropdown
	// ---------------------------------------------------------------
	describe('AC 5: click selects suggestion', () => {
		it('closes dropdown when an option is clicked', async () => {
			await openDropdown();

			await waitFor(() => {
				expect(screen.getByTestId('autocomplete-dropdown')).toBeInTheDocument();
			});

			const option = screen.getByTestId('autocomplete-option-0');
			await fireEvent.mouseDown(option);

			await waitFor(() => {
				expect(screen.queryByTestId('autocomplete-dropdown')).not.toBeInTheDocument();
			});
		});

		it('dispatches select event with the clicked item', async () => {
			const handleSelect = vi.fn();
			render(Autocomplete, {
				props: { items: mockItems, minChars: 2, value: 'al' },
				events: { select: handleSelect }
			});
			const input = screen.getByTestId('autocomplete-input');

			await fireEvent.input(input, { target: { value: 'al' } });
			await vi.advanceTimersByTimeAsync(200);

			await waitFor(() => {
				expect(screen.getByTestId('autocomplete-dropdown')).toBeInTheDocument();
			});

			const option = screen.getByTestId('autocomplete-option-0');
			await fireEvent.mouseDown(option);

			expect(handleSelect).toHaveBeenCalledTimes(1);
			expect(handleSelect).toHaveBeenCalledWith(
				expect.objectContaining({
					detail: expect.objectContaining({
						label: 'Albert Heijn',
						value: 'Albert Heijn'
					})
				})
			);
		});

		it('clicking a non-first option selects the correct item', async () => {
			const handleSelect = vi.fn();
			render(Autocomplete, {
				props: { items: mockItems, minChars: 2, value: 'al' },
				events: { select: handleSelect }
			});
			const input = screen.getByTestId('autocomplete-input');

			await fireEvent.input(input, { target: { value: 'al' } });
			await vi.advanceTimersByTimeAsync(200);

			await waitFor(() => {
				expect(screen.getByTestId('autocomplete-dropdown')).toBeInTheDocument();
			});

			const option2 = screen.getByTestId('autocomplete-option-2');
			await fireEvent.mouseDown(option2);

			expect(handleSelect).toHaveBeenCalledWith(
				expect.objectContaining({
					detail: expect.objectContaining({
						label: 'Amazon',
						value: 'Amazon'
					})
				})
			);
		});
	});

	// ---------------------------------------------------------------
	// AC 6 -- Arrow Down/Up navigates through suggestions
	// ---------------------------------------------------------------
	describe('AC 6: keyboard arrow navigation', () => {
		it('Arrow Down highlights the first item', async () => {
			const { input } = await openDropdown();

			await waitFor(() => {
				expect(screen.getByTestId('autocomplete-dropdown')).toBeInTheDocument();
			});

			await fireEvent.keyDown(input, { key: 'ArrowDown' });
			expect(screen.getByTestId('autocomplete-option-0').getAttribute('aria-selected')).toBe('true');
		});

		it('Arrow Down advances through items sequentially', async () => {
			const { input } = await openDropdown();

			await waitFor(() => {
				expect(screen.getByTestId('autocomplete-dropdown')).toBeInTheDocument();
			});

			await fireEvent.keyDown(input, { key: 'ArrowDown' });
			await fireEvent.keyDown(input, { key: 'ArrowDown' });

			expect(screen.getByTestId('autocomplete-option-0').getAttribute('aria-selected')).toBe('false');
			expect(screen.getByTestId('autocomplete-option-1').getAttribute('aria-selected')).toBe('true');
		});

		it('Arrow Up from first item wraps to last visible item', async () => {
			const threeItems = mockItems.slice(0, 3);
			const { input } = await openDropdown(threeItems, 'al');

			await waitFor(() => {
				expect(screen.getByTestId('autocomplete-dropdown')).toBeInTheDocument();
			});

			// Move to first item
			await fireEvent.keyDown(input, { key: 'ArrowDown' });
			expect(screen.getByTestId('autocomplete-option-0').getAttribute('aria-selected')).toBe('true');

			// Arrow Up should wrap to last item (index 2)
			await fireEvent.keyDown(input, { key: 'ArrowUp' });
			expect(screen.getByTestId('autocomplete-option-2').getAttribute('aria-selected')).toBe('true');
		});

		it('Arrow Down wraps from last item to first', async () => {
			const threeItems = mockItems.slice(0, 3);
			const { input } = await openDropdown(threeItems, 'al');

			await waitFor(() => {
				expect(screen.getByTestId('autocomplete-dropdown')).toBeInTheDocument();
			});

			// Navigate to last item (index 2)
			await fireEvent.keyDown(input, { key: 'ArrowDown' }); // index 0
			await fireEvent.keyDown(input, { key: 'ArrowDown' }); // index 1
			await fireEvent.keyDown(input, { key: 'ArrowDown' }); // index 2
			expect(screen.getByTestId('autocomplete-option-2').getAttribute('aria-selected')).toBe('true');

			// One more Arrow Down wraps to 0
			await fireEvent.keyDown(input, { key: 'ArrowDown' });
			expect(screen.getByTestId('autocomplete-option-0').getAttribute('aria-selected')).toBe('true');
		});

		it('Arrow Up goes back to previous item', async () => {
			const { input } = await openDropdown();

			await waitFor(() => {
				expect(screen.getByTestId('autocomplete-dropdown')).toBeInTheDocument();
			});

			await fireEvent.keyDown(input, { key: 'ArrowDown' }); // 0
			await fireEvent.keyDown(input, { key: 'ArrowDown' }); // 1
			await fireEvent.keyDown(input, { key: 'ArrowUp' });   // back to 0

			expect(screen.getByTestId('autocomplete-option-0').getAttribute('aria-selected')).toBe('true');
		});

		it('mouse hover updates highlighted index', async () => {
			await openDropdown();

			await waitFor(() => {
				expect(screen.getByTestId('autocomplete-dropdown')).toBeInTheDocument();
			});

			const option2 = screen.getByTestId('autocomplete-option-2');
			await fireEvent.mouseEnter(option2);

			expect(option2.getAttribute('aria-selected')).toBe('true');
		});
	});

	// ---------------------------------------------------------------
	// AC 7 -- Enter key selects highlighted suggestion
	// ---------------------------------------------------------------
	describe('AC 7: Enter selects highlighted suggestion', () => {
		it('Enter on highlighted item dispatches select event', async () => {
			const handleSelect = vi.fn();
			render(Autocomplete, {
				props: { items: mockItems, minChars: 2, value: 'al' },
				events: { select: handleSelect }
			});
			const input = screen.getByTestId('autocomplete-input');

			await fireEvent.input(input, { target: { value: 'al' } });
			await vi.advanceTimersByTimeAsync(200);

			await waitFor(() => {
				expect(screen.getByTestId('autocomplete-dropdown')).toBeInTheDocument();
			});

			// Navigate to first item and press Enter
			await fireEvent.keyDown(input, { key: 'ArrowDown' });
			await fireEvent.keyDown(input, { key: 'Enter' });

			expect(handleSelect).toHaveBeenCalledTimes(1);
			expect(handleSelect).toHaveBeenCalledWith(
				expect.objectContaining({
					detail: expect.objectContaining({ label: 'Albert Heijn', value: 'Albert Heijn' })
				})
			);
		});

		it('Enter closes the dropdown after selection', async () => {
			const { input } = await openDropdown();

			await waitFor(() => {
				expect(screen.getByTestId('autocomplete-dropdown')).toBeInTheDocument();
			});

			await fireEvent.keyDown(input, { key: 'ArrowDown' });
			await fireEvent.keyDown(input, { key: 'Enter' });

			await waitFor(() => {
				expect(screen.queryByTestId('autocomplete-dropdown')).not.toBeInTheDocument();
			});
		});

		it('Enter on second highlighted item selects the correct item', async () => {
			const handleSelect = vi.fn();
			render(Autocomplete, {
				props: { items: mockItems, minChars: 2, value: 'al' },
				events: { select: handleSelect }
			});
			const input = screen.getByTestId('autocomplete-input');

			await fireEvent.input(input, { target: { value: 'al' } });
			await vi.advanceTimersByTimeAsync(200);

			await waitFor(() => {
				expect(screen.getByTestId('autocomplete-dropdown')).toBeInTheDocument();
			});

			await fireEvent.keyDown(input, { key: 'ArrowDown' }); // index 0
			await fireEvent.keyDown(input, { key: 'ArrowDown' }); // index 1
			await fireEvent.keyDown(input, { key: 'Enter' });

			expect(handleSelect).toHaveBeenCalledWith(
				expect.objectContaining({
					detail: expect.objectContaining({ label: 'Aldi', value: 'Aldi' })
				})
			);
		});

		it('Enter with no highlighted item dispatches enter event (not select)', async () => {
			const handleEnter = vi.fn();
			const handleSelect = vi.fn();
			render(Autocomplete, {
				props: { items: mockItems, minChars: 2, value: 'al' },
				events: { enter: handleEnter, select: handleSelect }
			});
			const input = screen.getByTestId('autocomplete-input');

			await fireEvent.input(input, { target: { value: 'al' } });
			await vi.advanceTimersByTimeAsync(200);

			await waitFor(() => {
				expect(screen.getByTestId('autocomplete-dropdown')).toBeInTheDocument();
			});

			// Press Enter without navigating (highlightedIndex is -1)
			await fireEvent.keyDown(input, { key: 'Enter' });

			expect(handleEnter).toHaveBeenCalledTimes(1);
			expect(handleSelect).not.toHaveBeenCalled();
		});

		it('Enter dispatches enter event when dropdown is closed', async () => {
			const handleEnter = vi.fn();
			render(Autocomplete, {
				props: { items: [], minChars: 2, value: 'new payee' },
				events: { enter: handleEnter }
			});
			const input = screen.getByTestId('autocomplete-input');

			await fireEvent.keyDown(input, { key: 'Enter' });

			expect(handleEnter).toHaveBeenCalledTimes(1);
			expect(handleEnter).toHaveBeenCalledWith(
				expect.objectContaining({ detail: 'new payee' })
			);
		});
	});

	// ---------------------------------------------------------------
	// AC 8 -- Escape key closes dropdown without selection
	// ---------------------------------------------------------------
	describe('AC 8: Escape closes dropdown without selection', () => {
		it('Escape closes the dropdown', async () => {
			const { input } = await openDropdown();

			await waitFor(() => {
				expect(screen.getByTestId('autocomplete-dropdown')).toBeInTheDocument();
			});

			await fireEvent.keyDown(input, { key: 'Escape' });

			expect(screen.queryByTestId('autocomplete-dropdown')).not.toBeInTheDocument();
		});

		it('Escape does not dispatch select event', async () => {
			const handleSelect = vi.fn();
			render(Autocomplete, {
				props: { items: mockItems, minChars: 2, value: 'al' },
				events: { select: handleSelect }
			});
			const input = screen.getByTestId('autocomplete-input');

			await fireEvent.input(input, { target: { value: 'al' } });
			await vi.advanceTimersByTimeAsync(200);

			await waitFor(() => {
				expect(screen.getByTestId('autocomplete-dropdown')).toBeInTheDocument();
			});

			// Navigate to first item, then press Escape
			await fireEvent.keyDown(input, { key: 'ArrowDown' });
			await fireEvent.keyDown(input, { key: 'Escape' });

			expect(handleSelect).not.toHaveBeenCalled();
		});

		it('Escape resets highlighted index so reopening starts fresh', async () => {
			const { input } = await openDropdown();

			await waitFor(() => {
				expect(screen.getByTestId('autocomplete-dropdown')).toBeInTheDocument();
			});

			// Highlight an item, then Escape
			await fireEvent.keyDown(input, { key: 'ArrowDown' });
			await fireEvent.keyDown(input, { key: 'Escape' });

			// Reopen dropdown by typing again
			await fireEvent.input(input, { target: { value: 'al' } });
			await vi.advanceTimersByTimeAsync(200);

			await waitFor(() => {
				expect(screen.getByTestId('autocomplete-dropdown')).toBeInTheDocument();
			});

			// No item should be highlighted after reopen
			expect(screen.getByTestId('autocomplete-option-0').getAttribute('aria-selected')).toBe('false');
		});
	});

	// ---------------------------------------------------------------
	// AC 9 -- Input debounces at 150ms (debounceMs)
	// ---------------------------------------------------------------
	describe('AC 9: input debounce at 150ms', () => {
		it('does not dispatch input event before debounce period', async () => {
			const handleInput = vi.fn();
			render(Autocomplete, {
				props: { items: [], minChars: 2, debounceMs: 150, value: 'al' },
				events: { input: handleInput }
			});
			const input = screen.getByTestId('autocomplete-input');

			await fireEvent.input(input, { target: { value: 'al' } });

			// Only 100ms elapsed -- should NOT have fired yet
			await vi.advanceTimersByTimeAsync(100);
			expect(handleInput).not.toHaveBeenCalled();
		});

		it('dispatches input event after debounce period elapses', async () => {
			const handleInput = vi.fn();
			render(Autocomplete, {
				props: { items: [], minChars: 2, debounceMs: 150, value: 'al' },
				events: { input: handleInput }
			});
			const input = screen.getByTestId('autocomplete-input');

			await fireEvent.input(input, { target: { value: 'al' } });

			await vi.advanceTimersByTimeAsync(200);
			expect(handleInput).toHaveBeenCalledTimes(1);
		});

		it('resets debounce timer on each keystroke', async () => {
			const handleInput = vi.fn();
			const { rerender } = render(Autocomplete, {
				props: { items: [], minChars: 2, debounceMs: 150, value: '' },
				events: { input: handleInput }
			});
			const input = screen.getByTestId('autocomplete-input');

			// First keystroke
			await rerender({ items: [], minChars: 2, debounceMs: 150, value: 'a' });
			await fireEvent.input(input, { target: { value: 'a' } });
			await vi.advanceTimersByTimeAsync(50);

			// Second keystroke (resets timer)
			await rerender({ items: [], minChars: 2, debounceMs: 150, value: 'al' });
			await fireEvent.input(input, { target: { value: 'al' } });
			await vi.advanceTimersByTimeAsync(50);

			// Third keystroke (resets timer again)
			await rerender({ items: [], minChars: 2, debounceMs: 150, value: 'alb' });
			await fireEvent.input(input, { target: { value: 'alb' } });

			// 100ms after last keystroke -- not enough
			await vi.advanceTimersByTimeAsync(100);
			expect(handleInput).not.toHaveBeenCalled();

			// 50 more ms (total 150ms from last keystroke)
			await vi.advanceTimersByTimeAsync(50);
			expect(handleInput).toHaveBeenCalledTimes(1);
		});

		it('only fires once for rapid keystrokes', async () => {
			const handleInput = vi.fn();
			const { rerender } = render(Autocomplete, {
				props: { items: [], minChars: 2, debounceMs: 150, value: '' },
				events: { input: handleInput }
			});
			const input = screen.getByTestId('autocomplete-input');

			// Rapid typing
			await rerender({ items: [], minChars: 2, debounceMs: 150, value: 'a' });
			await fireEvent.input(input, { target: { value: 'a' } });
			await vi.advanceTimersByTimeAsync(30);

			await rerender({ items: [], minChars: 2, debounceMs: 150, value: 'al' });
			await fireEvent.input(input, { target: { value: 'al' } });
			await vi.advanceTimersByTimeAsync(30);

			await rerender({ items: [], minChars: 2, debounceMs: 150, value: 'alb' });
			await fireEvent.input(input, { target: { value: 'alb' } });
			await vi.advanceTimersByTimeAsync(30);

			await rerender({ items: [], minChars: 2, debounceMs: 150, value: 'albe' });
			await fireEvent.input(input, { target: { value: 'albe' } });

			// Wait for debounce from last keystroke
			await vi.advanceTimersByTimeAsync(200);

			// Should only fire once (for the final value)
			expect(handleInput).toHaveBeenCalledTimes(1);
		});
	});

	// ---------------------------------------------------------------
	// AC 10 -- No-match text shown when items empty and input >= 2 chars
	// ---------------------------------------------------------------
	describe('AC 10: no-match text display', () => {
		it('shows no-matches element when items are empty and query >= minChars', async () => {
			await openDropdown([], 'xyz');

			await waitFor(() => {
				expect(screen.getByTestId('autocomplete-no-matches')).toBeInTheDocument();
			});
		});

		it('displays the default no-matches text', async () => {
			await openDropdown([], 'xyz');

			await waitFor(() => {
				const noMatches = screen.getByTestId('autocomplete-no-matches');
				expect(noMatches.textContent).toContain('No matches - press Enter to use as new value');
			});
		});

		it('displays custom noMatchesText', async () => {
			await openDropdown([], 'xyz', {
				noMatchesText: 'Nothing found, try another term'
			});

			await waitFor(() => {
				const noMatches = screen.getByTestId('autocomplete-no-matches');
				expect(noMatches.textContent).toContain('Nothing found, try another term');
			});
		});

		it('does not show no-matches when items are present', async () => {
			await openDropdown(mockItems, 'al');

			await waitFor(() => {
				expect(screen.getByTestId('autocomplete-dropdown')).toBeInTheDocument();
			});

			expect(screen.queryByTestId('autocomplete-no-matches')).not.toBeInTheDocument();
		});

		it('does not show no-matches when input is below minChars', async () => {
			render(Autocomplete, { props: { items: [], minChars: 2, value: 'x' } });
			const input = screen.getByTestId('autocomplete-input');

			await fireEvent.input(input, { target: { value: 'x' } });
			await vi.advanceTimersByTimeAsync(200);

			expect(screen.queryByTestId('autocomplete-no-matches')).not.toBeInTheDocument();
		});
	});

	// ---------------------------------------------------------------
	// AC 11 -- Focus moves to input via exported focus() method
	// ---------------------------------------------------------------
	describe('AC 11: exported focus() method', () => {
		it('focuses the input element when focus() is called', async () => {
			const { component } = render(Autocomplete, {
				props: { items: [], minChars: 2 }
			});

			const input = screen.getByTestId('autocomplete-input');
			expect(document.activeElement).not.toBe(input);

			component.focus();

			expect(document.activeElement).toBe(input);
		});

		it('getInputElement() returns the underlying input element', () => {
			const { component } = render(Autocomplete, {
				props: { items: [], minChars: 2 }
			});

			const el = component.getInputElement();
			expect(el).toBeInstanceOf(HTMLInputElement);
			expect(el?.getAttribute('data-testid')).toBe('autocomplete-input');
		});
	});

	// ---------------------------------------------------------------
	// Supplemental: ARIA and accessibility attributes
	// ---------------------------------------------------------------
	describe('accessibility attributes', () => {
		it('input has role="combobox"', () => {
			render(Autocomplete, { props: { items: [], label: 'Payee' } });
			const input = screen.getByTestId('autocomplete-input');
			expect(input.getAttribute('role')).toBe('combobox');
		});

		it('input has aria-autocomplete="list"', () => {
			render(Autocomplete, { props: { items: [] } });
			const input = screen.getByTestId('autocomplete-input');
			expect(input.getAttribute('aria-autocomplete')).toBe('list');
		});

		it('input has aria-label from label prop', () => {
			render(Autocomplete, { props: { items: [], label: 'Search Payees' } });
			const input = screen.getByTestId('autocomplete-input');
			expect(input.getAttribute('aria-label')).toBe('Search Payees');
		});

		it('input has aria-expanded reflecting open state', async () => {
			const { input } = await openDropdown();

			await waitFor(() => {
				expect(input.getAttribute('aria-expanded')).toBe('true');
			});
		});

		it('input uses aria-controls pointing to the listbox', () => {
			render(Autocomplete, { props: { items: [], testId: 'payee-ac' } });
			const input = screen.getByTestId('payee-ac-input');
			expect(input.getAttribute('aria-controls')).toBe('payee-ac-listbox');
		});

		it('input aria-activedescendant updates with highlighted option', async () => {
			const { input } = await openDropdown(mockItems, 'al', { testId: 'payee-ac' });

			await waitFor(() => {
				expect(screen.getByTestId('payee-ac-dropdown')).toBeInTheDocument();
			});

			// Before navigation, no active descendant
			expect(input.getAttribute('aria-activedescendant')).toBeNull();

			await fireEvent.keyDown(input, { key: 'ArrowDown' });
			expect(input.getAttribute('aria-activedescendant')).toBe('payee-ac-option-0');
		});

		it('dropdown has role="listbox"', async () => {
			await openDropdown();

			await waitFor(() => {
				const dropdown = screen.getByTestId('autocomplete-dropdown');
				expect(dropdown.getAttribute('role')).toBe('listbox');
			});
		});

		it('each option has role="option"', async () => {
			await openDropdown();

			await waitFor(() => {
				const dropdown = screen.getByTestId('autocomplete-dropdown');
				const options = dropdown.querySelectorAll('[role="option"]');
				expect(options.length).toBeGreaterThan(0);
			});
		});
	});

	// ---------------------------------------------------------------
	// Supplemental: testId prop customization
	// ---------------------------------------------------------------
	describe('custom testId prop', () => {
		it('uses custom testId for data-testid attributes', () => {
			render(Autocomplete, { props: { items: [], testId: 'payee-ac' } });

			expect(screen.getByTestId('payee-ac')).toBeInTheDocument();
			expect(screen.getByTestId('payee-ac-input')).toBeInTheDocument();
		});

		it('uses default testId when not specified', () => {
			render(Autocomplete, { props: { items: [] } });

			expect(screen.getByTestId('autocomplete')).toBeInTheDocument();
			expect(screen.getByTestId('autocomplete-input')).toBeInTheDocument();
		});
	});

	// ---------------------------------------------------------------
	// Supplemental: hasError prop
	// ---------------------------------------------------------------
	describe('error state', () => {
		it('applies error class when hasError is true', () => {
			render(Autocomplete, { props: { items: [], hasError: true } });
			const input = screen.getByTestId('autocomplete-input');
			expect(input.classList.contains('error')).toBe(true);
		});

		it('does not apply error class when hasError is false', () => {
			render(Autocomplete, { props: { items: [], hasError: false } });
			const input = screen.getByTestId('autocomplete-input');
			expect(input.classList.contains('error')).toBe(false);
		});
	});

	// ---------------------------------------------------------------
	// Supplemental: focus/blur behaviour
	// ---------------------------------------------------------------
	describe('focus and blur behavior', () => {
		it('opens dropdown on focus when value >= minChars and items present', async () => {
			render(Autocomplete, {
				props: { items: mockItems, minChars: 2, value: 'al' }
			});
			const input = screen.getByTestId('autocomplete-input');

			await fireEvent.focus(input);

			await waitFor(() => {
				expect(screen.getByTestId('autocomplete-dropdown')).toBeInTheDocument();
			});
		});

		it('does not open dropdown on focus when value < minChars', async () => {
			render(Autocomplete, { props: { items: mockItems, minChars: 2, value: 'a' } });
			const input = screen.getByTestId('autocomplete-input');

			await fireEvent.focus(input);

			expect(screen.queryByTestId('autocomplete-dropdown')).not.toBeInTheDocument();
		});
	});
});
