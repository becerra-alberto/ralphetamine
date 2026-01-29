import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import ShortcutsHelp from '../../components/shared/ShortcutsHelp.svelte';

describe('ShortcutsHelp', () => {
	it('should render when open is true', () => {
		render(ShortcutsHelp, { props: { open: true } });

		expect(screen.getByTestId('shortcuts-help')).toBeTruthy();
	});

	it('should not render when open is false', () => {
		render(ShortcutsHelp, { props: { open: false } });

		expect(screen.queryByTestId('shortcuts-help')).toBeNull();
	});

	it('should display title "Keyboard Shortcuts"', () => {
		render(ShortcutsHelp, { props: { open: true } });

		expect(screen.getByTestId('shortcuts-help-title').textContent).toBe('Keyboard Shortcuts');
	});

	it('should show Navigation group', () => {
		render(ShortcutsHelp, { props: { open: true } });

		expect(screen.getByTestId('shortcuts-help-group-navigation')).toBeTruthy();
		expect(screen.getByText('Navigation')).toBeTruthy();
	});

	it('should show Actions group', () => {
		render(ShortcutsHelp, { props: { open: true } });

		expect(screen.getByTestId('shortcuts-help-group-actions')).toBeTruthy();
		expect(screen.getByText('Actions')).toBeTruthy();
	});

	it('should show General group', () => {
		render(ShortcutsHelp, { props: { open: true } });

		expect(screen.getByTestId('shortcuts-help-group-general')).toBeTruthy();
		expect(screen.getByText('General')).toBeTruthy();
	});

	it('should display navigation shortcuts', () => {
		render(ShortcutsHelp, { props: { open: true } });

		expect(screen.getByText('Go to Home')).toBeTruthy();
		// Budget/Transactions/Net Worth appear twice (⌘2/⌘U, ⌘3/⌘T, ⌘4/⌘W)
		expect(screen.getAllByText('Go to Budget').length).toBeGreaterThanOrEqual(1);
		expect(screen.getAllByText('Go to Transactions').length).toBeGreaterThanOrEqual(1);
		expect(screen.getAllByText('Go to Net Worth').length).toBeGreaterThanOrEqual(1);
	});

	it('should display action shortcuts', () => {
		render(ShortcutsHelp, { props: { open: true } });

		expect(screen.getByText('Command palette')).toBeTruthy();
		expect(screen.getByText('New transaction')).toBeTruthy();
		expect(screen.getByText('Focus search')).toBeTruthy();
		expect(screen.getByText('Adjust budgets')).toBeTruthy();
	});

	it('should display general shortcuts', () => {
		render(ShortcutsHelp, { props: { open: true } });

		expect(screen.getByText('Close modal / Cancel')).toBeTruthy();
		expect(screen.getByText('Confirm / Submit')).toBeTruthy();
		expect(screen.getByText('Next field')).toBeTruthy();
		expect(screen.getByText('Show this help')).toBeTruthy();
	});

	it('should show shortcut key badges', () => {
		render(ShortcutsHelp, { props: { open: true } });

		expect(screen.getByText('⌘1')).toBeTruthy();
		expect(screen.getByText('⌘K')).toBeTruthy();
		expect(screen.getByText('⌘?')).toBeTruthy();
		expect(screen.getByText('Esc')).toBeTruthy();
	});

	it('should dispatch close event on Escape', async () => {
		const handleClose = vi.fn();
		render(ShortcutsHelp, {
			props: { open: true },
			events: { close: handleClose }
		} as any);

		await fireEvent.keyDown(document, { key: 'Escape' });

		expect(handleClose).toHaveBeenCalledTimes(1);
	});

	it('should dispatch close event on backdrop click', async () => {
		const handleClose = vi.fn();
		render(ShortcutsHelp, {
			props: { open: true },
			events: { close: handleClose }
		} as any);

		await fireEvent.click(screen.getByTestId('shortcuts-help-backdrop'));

		expect(handleClose).toHaveBeenCalledTimes(1);
	});

	it('should dispatch close event on close button click', async () => {
		const handleClose = vi.fn();
		render(ShortcutsHelp, {
			props: { open: true },
			events: { close: handleClose }
		} as any);

		await fireEvent.click(screen.getByTestId('shortcuts-help-close'));

		expect(handleClose).toHaveBeenCalledTimes(1);
	});

	it('should have accessible dialog role', () => {
		render(ShortcutsHelp, { props: { open: true } });

		const dialog = screen.getByTestId('shortcuts-help');
		expect(dialog.getAttribute('role')).toBe('dialog');
		expect(dialog.getAttribute('aria-modal')).toBe('true');
	});

	it('should accept custom testId', () => {
		render(ShortcutsHelp, { props: { open: true, testId: 'custom-help' } });

		expect(screen.getByTestId('custom-help')).toBeTruthy();
	});
});
