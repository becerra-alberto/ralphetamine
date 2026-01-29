/**
 * Budget status calculation utilities
 * 
 * Determines color coding status based on actual vs budget amounts.
 * All calculations use cents (integer) to avoid floating point errors.
 */

export type BudgetStatus = 'under' | 'over' | 'on-budget' | 'approaching' | 'none';

export interface BudgetStatusResult {
	status: BudgetStatus;
	percentUsed: number;
}

/**
 * Calculate budget status for expense categories
 * - under: actual < 90% of budget
 * - approaching: actual between 90-100% of budget
 * - on-budget: actual within 1% of budget
 * - over: actual > budget
 * - none: no budget set
 */
export function calculateExpenseStatus(actualCents: number, budgetCents: number): BudgetStatusResult {
	// No budget set
	if (budgetCents === 0) {
		return { status: 'none', percentUsed: 0 };
	}

	// For expenses, actual should be negative or 0
	const absActual = Math.abs(actualCents);
	const percentUsed = (absActual / budgetCents) * 100;

	// On budget: within 1% of budget (99-101%)
	if (percentUsed >= 99 && percentUsed <= 101) {
		return { status: 'on-budget', percentUsed };
	}

	// Over budget: actual > budget
	if (percentUsed > 100) {
		return { status: 'over', percentUsed };
	}

	// Approaching: between 90-100% of budget
	if (percentUsed >= 90) {
		return { status: 'approaching', percentUsed };
	}

	// Under budget: actual < 90% of budget
	return { status: 'under', percentUsed };
}

/**
 * Calculate budget status for income categories
 * Logic is inverted: higher actual is better
 * - under: actual < 90% of budget (bad - income shortfall)
 * - approaching: actual between 90-100% of budget
 * - on-budget: actual within 1% of budget
 * - over: actual >= budget (good - income received/exceeded)
 * - none: no budget set
 */
export function calculateIncomeStatus(actualCents: number, budgetCents: number): BudgetStatusResult {
	// No budget set
	if (budgetCents === 0) {
		return { status: 'none', percentUsed: 0 };
	}

	const percentAchieved = (actualCents / budgetCents) * 100;

	// On budget: within 1% of budget
	if (percentAchieved >= 99 && percentAchieved <= 101) {
		return { status: 'on-budget', percentUsed: percentAchieved };
	}

	// Over budget (good for income): actual >= 101% of budget
	if (percentAchieved > 101) {
		return { status: 'over', percentUsed: percentAchieved };
	}

	// Approaching: between 90-99% of budget
	if (percentAchieved >= 90) {
		return { status: 'approaching', percentUsed: percentAchieved };
	}

	// Under budget (bad for income): actual < 90% of budget
	return { status: 'under', percentUsed: percentAchieved };
}

/**
 * Get budget status based on category type
 */
export function getBudgetStatus(
	actualCents: number,
	budgetCents: number,
	categoryType: 'expense' | 'income' | 'transfer'
): BudgetStatusResult {
	if (categoryType === 'income') {
		return calculateIncomeStatus(actualCents, budgetCents);
	}
	// Treat transfers as expenses for status calculation
	return calculateExpenseStatus(actualCents, budgetCents);
}

/**
 * Get CSS class for budget status
 * Maps status to semantic CSS class names
 * Uses status-good/status-warning/status-danger for consistency with existing components
 */
export function getStatusClass(status: BudgetStatus, categoryType: 'expense' | 'income' | 'transfer'): string {
	if (status === 'none') {
		return '';
	}

	if (categoryType === 'income') {
		// For income, inverted logic:
		// over = success (green), under = danger (red)
		switch (status) {
			case 'over':
				return 'status-success';
			case 'under':
				return 'status-danger';
			case 'approaching':
				return 'status-warning';
			case 'on-budget':
				return 'status-neutral';
			default:
				return '';
		}
	}

	// For expenses:
	// under = success (green), over = danger (red)
	switch (status) {
		case 'under':
			return 'status-success';
		case 'over':
			return 'status-danger';
		case 'approaching':
			return 'status-warning';
		case 'on-budget':
			return 'status-neutral';
		default:
			return '';
	}
}

/**
 * Combined utility to get both status and CSS class
 */
export function getBudgetStatusWithClass(
	actualCents: number,
	budgetCents: number,
	categoryType: 'expense' | 'income' | 'transfer'
): BudgetStatusResult & { className: string } {
	const result = getBudgetStatus(actualCents, budgetCents, categoryType);
	return {
		...result,
		className: getStatusClass(result.status, categoryType)
	};
}
