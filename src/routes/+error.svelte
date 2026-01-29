<script lang="ts">
	import { page } from '$app/stores';
</script>

<svelte:head>
	<title>Stackz - Page Not Found</title>
</svelte:head>

<div class="flex flex-col items-center justify-center min-h-[60vh] p-6" data-testid="error-page">
	<h1 class="text-4xl font-bold text-text-primary mb-4">Page not found</h1>
	<p class="text-text-secondary mb-6">
		The page you're looking for doesn't exist or has been moved.
	</p>
	<p class="text-text-secondary mb-8 text-sm">
		Error {$page.status}: {$page.error?.message || 'Unknown error'}
	</p>
	<a
		href="/"
		class="px-6 py-3 bg-accent text-white rounded-lg hover:bg-accent/90 transition-colors font-medium"
		data-testid="error-home-link"
	>
		Go to Home
	</a>
</div>
