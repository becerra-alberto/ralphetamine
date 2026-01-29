<script lang="ts">
	// Home page
</script>

<div class="p-6" data-testid="home-page">
	<h1 class="text-3xl font-bold text-text-primary mb-4">Welcome to Stackz</h1>
	<p class="text-text-secondary mb-6">Your local-first personal finance app</p>
	<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
		<a
			href="/budget"
			class="p-4 bg-bg-secondary rounded-lg hover:bg-accent/10 transition-colors"
		>
			<h2 class="text-lg font-semibold text-text-primary">Budget</h2>
			<p class="text-sm text-text-secondary">Manage your monthly budgets</p>
		</a>
		<a
			href="/transactions"
			class="p-4 bg-bg-secondary rounded-lg hover:bg-accent/10 transition-colors"
		>
			<h2 class="text-lg font-semibold text-text-primary">Transactions</h2>
			<p class="text-sm text-text-secondary">Track your spending</p>
		</a>
		<a
			href="/net-worth"
			class="p-4 bg-bg-secondary rounded-lg hover:bg-accent/10 transition-colors"
		>
			<h2 class="text-lg font-semibold text-text-primary">Net Worth</h2>
			<p class="text-sm text-text-secondary">Monitor your assets & liabilities</p>
		</a>
	</div>
</div>
