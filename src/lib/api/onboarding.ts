/**
 * Onboarding API wrapper for Tauri backend communication
 */

import { invoke } from '@tauri-apps/api/core';

export interface OnboardingStatus {
	isCompleted: boolean;
	goals: string[];
}

export async function checkOnboardingStatus(): Promise<OnboardingStatus> {
	return invoke<OnboardingStatus>('check_onboarding_status');
}

export async function saveUserGoals(goals: string[]): Promise<void> {
	return invoke('save_user_goals', { goals });
}

export async function completeOnboarding(): Promise<void> {
	return invoke('complete_onboarding');
}
