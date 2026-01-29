import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import Step4Categories from '../../components/onboarding/Step4Categories.svelte';

describe('Step4Categories', () => {
	it('should render title', () => {
		render(Step4Categories, { props: {} });
		expect(screen.getByTestId('step4-categories-title').textContent).toBe(
			'Review your budget categories'
		);
	});

	it('should render subtitle', () => {
		render(Step4Categories, { props: {} });
		expect(screen.getByTestId('step4-categories-subtitle').textContent).toContain(
			"Toggle categories you don't need"
		);
	});

	it('should display category sections', () => {
		render(Step4Categories, { props: {} });

		expect(screen.getByTestId('step4-categories-section-housing')).toBeTruthy();
		expect(screen.getByTestId('step4-categories-section-essential')).toBeTruthy();
		expect(screen.getByTestId('step4-categories-section-lifestyle')).toBeTruthy();
		expect(screen.getByTestId('step4-categories-section-savings')).toBeTruthy();
	});

	it('should display section labels', () => {
		render(Step4Categories, { props: {} });

		expect(
			screen.getByTestId('step4-categories-section-housing-label').textContent?.trim()
		).toBe('Housing');
		expect(
			screen.getByTestId('step4-categories-section-essential-label').textContent?.trim()
		).toBe('Essential');
	});

	it('should show category toggles', () => {
		render(Step4Categories, { props: {} });

		expect(screen.getByTestId('step4-categories-toggle-cat-housing-rent')).toBeTruthy();
		expect(screen.getByTestId('step4-categories-toggle-cat-essential-groceries')).toBeTruthy();
		expect(screen.getByTestId('step4-categories-toggle-cat-lifestyle-dining')).toBeTruthy();
	});

	it('should show all categories enabled by default', () => {
		render(Step4Categories, { props: {} });

		const toggle = screen.getByTestId(
			'step4-categories-toggle-cat-housing-rent'
		) as HTMLInputElement;
		expect(toggle.checked).toBe(true);
	});

	it('should show disabled categories as unchecked', () => {
		render(Step4Categories, {
			props: { disabledCategories: ['cat-housing-vve', 'cat-lifestyle-travel'] }
		});

		const vve = screen.getByTestId(
			'step4-categories-toggle-cat-housing-vve'
		) as HTMLInputElement;
		expect(vve.checked).toBe(false);

		const travel = screen.getByTestId(
			'step4-categories-toggle-cat-lifestyle-travel'
		) as HTMLInputElement;
		expect(travel.checked).toBe(false);
	});

	it('should dispatch toggleCategory on toggle click', async () => {
		let toggledId: string | null = null;

		render(Step4Categories, {
			props: {},
			events: {
				toggleCategory: (event: CustomEvent) => {
					toggledId = event.detail.categoryId;
				}
			}
		} as any);

		await fireEvent.click(screen.getByTestId('step4-categories-toggle-cat-housing-water'));
		expect(toggledId).toBe('cat-housing-water');
	});

	it('should have Finish button', () => {
		render(Step4Categories, { props: {} });
		expect(screen.getByTestId('step4-categories-finish')).toBeTruthy();
	});

	it('should dispatch finish event', async () => {
		let finishCalled = false;

		render(Step4Categories, {
			props: {},
			events: {
				finish: () => {
					finishCalled = true;
				}
			}
		} as any);

		await fireEvent.click(screen.getByTestId('step4-categories-finish'));
		expect(finishCalled).toBe(true);
	});

	it('should have Back button', () => {
		render(Step4Categories, { props: {} });
		expect(screen.getByTestId('step4-categories-back')).toBeTruthy();
	});

	it('should accept custom testId', () => {
		render(Step4Categories, { props: { testId: 'custom-cats' } });
		expect(screen.getByTestId('custom-cats')).toBeTruthy();
	});
});
