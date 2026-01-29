import { describe, it, expect, beforeEach } from 'vitest';
import { get } from 'svelte/store';
import {
	onboardingStore,
	currentStep,
	totalSteps,
	selectedGoals,
	isOnboardingCompleted,
	isOnboardingLoading
} from '../../stores/onboarding';

describe('onboardingStore', () => {
	beforeEach(() => {
		onboardingStore.reset();
	});

	it('should start with default state', () => {
		const state = get(onboardingStore);
		expect(state.isCompleted).toBe(false);
		expect(state.currentStep).toBe(1);
		expect(state.totalSteps).toBe(4);
		expect(state.goals).toEqual([]);
		expect(state.isLoading).toBe(true);
	});

	it('should set completed', () => {
		onboardingStore.setCompleted(true);
		expect(get(isOnboardingCompleted)).toBe(true);
	});

	it('should set loading', () => {
		onboardingStore.setLoading(false);
		expect(get(isOnboardingLoading)).toBe(false);
	});

	it('should set step', () => {
		onboardingStore.setStep(3);
		expect(get(currentStep)).toBe(3);
	});

	it('should advance to next step', () => {
		expect(get(currentStep)).toBe(1);
		onboardingStore.nextStep();
		expect(get(currentStep)).toBe(2);
	});

	it('should not exceed total steps', () => {
		onboardingStore.setStep(4);
		onboardingStore.nextStep();
		expect(get(currentStep)).toBe(4);
	});

	it('should go back to previous step', () => {
		onboardingStore.setStep(3);
		onboardingStore.previousStep();
		expect(get(currentStep)).toBe(2);
	});

	it('should not go below step 1', () => {
		onboardingStore.previousStep();
		expect(get(currentStep)).toBe(1);
	});

	it('should toggle goal on', () => {
		onboardingStore.toggleGoal('emergency_fund');
		expect(get(selectedGoals)).toContain('emergency_fund');
	});

	it('should toggle goal off', () => {
		onboardingStore.toggleGoal('emergency_fund');
		onboardingStore.toggleGoal('emergency_fund');
		expect(get(selectedGoals)).not.toContain('emergency_fund');
	});

	it('should support multiple goals', () => {
		onboardingStore.toggleGoal('emergency_fund');
		onboardingStore.toggleGoal('track_spending');
		onboardingStore.toggleGoal('debt_payoff');
		const goals = get(selectedGoals);
		expect(goals).toContain('emergency_fund');
		expect(goals).toContain('track_spending');
		expect(goals).toContain('debt_payoff');
		expect(goals.length).toBe(3);
	});

	it('should set goals directly', () => {
		onboardingStore.setGoals(['a', 'b']);
		expect(get(selectedGoals)).toEqual(['a', 'b']);
	});

	it('should reset to initial state', () => {
		onboardingStore.setCompleted(true);
		onboardingStore.setStep(3);
		onboardingStore.toggleGoal('test');
		onboardingStore.reset();

		const state = get(onboardingStore);
		expect(state.isCompleted).toBe(false);
		expect(state.currentStep).toBe(1);
		expect(state.goals).toEqual([]);
	});

	it('should expose totalSteps derived store', () => {
		expect(get(totalSteps)).toBe(4);
	});
});
