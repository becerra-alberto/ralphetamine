import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import ImportProgress from '../../components/import/ImportProgress.svelte';

describe('ImportProgress', () => {
	it('should not render content when status is idle', () => {
		render(ImportProgress, { props: { status: 'idle' } });
		expect(screen.queryByTestId('import-progress-importing')).toBeNull();
		expect(screen.queryByTestId('import-progress-success')).toBeNull();
		expect(screen.queryByTestId('import-progress-error')).toBeNull();
	});

	it('should show spinner when importing', () => {
		render(ImportProgress, {
			props: { status: 'importing', imported: 5, total: 20 }
		});
		expect(screen.getByTestId('import-progress-importing')).toBeTruthy();
		expect(screen.getByTestId('import-progress-spinner')).toBeTruthy();
	});

	it('should show progress detail when importing', () => {
		render(ImportProgress, {
			props: { status: 'importing', imported: 5, total: 20 }
		});
		expect(screen.getByTestId('import-progress-detail').textContent).toContain('5 of 20');
	});

	it('should show progress bar when importing', () => {
		render(ImportProgress, {
			props: { status: 'importing', imported: 10, total: 20 }
		});
		const bar = screen.getByTestId('import-progress-bar') as HTMLElement;
		expect(bar.style.width).toBe('50%');
	});

	it('should show success message on completion', () => {
		render(ImportProgress, {
			props: { status: 'success', imported: 15, skipped: 2, total: 17 }
		});
		expect(screen.getByTestId('import-progress-success')).toBeTruthy();
		expect(screen.getByTestId('import-progress-success-title').textContent).toContain('Import complete');
	});

	it('should show imported count in success', () => {
		render(ImportProgress, {
			props: { status: 'success', imported: 15, skipped: 0, total: 15 }
		});
		expect(screen.getByTestId('import-progress-success-detail').textContent).toContain('15 transactions');
	});

	it('should show skipped count when duplicates were skipped', () => {
		render(ImportProgress, {
			props: { status: 'success', imported: 13, skipped: 2, total: 15 }
		});
		expect(screen.getByTestId('import-progress-success-detail').textContent).toContain('2 duplicates skipped');
	});

	it('should show Done button on success', () => {
		render(ImportProgress, {
			props: { status: 'success', imported: 10, total: 10 }
		});
		expect(screen.getByTestId('import-progress-done')).toBeTruthy();
	});

	it('should dispatch close on Done click', async () => {
		const handleClose = vi.fn();
		render(ImportProgress, {
			props: { status: 'success', imported: 10, total: 10 },
			events: { close: handleClose }
		} as any);

		await fireEvent.click(screen.getByTestId('import-progress-done'));
		expect(handleClose).toHaveBeenCalledTimes(1);
	});

	it('should show error state', () => {
		render(ImportProgress, {
			props: { status: 'error', errorMessage: 'Database connection failed' }
		});
		expect(screen.getByTestId('import-progress-error')).toBeTruthy();
		expect(screen.getByTestId('import-progress-error-title').textContent).toContain('Import failed');
		expect(screen.getByTestId('import-progress-error-message').textContent).toContain('Database connection failed');
	});

	it('should show Retry and Cancel buttons on error', () => {
		render(ImportProgress, {
			props: { status: 'error', errorMessage: 'Error' }
		});
		expect(screen.getByTestId('import-progress-retry')).toBeTruthy();
		expect(screen.getByTestId('import-progress-cancel')).toBeTruthy();
	});

	it('should dispatch retry on Retry click', async () => {
		const handleRetry = vi.fn();
		render(ImportProgress, {
			props: { status: 'error', errorMessage: 'Error' },
			events: { retry: handleRetry }
		} as any);

		await fireEvent.click(screen.getByTestId('import-progress-retry'));
		expect(handleRetry).toHaveBeenCalledTimes(1);
	});

	it('should dispatch close on Cancel click', async () => {
		const handleClose = vi.fn();
		render(ImportProgress, {
			props: { status: 'error', errorMessage: 'Error' },
			events: { close: handleClose }
		} as any);

		await fireEvent.click(screen.getByTestId('import-progress-cancel'));
		expect(handleClose).toHaveBeenCalledTimes(1);
	});

	it('should handle singular transaction text', () => {
		render(ImportProgress, {
			props: { status: 'success', imported: 1, total: 1 }
		});
		expect(screen.getByTestId('import-progress-success-detail').textContent).toContain('1 transaction');
		expect(screen.getByTestId('import-progress-success-detail').textContent).not.toContain('transactions');
	});

	it('should accept custom testId', () => {
		render(ImportProgress, {
			props: { status: 'importing', imported: 0, total: 10, testId: 'custom-progress' }
		});
		expect(screen.getByTestId('custom-progress')).toBeTruthy();
	});
});
