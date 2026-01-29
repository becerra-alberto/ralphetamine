<script lang="ts">
	import { createEventDispatcher } from 'svelte';

	export let disabledCategories: string[] = [];
	export let testId = 'step4-categories';

	const dispatch = createEventDispatcher<{
		toggleCategory: { categoryId: string };
		finish: void;
		back: void;
	}>();

	interface CategoryItem {
		id: string;
		name: string;
	}

	interface CategorySection {
		id: string;
		label: string;
		items: CategoryItem[];
	}

	const SECTIONS: CategorySection[] = [
		{
			id: 'housing',
			label: 'Housing',
			items: [
				{ id: 'cat-housing-rent', name: 'Rent/Mortgage' },
				{ id: 'cat-housing-vve', name: 'VVE Fees' },
				{ id: 'cat-housing-gas', name: 'Gas & Electricity' },
				{ id: 'cat-housing-water', name: 'Water' },
				{ id: 'cat-housing-insurance', name: 'Home Insurance' }
			]
		},
		{
			id: 'essential',
			label: 'Essential',
			items: [
				{ id: 'cat-essential-groceries', name: 'Groceries' },
				{ id: 'cat-essential-health', name: 'Health/Medical' },
				{ id: 'cat-essential-phone', name: 'Phone/Internet' },
				{ id: 'cat-essential-transport', name: 'Transportation' },
				{ id: 'cat-essential-insurance', name: 'Insurance' }
			]
		},
		{
			id: 'lifestyle',
			label: 'Lifestyle',
			items: [
				{ id: 'cat-lifestyle-entertainment', name: 'Entertainment' },
				{ id: 'cat-lifestyle-dining', name: 'Dining Out' },
				{ id: 'cat-lifestyle-subscriptions', name: 'Subscriptions' },
				{ id: 'cat-lifestyle-shopping', name: 'Shopping' },
				{ id: 'cat-lifestyle-travel', name: 'Travel' }
			]
		},
		{
			id: 'savings',
			label: 'Savings',
			items: [
				{ id: 'cat-savings-emergency', name: 'Emergency Fund' },
				{ id: 'cat-savings-investments', name: 'Investments' },
				{ id: 'cat-savings-retirement', name: 'Retirement' },
				{ id: 'cat-savings-goals', name: 'Goals' }
			]
		}
	];

	function handleToggle(categoryId: string) {
		dispatch('toggleCategory', { categoryId });
	}

	function handleFinish() {
		dispatch('finish');
	}

	function handleBack() {
		dispatch('back');
	}

	function isEnabled(categoryId: string): boolean {
		return !disabledCategories.includes(categoryId);
	}
</script>

<div class="step4-categories" data-testid={testId}>
	<h2 class="step-title" data-testid="{testId}-title">Review your budget categories</h2>
	<p class="step-subtitle" data-testid="{testId}-subtitle">
		Toggle categories you don't need
	</p>

	<div class="sections" data-testid="{testId}-sections">
		{#each SECTIONS as section}
			<div class="section" data-testid="{testId}-section-{section.id}">
				<h3 class="section-label" data-testid="{testId}-section-{section.id}-label">
					{section.label}
				</h3>
				{#each section.items as item}
					<label
						class="category-item"
						class:disabled={!isEnabled(item.id)}
						data-testid="{testId}-category-{item.id}"
					>
						<span class="category-name">{item.name}</span>
						<input
							type="checkbox"
							checked={isEnabled(item.id)}
							on:change={() => handleToggle(item.id)}
							class="toggle"
							data-testid="{testId}-toggle-{item.id}"
						/>
					</label>
				{/each}
			</div>
		{/each}
	</div>

	<div class="step-actions">
		<button class="btn-back" on:click={handleBack} data-testid="{testId}-back">Back</button>
		<button class="btn-finish" on:click={handleFinish} data-testid="{testId}-finish">
			Finish
		</button>
	</div>
</div>

<style>
	.step4-categories {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 16px;
		width: 100%;
		max-width: 480px;
		margin: 0 auto;
	}

	.step-title {
		font-size: 1.5rem;
		font-weight: 700;
		color: var(--text-primary, #111827);
		text-align: center;
		margin: 0;
	}

	.step-subtitle {
		font-size: 0.875rem;
		color: var(--text-secondary, #6b7280);
		text-align: center;
		margin: 0 0 8px 0;
	}

	.sections {
		width: 100%;
		display: flex;
		flex-direction: column;
		gap: 16px;
		max-height: 350px;
		overflow-y: auto;
	}

	.section-label {
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--text-secondary, #6b7280);
		margin: 0 0 4px 0;
	}

	.category-item {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 8px 12px;
		border-radius: 6px;
		cursor: pointer;
		transition: opacity 0.15s ease;
	}

	.category-item.disabled {
		opacity: 0.5;
	}

	.category-name {
		font-size: 0.9375rem;
		color: var(--text-primary, #111827);
	}

	.toggle {
		width: 18px;
		height: 18px;
		accent-color: var(--accent, #4f46e5);
		cursor: pointer;
	}

	.step-actions {
		display: flex;
		gap: 12px;
		margin-top: 16px;
	}

	.btn-back {
		padding: 12px 32px;
		background: none;
		border: 2px solid var(--border-color, #e5e7eb);
		border-radius: 8px;
		font-size: 1rem;
		font-weight: 500;
		color: var(--text-secondary, #6b7280);
		cursor: pointer;
	}

	.btn-finish {
		padding: 12px 48px;
		background: var(--success, #10b981);
		color: white;
		border: none;
		border-radius: 8px;
		font-size: 1rem;
		font-weight: 600;
		cursor: pointer;
		transition: background 0.15s ease;
	}

	.btn-finish:hover {
		background: #059669;
	}

	:global(.dark) .step-title,
	:global(.dark) .category-name {
		color: var(--text-primary, #f9fafb);
	}

	:global(.dark) .section-label {
		color: #9ca3af;
	}

	:global(.dark) .btn-back {
		border-color: #2d2d2d;
		color: #9ca3af;
	}
</style>
