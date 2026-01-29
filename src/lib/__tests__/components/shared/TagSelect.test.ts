import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import TagSelect from '../../../components/shared/TagSelect.svelte';

// Helper: testId uses lowercase with hyphens
function tagId(tag: string): string {
	return tag.toLowerCase().replace(/\s+/g, '-');
}

async function openDropdown() {
	const trigger = screen.getByTestId('tag-select-trigger');
	await fireEvent.click(trigger);
}

describe('TagSelect', () => {
	describe('field display (AC1)', () => {
		it('should render with placeholder "Add tags..." when empty', () => {
			render(TagSelect, {
				props: { value: [], availableTags: [] }
			});

			expect(screen.getByTestId('tag-select-placeholder')).toBeTruthy();
			expect(screen.getByTestId('tag-select-placeholder').textContent).toBe('Add tags...');
		});

		it('should render with custom placeholder', () => {
			render(TagSelect, {
				props: { value: [], availableTags: [], placeholder: 'Tags...' }
			});

			expect(screen.getByTestId('tag-select-placeholder').textContent).toBe('Tags...');
		});

		it('should open dropdown when clicked', async () => {
			render(TagSelect, {
				props: { value: [], availableTags: [] }
			});

			expect(screen.queryByTestId('tag-select-panel')).toBeNull();
			await openDropdown();
			expect(screen.getByTestId('tag-select-panel')).toBeTruthy();
		});
	});

	describe('tag selector dropdown (AC2)', () => {
		it('should show predefined tags: Personal, Business, Recurring, Tax-Deductible', async () => {
			render(TagSelect, {
				props: { value: [], availableTags: [] }
			});

			await openDropdown();

			const predefined = ['Personal', 'Business', 'Recurring', 'Tax-Deductible'];
			for (const tag of predefined) {
				expect(screen.getByTestId(`tag-select-option-${tagId(tag)}`)).toBeTruthy();
			}
		});

		it('should show custom tags alongside predefined tags', async () => {
			render(TagSelect, {
				props: { value: [], availableTags: ['CustomTag', 'AnotherTag'] }
			});

			await openDropdown();

			expect(screen.getByTestId(`tag-select-option-${tagId('CustomTag')}`)).toBeTruthy();
			expect(screen.getByTestId(`tag-select-option-${tagId('AnotherTag')}`)).toBeTruthy();
			// Predefined still there
			expect(screen.getByTestId(`tag-select-option-${tagId('Personal')}`)).toBeTruthy();
		});

		it('should have checkbox indicator for each tag', async () => {
			render(TagSelect, {
				props: { value: [], availableTags: [] }
			});

			await openDropdown();

			const checkboxSpan = screen.getByTestId(`tag-select-checkbox-${tagId('Personal')}`);
			expect(checkboxSpan).toBeTruthy();
		});

		it('should deduplicate tags if available matches predefined (case-insensitive)', async () => {
			render(TagSelect, {
				props: { value: [], availableTags: ['Personal', 'Extra'] }
			});

			await openDropdown();

			const listbox = screen.getByTestId('tag-select-listbox');
			const options = listbox.querySelectorAll('[data-tag-option]');
			const personalOptions = Array.from(options).filter(
				(opt) => opt.getAttribute('data-testid') === `tag-select-option-${tagId('Personal')}`
			);
			expect(personalOptions.length).toBe(1);
			expect(screen.getByTestId(`tag-select-option-${tagId('Extra')}`)).toBeTruthy();
		});
	});

	describe('multi-select (AC3)', () => {
		it('should toggle tag selection on click', async () => {
			render(TagSelect, {
				props: { value: [], availableTags: [] }
			});

			await openDropdown();

			const personalOption = screen.getByTestId(`tag-select-option-${tagId('Personal')}`);
			await fireEvent.mouseDown(personalOption);

			// Checkbox span should have .checked class
			const checkbox = screen.getByTestId(`tag-select-checkbox-${tagId('Personal')}`);
			expect(checkbox.classList.contains('checked')).toBe(true);
		});

		it('should allow multiple tags to be selected simultaneously', async () => {
			render(TagSelect, {
				props: { value: [], availableTags: [] }
			});

			await openDropdown();

			await fireEvent.mouseDown(screen.getByTestId(`tag-select-option-${tagId('Personal')}`));
			await fireEvent.mouseDown(screen.getByTestId(`tag-select-option-${tagId('Business')}`));

			const personalCb = screen.getByTestId(`tag-select-checkbox-${tagId('Personal')}`);
			const businessCb = screen.getByTestId(`tag-select-checkbox-${tagId('Business')}`);
			expect(personalCb.classList.contains('checked')).toBe(true);
			expect(businessCb.classList.contains('checked')).toBe(true);
		});

		it('should keep dropdown open during multi-select', async () => {
			render(TagSelect, {
				props: { value: [], availableTags: [] }
			});

			await openDropdown();
			await fireEvent.mouseDown(screen.getByTestId(`tag-select-option-${tagId('Personal')}`));

			expect(screen.getByTestId('tag-select-panel')).toBeTruthy();
		});

		it('should deselect a tag when clicked again', async () => {
			render(TagSelect, {
				props: { value: ['Personal'], availableTags: [] }
			});

			await openDropdown();

			const checkbox = screen.getByTestId(`tag-select-checkbox-${tagId('Personal')}`);
			expect(checkbox.classList.contains('checked')).toBe(true);

			await fireEvent.mouseDown(screen.getByTestId(`tag-select-option-${tagId('Personal')}`));
			expect(checkbox.classList.contains('checked')).toBe(false);
		});
	});

	describe('selected tags as chips (AC4)', () => {
		it('should render selected tags as chips', () => {
			render(TagSelect, {
				props: { value: ['Personal', 'Business'], availableTags: [] }
			});

			expect(screen.getByTestId('tag-select-chips')).toBeTruthy();
			expect(screen.getByTestId(`tag-select-chip-${tagId('Personal')}`)).toBeTruthy();
			expect(screen.getByTestId(`tag-select-chip-${tagId('Business')}`)).toBeTruthy();
		});

		it('should show tag name in chip', () => {
			render(TagSelect, {
				props: { value: ['Recurring'], availableTags: [] }
			});

			const chip = screen.getByTestId(`tag-select-chip-${tagId('Recurring')}`);
			expect(chip.textContent).toContain('Recurring');
		});

		it('should have X (remove) button on each chip', () => {
			render(TagSelect, {
				props: { value: ['Personal'], availableTags: [] }
			});

			expect(screen.getByTestId(`tag-select-chip-${tagId('Personal')}-remove`)).toBeTruthy();
		});

		it('should not show placeholder when chips are displayed', () => {
			render(TagSelect, {
				props: { value: ['Personal'], availableTags: [] }
			});

			expect(screen.queryByTestId('tag-select-placeholder')).toBeNull();
		});
	});

	describe('remove tag (AC5)', () => {
		it('should remove tag when X button on chip is clicked', async () => {
			render(TagSelect, {
				props: { value: ['Personal', 'Business'], availableTags: [] }
			});

			const removeBtn = screen.getByTestId(`tag-select-chip-${tagId('Personal')}-remove`);
			await fireEvent.click(removeBtn);

			expect(screen.queryByTestId(`tag-select-chip-${tagId('Personal')}`)).toBeNull();
			expect(screen.getByTestId(`tag-select-chip-${tagId('Business')}`)).toBeTruthy();
		});

		it('should make removed tag available again in dropdown (unchecked)', async () => {
			render(TagSelect, {
				props: { value: ['Personal'], availableTags: [] }
			});

			await fireEvent.click(screen.getByTestId(`tag-select-chip-${tagId('Personal')}-remove`));

			await openDropdown();

			const checkbox = screen.getByTestId(`tag-select-checkbox-${tagId('Personal')}`);
			expect(checkbox.classList.contains('checked')).toBe(false);
		});
	});

	describe('create new tag (AC6)', () => {
		it('should create new tag when typing and pressing Enter', async () => {
			render(TagSelect, {
				props: { value: [], availableTags: [] }
			});

			await openDropdown();

			const input = screen.getByTestId('tag-select-input');
			await fireEvent.input(input, { target: { value: 'NewCustomTag' } });
			await fireEvent.keyDown(input, { key: 'Enter' });

			expect(screen.getByTestId(`tag-select-chip-${tagId('NewCustomTag')}`)).toBeTruthy();
		});

		it('should clear input after creating tag', async () => {
			render(TagSelect, {
				props: { value: [], availableTags: [] }
			});

			await openDropdown();

			const input = screen.getByTestId('tag-select-input') as HTMLInputElement;
			await fireEvent.input(input, { target: { value: 'NewTag' } });
			await fireEvent.keyDown(input, { key: 'Enter' });

			expect(input.value).toBe('');
		});

		it('should not create empty tag', async () => {
			render(TagSelect, {
				props: { value: [], availableTags: [] }
			});

			await openDropdown();

			const input = screen.getByTestId('tag-select-input');
			await fireEvent.input(input, { target: { value: '   ' } });
			await fireEvent.keyDown(input, { key: 'Enter' });

			expect(screen.queryByTestId('tag-select-chips')).toBeNull();
		});

		it('should not duplicate if new tag name matches existing (case-insensitive)', async () => {
			render(TagSelect, {
				props: { value: ['Personal'], availableTags: [] }
			});

			await openDropdown();

			const input = screen.getByTestId('tag-select-input');
			await fireEvent.input(input, { target: { value: 'Personal' } });
			await fireEvent.keyDown(input, { key: 'Enter' });

			const chips = screen.getByTestId('tag-select-chips');
			const personalChips = chips.querySelectorAll(`[data-testid="tag-select-chip-${tagId('Personal')}"]`);
			expect(personalChips.length).toBe(1);
		});
	});

	describe('tag storage (AC7)', () => {
		it('should serialize tags to JSON array format', () => {
			const { component } = render(TagSelect, {
				props: { value: ['Personal', 'Recurring'], availableTags: [] }
			});

			const serialized = (component as any).serializeTags();
			expect(serialized).toBe('["Personal","Recurring"]');
		});

		it('should serialize empty tags as empty JSON array', () => {
			const { component } = render(TagSelect, {
				props: { value: [], availableTags: [] }
			});

			const serialized = (component as any).serializeTags();
			expect(serialized).toBe('[]');
		});
	});

	describe('keyboard interaction (AC8)', () => {
		it('should open dropdown with Space key on trigger', async () => {
			render(TagSelect, {
				props: { value: [], availableTags: [] }
			});

			const trigger = screen.getByTestId('tag-select-trigger');
			await fireEvent.keyDown(trigger, { key: ' ' });

			expect(screen.getByTestId('tag-select-panel')).toBeTruthy();
		});

		it('should open dropdown with Enter key on trigger', async () => {
			render(TagSelect, {
				props: { value: [], availableTags: [] }
			});

			const trigger = screen.getByTestId('tag-select-trigger');
			await fireEvent.keyDown(trigger, { key: 'Enter' });

			expect(screen.getByTestId('tag-select-panel')).toBeTruthy();
		});

		it('should navigate with Arrow Down/Up keys', async () => {
			render(TagSelect, {
				props: { value: [], availableTags: [] }
			});

			await openDropdown();

			const input = screen.getByTestId('tag-select-input');

			await fireEvent.keyDown(input, { key: 'ArrowDown' });
			const listbox = screen.getByTestId('tag-select-listbox');
			const options = listbox.querySelectorAll('[data-tag-option]');
			expect(options[0].classList.contains('highlighted')).toBe(true);

			await fireEvent.keyDown(input, { key: 'ArrowDown' });
			expect(options[1].classList.contains('highlighted')).toBe(true);
			expect(options[0].classList.contains('highlighted')).toBe(false);

			await fireEvent.keyDown(input, { key: 'ArrowUp' });
			expect(options[0].classList.contains('highlighted')).toBe(true);
		});

		it('should toggle tag with Space key on highlighted option', async () => {
			render(TagSelect, {
				props: { value: [], availableTags: [] }
			});

			await openDropdown();

			const input = screen.getByTestId('tag-select-input');
			await fireEvent.keyDown(input, { key: 'ArrowDown' });
			await fireEvent.keyDown(input, { key: ' ' });

			// First tag should be selected
			const listbox = screen.getByTestId('tag-select-listbox');
			const firstOption = listbox.querySelectorAll('[data-tag-option]')[0];
			expect(firstOption.classList.contains('selected')).toBe(true);
		});

		it('should close dropdown with Escape key', async () => {
			render(TagSelect, {
				props: { value: [], availableTags: [] }
			});

			await openDropdown();

			const input = screen.getByTestId('tag-select-input');
			await fireEvent.keyDown(input, { key: 'Escape' });

			expect(screen.queryByTestId('tag-select-panel')).toBeNull();
		});
	});

	describe('accessibility', () => {
		it('should have aria-haspopup on trigger', () => {
			render(TagSelect, {
				props: { value: [], availableTags: [] }
			});

			const trigger = screen.getByTestId('tag-select-trigger');
			expect(trigger.getAttribute('aria-haspopup')).toBe('listbox');
		});

		it('should toggle aria-expanded on trigger', async () => {
			render(TagSelect, {
				props: { value: [], availableTags: [] }
			});

			const trigger = screen.getByTestId('tag-select-trigger');
			expect(trigger.getAttribute('aria-expanded')).toBe('false');

			await openDropdown();
			expect(trigger.getAttribute('aria-expanded')).toBe('true');
		});

		it('should have aria-multiselectable on listbox', async () => {
			render(TagSelect, {
				props: { value: [], availableTags: [] }
			});

			await openDropdown();

			const listbox = screen.getByTestId('tag-select-listbox');
			expect(listbox.getAttribute('aria-multiselectable')).toBe('true');
		});

		it('should have aria-selected on options', async () => {
			render(TagSelect, {
				props: { value: ['Personal'], availableTags: [] }
			});

			await openDropdown();

			const personalOption = screen.getByTestId(`tag-select-option-${tagId('Personal')}`);
			expect(personalOption.getAttribute('aria-selected')).toBe('true');

			const businessOption = screen.getByTestId(`tag-select-option-${tagId('Business')}`);
			expect(businessOption.getAttribute('aria-selected')).toBe('false');
		});
	});
});
