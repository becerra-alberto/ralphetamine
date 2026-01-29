import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import ImportWizard from '../../components/import/ImportWizard.svelte';

describe('ImportWizard', () => {
	it('should render when open is true', () => {
		render(ImportWizard, { props: { open: true } });

		expect(screen.getByTestId('import-wizard')).toBeTruthy();
	});

	it('should not render when open is false', () => {
		render(ImportWizard, { props: { open: false } });

		expect(screen.queryByTestId('import-wizard')).toBeNull();
	});

	it('should show step indicator "Step 1 of 3"', () => {
		render(ImportWizard, { props: { open: true } });

		expect(screen.getByTestId('import-wizard-step-indicator').textContent).toContain('Step 1 of 3');
	});

	it('should show title "Import Transactions"', () => {
		render(ImportWizard, { props: { open: true } });

		expect(screen.getAllByText('Import Transactions').length).toBeGreaterThanOrEqual(1);
	});

	it('should have Next button disabled initially (no file)', () => {
		render(ImportWizard, { props: { open: true } });

		const nextBtn = screen.getByTestId('import-wizard-next') as HTMLButtonElement;
		expect(nextBtn.disabled).toBe(true);
	});

	it('should show footer with navigation buttons', () => {
		render(ImportWizard, { props: { open: true } });

		expect(screen.getByTestId('import-wizard-footer')).toBeTruthy();
		expect(screen.getByTestId('import-wizard-next')).toBeTruthy();
	});

	it('should dispatch close event on Escape', async () => {
		const handleClose = vi.fn();
		render(ImportWizard, {
			props: { open: true },
			events: { close: handleClose }
		} as any);

		await fireEvent.keyDown(document, { key: 'Escape' });

		expect(handleClose).toHaveBeenCalledTimes(1);
	});

	it('should dispatch close event on backdrop click', async () => {
		const handleClose = vi.fn();
		render(ImportWizard, {
			props: { open: true },
			events: { close: handleClose }
		} as any);

		await fireEvent.click(screen.getByTestId('import-wizard-backdrop'));

		expect(handleClose).toHaveBeenCalledTimes(1);
	});

	it('should dispatch close event on close button click', async () => {
		const handleClose = vi.fn();
		render(ImportWizard, {
			props: { open: true },
			events: { close: handleClose }
		} as any);

		await fireEvent.click(screen.getByTestId('import-wizard-close'));

		expect(handleClose).toHaveBeenCalledTimes(1);
	});

	it('should have accessible dialog role', () => {
		render(ImportWizard, { props: { open: true } });

		const dialog = screen.getByTestId('import-wizard');
		expect(dialog.getAttribute('role')).toBe('dialog');
		expect(dialog.getAttribute('aria-modal')).toBe('true');
	});

	it('should show file selection step by default', () => {
		render(ImportWizard, { props: { open: true } });

		expect(screen.getByTestId('import-wizard-file-selection')).toBeTruthy();
	});

	it('should accept custom testId', () => {
		render(ImportWizard, { props: { open: true, testId: 'custom-wizard' } });

		expect(screen.getByTestId('custom-wizard')).toBeTruthy();
	});
});
