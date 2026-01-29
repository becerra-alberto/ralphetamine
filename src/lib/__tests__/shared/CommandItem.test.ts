import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import CommandItem from '../../components/shared/CommandItem.svelte';

describe('CommandItem', () => {
	it('should render command label', () => {
		render(CommandItem, { props: { label: 'Go to Budget' } });

		expect(screen.getByText('Go to Budget')).toBeTruthy();
	});

	it('should render shortcut hint when provided', () => {
		render(CommandItem, { props: { label: 'Go to Budget', shortcut: '⌘U' } });

		expect(screen.getByTestId('command-item-shortcut')).toBeTruthy();
		expect(screen.getByText('⌘U')).toBeTruthy();
	});

	it('should not render shortcut when empty', () => {
		render(CommandItem, { props: { label: 'Go to Budget', shortcut: '' } });

		expect(screen.queryByTestId('command-item-shortcut')).toBeNull();
	});

	it('should apply highlighted class when highlighted', () => {
		render(CommandItem, { props: { label: 'Go to Budget', highlighted: true } });

		const item = screen.getByTestId('command-item');
		expect(item.classList.contains('highlighted')).toBe(true);
	});

	it('should not have highlighted class by default', () => {
		render(CommandItem, { props: { label: 'Go to Budget' } });

		const item = screen.getByTestId('command-item');
		expect(item.classList.contains('highlighted')).toBe(false);
	});

	it('should dispatch select event on click', async () => {
		const handleSelect = vi.fn();
		render(CommandItem, {
			props: { label: 'Go to Budget' },
			events: { select: handleSelect }
		} as any);

		await fireEvent.click(screen.getByTestId('command-item'));
		expect(handleSelect).toHaveBeenCalledTimes(1);
	});

	it('should have role="option" for accessibility', () => {
		render(CommandItem, { props: { label: 'Go to Budget' } });

		const item = screen.getByTestId('command-item');
		expect(item.getAttribute('role')).toBe('option');
	});

	it('should set aria-selected based on highlighted', () => {
		render(CommandItem, { props: { label: 'Go to Budget', highlighted: true } });

		const item = screen.getByTestId('command-item');
		expect(item.getAttribute('aria-selected')).toBe('true');
	});

	it('should accept custom testId', () => {
		render(CommandItem, { props: { label: 'Test', testId: 'custom-item' } });

		expect(screen.getByTestId('custom-item')).toBeTruthy();
	});
});
