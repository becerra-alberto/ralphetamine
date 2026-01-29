import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import TagsFilter from '../../../components/transactions/TagsFilter.svelte';
import type { TagInfo } from '../../../types/ui';

const mockTags: TagInfo[] = [
	{ name: 'groceries', count: 15 },
	{ name: 'dining', count: 8 },
	{ name: 'recurring', count: 12 }
];

describe('TagsFilter', () => {
	it('should render checkbox list showing all used tags with count per tag', () => {
		render(TagsFilter, {
			props: {
				tags: mockTags,
				selectedTags: []
			}
		});

		// All tags rendered
		expect(screen.getByTestId('tags-filter')).toBeTruthy();
		expect(screen.getByTestId('tags-list')).toBeTruthy();
		expect(screen.getByTestId('tag-item-groceries')).toBeTruthy();
		expect(screen.getByTestId('tag-item-dining')).toBeTruthy();
		expect(screen.getByTestId('tag-item-recurring')).toBeTruthy();

		// Counts displayed in parentheses
		const groceries = screen.getByTestId('tag-item-groceries');
		expect(groceries.textContent).toContain('groceries');
		expect(groceries.textContent).toContain('(15)');

		const dining = screen.getByTestId('tag-item-dining');
		expect(dining.textContent).toContain('dining');
		expect(dining.textContent).toContain('(8)');

		const recurring = screen.getByTestId('tag-item-recurring');
		expect(recurring.textContent).toContain('recurring');
		expect(recurring.textContent).toContain('(12)');
	});

	it('should show empty state message when no tags exist', () => {
		render(TagsFilter, {
			props: {
				tags: [],
				selectedTags: []
			}
		});

		expect(screen.getByText('No tags found')).toBeTruthy();

		// No tag items should be rendered
		expect(screen.queryByTestId('tag-item-groceries')).toBeNull();
		expect(screen.queryByTestId('tag-item-dining')).toBeNull();
		expect(screen.queryByTestId('tag-item-recurring')).toBeNull();
	});

	it('should check selected tags and leave others unchecked', () => {
		render(TagsFilter, {
			props: {
				tags: mockTags,
				selectedTags: ['groceries', 'recurring']
			}
		});

		const groceries = screen.getByTestId('tag-item-groceries').querySelector('input') as HTMLInputElement;
		const dining = screen.getByTestId('tag-item-dining').querySelector('input') as HTMLInputElement;
		const recurring = screen.getByTestId('tag-item-recurring').querySelector('input') as HTMLInputElement;

		expect(groceries.checked).toBe(true);
		expect(dining.checked).toBe(false);
		expect(recurring.checked).toBe(true);
	});

	it('should dispatch toggle event when clicking a tag checkbox', async () => {
		let toggledTag: string | null = null;
		render(TagsFilter, {
			props: {
				tags: mockTags,
				selectedTags: []
			},
			events: {
				toggle: (event: CustomEvent<{ tag: string }>) => {
					toggledTag = event.detail.tag;
				}
			}
		});

		const groceriesCheckbox = screen.getByTestId('tag-item-groceries').querySelector('input') as HTMLInputElement;
		await fireEvent.change(groceriesCheckbox);

		expect(toggledTag).toBe('groceries');
	});
});
