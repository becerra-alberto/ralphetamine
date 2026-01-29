import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import StepIndicator from '../../components/onboarding/StepIndicator.svelte';

describe('StepIndicator', () => {
	it('should show "Step 1 of 4" text', () => {
		render(StepIndicator, {
			props: { currentStep: 1, totalSteps: 4 }
		});

		const text = screen.getByTestId('step-indicator-text');
		expect(text.textContent).toBe('Step 1 of 4');
	});

	it('should show "Step 3 of 4" when on step 3', () => {
		render(StepIndicator, {
			props: { currentStep: 3, totalSteps: 4 }
		});

		const text = screen.getByTestId('step-indicator-text');
		expect(text.textContent).toBe('Step 3 of 4');
	});

	it('should render progress bar', () => {
		render(StepIndicator, {
			props: { currentStep: 1, totalSteps: 4 }
		});

		expect(screen.getByTestId('step-indicator-bar')).toBeTruthy();
		expect(screen.getByTestId('step-indicator-fill')).toBeTruthy();
	});

	it('should set progress bar width to 25% for step 1 of 4', () => {
		render(StepIndicator, {
			props: { currentStep: 1, totalSteps: 4 }
		});

		const fill = screen.getByTestId('step-indicator-fill');
		expect(fill.getAttribute('style')).toContain('width: 25%');
	});

	it('should set progress bar width to 50% for step 2 of 4', () => {
		render(StepIndicator, {
			props: { currentStep: 2, totalSteps: 4 }
		});

		const fill = screen.getByTestId('step-indicator-fill');
		expect(fill.getAttribute('style')).toContain('width: 50%');
	});

	it('should render 4 dots for totalSteps=4', () => {
		render(StepIndicator, {
			props: { currentStep: 1, totalSteps: 4 }
		});

		expect(screen.getByTestId('step-indicator-dot-0')).toBeTruthy();
		expect(screen.getByTestId('step-indicator-dot-1')).toBeTruthy();
		expect(screen.getByTestId('step-indicator-dot-2')).toBeTruthy();
		expect(screen.getByTestId('step-indicator-dot-3')).toBeTruthy();
	});

	it('should accept custom testId', () => {
		render(StepIndicator, {
			props: { currentStep: 1, totalSteps: 4, testId: 'custom-indicator' }
		});

		expect(screen.getByTestId('custom-indicator')).toBeTruthy();
		expect(screen.getByTestId('custom-indicator-text')).toBeTruthy();
	});
});
