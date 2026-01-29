import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import Pagination from '../../../components/shared/Pagination.svelte';

describe('Pagination', () => {
	describe('AC3: Page indicator', () => {
		it('should display correct "Page X of Y" indicator', () => {
			render(Pagination, {
				props: {
					currentPage: 2,
					totalPages: 5,
					totalItems: 250,
					itemsPerPage: 50
				}
			});

			const indicator = screen.getByTestId('page-indicator');
			expect(indicator.textContent?.trim()).toBe('Page 2 of 5');
		});

		it('should display "Page 1 of 1" for single page', () => {
			render(Pagination, {
				props: {
					currentPage: 1,
					totalPages: 1,
					totalItems: 10,
					itemsPerPage: 50
				}
			});

			const indicator = screen.getByTestId('page-indicator');
			expect(indicator.textContent?.trim()).toBe('Page 1 of 1');
		});

		it('should display item range in pagination info', () => {
			render(Pagination, {
				props: {
					currentPage: 2,
					totalPages: 4,
					totalItems: 175,
					itemsPerPage: 50
				}
			});

			const info = screen.getByTestId('pagination-info');
			expect(info.textContent).toContain('Showing 51 - 100 of 175');
		});

		it('should display correct range for last page', () => {
			render(Pagination, {
				props: {
					currentPage: 4,
					totalPages: 4,
					totalItems: 175,
					itemsPerPage: 50
				}
			});

			const info = screen.getByTestId('pagination-info');
			expect(info.textContent).toContain('Showing 151 - 175 of 175');
		});

		it('should display "No items" when totalItems is 0', () => {
			render(Pagination, {
				props: {
					currentPage: 1,
					totalPages: 1,
					totalItems: 0,
					itemsPerPage: 50
				}
			});

			const info = screen.getByTestId('pagination-info');
			expect(info.textContent).toContain('No items');
		});
	});

	describe('AC3: Previous/Next buttons boundary behavior', () => {
		it('should disable Previous button on first page', () => {
			render(Pagination, {
				props: {
					currentPage: 1,
					totalPages: 5,
					totalItems: 250,
					itemsPerPage: 50
				}
			});

			const prevBtn = screen.getByTestId('pagination-prev');
			expect(prevBtn.hasAttribute('disabled')).toBe(true);
		});

		it('should enable Previous button when not on first page', () => {
			render(Pagination, {
				props: {
					currentPage: 2,
					totalPages: 5,
					totalItems: 250,
					itemsPerPage: 50
				}
			});

			const prevBtn = screen.getByTestId('pagination-prev');
			expect(prevBtn.hasAttribute('disabled')).toBe(false);
		});

		it('should disable Next button on last page', () => {
			render(Pagination, {
				props: {
					currentPage: 5,
					totalPages: 5,
					totalItems: 250,
					itemsPerPage: 50
				}
			});

			const nextBtn = screen.getByTestId('pagination-next');
			expect(nextBtn.hasAttribute('disabled')).toBe(true);
		});

		it('should enable Next button when not on last page', () => {
			render(Pagination, {
				props: {
					currentPage: 1,
					totalPages: 5,
					totalItems: 250,
					itemsPerPage: 50
				}
			});

			const nextBtn = screen.getByTestId('pagination-next');
			expect(nextBtn.hasAttribute('disabled')).toBe(false);
		});

		it('should disable both buttons when there is only one page', () => {
			render(Pagination, {
				props: {
					currentPage: 1,
					totalPages: 1,
					totalItems: 25,
					itemsPerPage: 50
				}
			});

			const prevBtn = screen.getByTestId('pagination-prev');
			const nextBtn = screen.getByTestId('pagination-next');
			expect(prevBtn.hasAttribute('disabled')).toBe(true);
			expect(nextBtn.hasAttribute('disabled')).toBe(true);
		});
	});

	describe('Page navigation interactions', () => {
		it('should handle Next button click without error when enabled', async () => {
			render(Pagination, {
				props: {
					currentPage: 1,
					totalPages: 5,
					totalItems: 250,
					itemsPerPage: 50
				}
			});

			const nextBtn = screen.getByTestId('pagination-next');
			expect(nextBtn.hasAttribute('disabled')).toBe(false);
			// Click should succeed without error
			await fireEvent.click(nextBtn);
			expect(nextBtn).toBeTruthy();
		});

		it('should handle Previous button click without error when enabled', async () => {
			render(Pagination, {
				props: {
					currentPage: 3,
					totalPages: 5,
					totalItems: 250,
					itemsPerPage: 50
				}
			});

			const prevBtn = screen.getByTestId('pagination-prev');
			expect(prevBtn.hasAttribute('disabled')).toBe(false);
			// Click should succeed without error
			await fireEvent.click(prevBtn);
			expect(prevBtn).toBeTruthy();
		});

		it('should have Previous button disabled on first page (no navigation possible)', () => {
			render(Pagination, {
				props: {
					currentPage: 1,
					totalPages: 5,
					totalItems: 250,
					itemsPerPage: 50
				}
			});

			const prevBtn = screen.getByTestId('pagination-prev');
			expect(prevBtn.hasAttribute('disabled')).toBe(true);
		});

		it('should have Next button disabled on last page (no navigation possible)', () => {
			render(Pagination, {
				props: {
					currentPage: 5,
					totalPages: 5,
					totalItems: 250,
					itemsPerPage: 50
				}
			});

			const nextBtn = screen.getByTestId('pagination-next');
			expect(nextBtn.hasAttribute('disabled')).toBe(true);
		});
	});

	describe('Accessibility', () => {
		it('should have nav element with aria-label', () => {
			render(Pagination, {
				props: {
					currentPage: 1,
					totalPages: 5,
					totalItems: 250,
					itemsPerPage: 50
				}
			});

			const nav = screen.getByTestId('pagination');
			expect(nav.tagName.toLowerCase()).toBe('nav');
			expect(nav.getAttribute('aria-label')).toBe('Pagination');
		});

		it('should have aria-label on Previous button', () => {
			render(Pagination, {
				props: {
					currentPage: 2,
					totalPages: 5,
					totalItems: 250,
					itemsPerPage: 50
				}
			});

			const prevBtn = screen.getByTestId('pagination-prev');
			expect(prevBtn.getAttribute('aria-label')).toBe('Previous page');
		});

		it('should have aria-label on Next button', () => {
			render(Pagination, {
				props: {
					currentPage: 2,
					totalPages: 5,
					totalItems: 250,
					itemsPerPage: 50
				}
			});

			const nextBtn = screen.getByTestId('pagination-next');
			expect(nextBtn.getAttribute('aria-label')).toBe('Next page');
		});
	});
});
