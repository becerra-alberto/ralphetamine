/**
 * Onboarding store for managing wizard state
 */

import { writable, derived } from 'svelte/store';

export interface OnboardingAccount {
	name: string;
	type: string;
	balanceCents: number;
}

export interface OnboardingState {
	isCompleted: boolean;
	currentStep: number;
	totalSteps: number;
	goals: string[];
	monthlyIncomeCents: number;
	accounts: OnboardingAccount[];
	disabledCategories: string[];
	isLoading: boolean;
}

const initialState: OnboardingState = {
	isCompleted: false,
	currentStep: 1,
	totalSteps: 4,
	goals: [],
	monthlyIncomeCents: 0,
	accounts: [],
	disabledCategories: [],
	isLoading: true
};

function createOnboardingStore() {
	const { subscribe, set, update } = writable<OnboardingState>(initialState);

	return {
		subscribe,
		setCompleted(completed: boolean) {
			update((state) => ({ ...state, isCompleted: completed }));
		},
		setLoading(loading: boolean) {
			update((state) => ({ ...state, isLoading: loading }));
		},
		setStep(step: number) {
			update((state) => ({ ...state, currentStep: step }));
		},
		nextStep() {
			update((state) => ({
				...state,
				currentStep: Math.min(state.currentStep + 1, state.totalSteps)
			}));
		},
		previousStep() {
			update((state) => ({
				...state,
				currentStep: Math.max(state.currentStep - 1, 1)
			}));
		},
		toggleGoal(goalId: string) {
			update((state) => {
				const goals = state.goals.includes(goalId)
					? state.goals.filter((g) => g !== goalId)
					: [...state.goals, goalId];
				return { ...state, goals };
			});
		},
		setGoals(goals: string[]) {
			update((state) => ({ ...state, goals }));
		},
		setMonthlyIncome(cents: number) {
			update((state) => ({ ...state, monthlyIncomeCents: cents }));
		},
		addAccount(account: OnboardingAccount) {
			update((state) => ({ ...state, accounts: [...state.accounts, account] }));
		},
		toggleCategory(categoryId: string) {
			update((state) => {
				const disabled = state.disabledCategories.includes(categoryId)
					? state.disabledCategories.filter((c) => c !== categoryId)
					: [...state.disabledCategories, categoryId];
				return { ...state, disabledCategories: disabled };
			});
		},
		setDisabledCategories(ids: string[]) {
			update((state) => ({ ...state, disabledCategories: ids }));
		},
		reset() {
			set(initialState);
		}
	};
}

export const onboardingStore = createOnboardingStore();

export const currentStep = derived(onboardingStore, ($s) => $s.currentStep);
export const totalSteps = derived(onboardingStore, ($s) => $s.totalSteps);
export const selectedGoals = derived(onboardingStore, ($s) => $s.goals);
export const isOnboardingCompleted = derived(onboardingStore, ($s) => $s.isCompleted);
export const isOnboardingLoading = derived(onboardingStore, ($s) => $s.isLoading);
