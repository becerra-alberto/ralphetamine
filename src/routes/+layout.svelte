<script lang="ts">
	import '../app.css';
	import AppShell from '$lib/components/AppShell.svelte';

	let { children } = $props();
</script>

<svelte:head>
	<title>Stackz</title>
</svelte:head>

<AppShell>
	{@render children()}
</AppShell>
