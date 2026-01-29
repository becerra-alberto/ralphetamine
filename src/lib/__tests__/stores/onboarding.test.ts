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

	it('should set monthly income', () => {
		onboardingStore.setMonthlyIncome(350000);
		const state = get(onboardingStore);
		expect(state.monthlyIncomeCents).toBe(350000);
	});

	it('should add account', () => {
		onboardingStore.addAccount({ name: 'Checking', type: 'checking', balanceCents: 100000 });
		const state = get(onboardingStore);
		expect(state.accounts).toHaveLength(1);
		expect(state.accounts[0].name).toBe('Checking');
	});

	it('should add multiple accounts', () => {
		onboardingStore.addAccount({ name: 'Checking', type: 'checking', balanceCents: 100000 });
		onboardingStore.addAccount({ name: 'Savings', type: 'savings', balanceCents: 500000 });
		const state = get(onboardingStore);
		expect(state.accounts).toHaveLength(2);
	});

	it('should toggle category disabled', () => {
		onboardingStore.toggleCategory('cat-housing-vve');
		const state = get(onboardingStore);
		expect(state.disabledCategories).toContain('cat-housing-vve');
	});

	it('should toggle category back on', () => {
		onboardingStore.toggleCategory('cat-housing-vve');
		onboardingStore.toggleCategory('cat-housing-vve');
		const state = get(onboardingStore);
		expect(state.disabledCategories).not.toContain('cat-housing-vve');
	});

	it('should set disabled categories directly', () => {
		onboardingStore.setDisabledCategories(['a', 'b']);
		const state = get(onboardingStore);
		expect(state.disabledCategories).toEqual(['a', 'b']);
	});

	it('should reset new state properties', () => {
		onboardingStore.setMonthlyIncome(500000);
		onboardingStore.addAccount({ name: 'Test', type: 'checking', balanceCents: 1000 });
		onboardingStore.toggleCategory('cat-x');
		onboardingStore.reset();

		const state = get(onboardingStore);
		expect(state.monthlyIncomeCents).toBe(0);
		expect(state.accounts).toEqual([]);
		expect(state.disabledCategories).toEqual([]);
	});
});
